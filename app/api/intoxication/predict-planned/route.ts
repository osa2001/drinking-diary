import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { calculateWidmarkBacOverTime } from "@/lib/bac";
import {
  predictIntoxicationLevel,
  predictIntoxicationScore,
  type IntoxicationFeatures,
} from "@/lib/ml/intoxication";
import { getProfileForMl, loadUserModel } from "@/lib/ml/service";

type PlannedPredictBody = {
  planned_drinks?: Array<{
    drink_name?: string;
    amount?: number;
    volume_ml?: number;
    abv?: number;
  }>;
  planned_count?: number;
  planned_volume_ml?: number;
  planned_abv?: number;
  hours_since_first_drink?: number;
};

const ETHANOL_DENSITY_G_PER_ML = 0.789;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PlannedPredictBody;
  const plannedDrinks = normalizePlannedDrinks(body);
  const hoursSinceFirstDrink = toNumber(body.hours_since_first_drink, 0);

  if (plannedDrinks.length === 0) {
    return NextResponse.json({ error: "At least one planned drink is required" }, { status: 400 });
  }
  if (
    !Number.isFinite(hoursSinceFirstDrink) ||
    hoursSinceFirstDrink < 0 ||
    hoursSinceFirstDrink > 24
  ) {
    return NextResponse.json(
      { error: "hours_since_first_drink must be between 0 and 24" },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileForMl(user.id);
  if (profile.weightKg == null || !Number.isFinite(profile.weightKg) || profile.weightKg <= 0) {
    return NextResponse.json(
      { error: "Profile weight is required for prediction" },
      { status: 400 }
    );
  }

  const alcoholGrams = plannedDrinks.reduce(
    (sum, d) => sum + d.amount * d.volume_ml * (d.abv / 100) * ETHANOL_DENSITY_G_PER_ML,
    0
  );
  const totalDrinkCount = plannedDrinks.reduce((sum, d) => sum + d.amount, 0);
  const bacPrediction = calculateWidmarkBacOverTime({
    totalAlcoholGrams: alcoholGrams,
    weightKg: profile.weightKg,
    gender: profile.gender,
    hoursSinceStart: hoursSinceFirstDrink,
  });

  const features: IntoxicationFeatures = {
    alcohol_grams: round(alcoholGrams, 3),
    current_BAC: round(bacPrediction?.bac ?? 0, 4),
    time_since_first_drink: round(hoursSinceFirstDrink, 3),
    drink_count: Math.round(totalDrinkCount),
    user_weight: profile.weightKg,
    gender: profile.gender,
  };

  const model = await loadUserModel(user.id);
  const predictedScore = predictIntoxicationScore(features, model);
  const predictedLevel = predictIntoxicationLevel(features, model);

  return NextResponse.json({
    predicted_intoxication_level: predictedLevel,
    predicted_score: predictedScore,
    predicted_percent: levelToPercent(predictedLevel),
    features,
  });
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function round(value: number, decimals: number) {
  const p = Math.pow(10, decimals);
  return Math.round(value * p) / p;
}

function levelToPercent(level: number) {
  const anchors = [0, 20, 40, 60, 100];
  const index = Math.max(0, Math.min(4, Math.round(level)));
  return anchors[index] ?? 0;
}

function normalizePlannedDrinks(body: PlannedPredictBody) {
  if (Array.isArray(body.planned_drinks)) {
    const normalized = body.planned_drinks
      .map((d) => ({
        drink_name: typeof d.drink_name === "string" ? d.drink_name : "",
        amount: toNumber(d.amount, 1),
        volume_ml: toNumber(d.volume_ml, 0),
        abv: toNumber(d.abv, 0),
      }))
      .filter(
        (d) =>
          d.drink_name.trim().length > 0 &&
          Number.isFinite(d.amount) &&
          d.amount > 0 &&
          d.amount <= 30 &&
          Number.isFinite(d.volume_ml) &&
          d.volume_ml > 0 &&
          d.volume_ml <= 2000 &&
          Number.isFinite(d.abv) &&
          d.abv > 0 &&
          d.abv <= 100
      );
    if (normalized.length > 0) return normalized;
  }

  const plannedCount = toNumber(body.planned_count, 1);
  const plannedVolumeMl = toNumber(body.planned_volume_ml, 330);
  const plannedAbv = toNumber(body.planned_abv, 5);
  if (
    Number.isFinite(plannedCount) &&
    plannedCount > 0 &&
    plannedCount <= 30 &&
    Number.isFinite(plannedVolumeMl) &&
    plannedVolumeMl > 0 &&
    plannedVolumeMl <= 2000 &&
    Number.isFinite(plannedAbv) &&
    plannedAbv > 0 &&
    plannedAbv <= 100
  ) {
    return [
      {
        drink_name: "Planned drink",
        amount: plannedCount,
        volume_ml: plannedVolumeMl,
        abv: plannedAbv,
      },
    ];
  }

  return [];
}
