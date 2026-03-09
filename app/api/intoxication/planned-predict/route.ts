import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getProfileForMl, loadUserModel } from "@/lib/ml/service";
import { simulatePlannedBacOverTime } from "@/lib/bac/simulation";
import { clamp } from "@/lib/bac/utils";
import { levelToPercent, mapCurveToPredictions } from "@/lib/intoxication/predict";
import type { PlannedDrinkInput } from "@/lib/intoxication/types";

type PlannedPredictBody = {
  planned_drinks?: Array<{
    drink_name?: string;
    amount?: number;
    volume_ml?: number;
    abv?: number;
  }>;
  planned_duration_minutes?: number;
  evaluation_minutes?: number;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PlannedPredictBody;
  const plannedDrinks = normalizePlannedDrinks(body.planned_drinks);
  if (plannedDrinks.length === 0) {
    return NextResponse.json({ error: "At least one planned drink is required" }, { status: 400 });
  }

  const plannedDurationMinutes = clamp(
    Math.round(toNumber(body.planned_duration_minutes, 60)),
    1,
    24 * 60
  );
  const evaluationMinutes = clamp(
    Math.round(toNumber(body.evaluation_minutes, plannedDurationMinutes)),
    0,
    24 * 60
  );

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

  const simulation = simulatePlannedBacOverTime({
    drinks: plannedDrinks,
    plannedDurationMinutes,
    weightKg: profile.weightKg,
    gender: profile.gender,
  });

  const model = await loadUserModel(user.id);
  const mapped = mapCurveToPredictions({
    simulation,
    model,
    drinkCount: plannedDrinks.reduce((sum, d) => sum + d.amount, 0),
    userWeight: profile.weightKg,
    gender: profile.gender,
  });

  const currentRow =
    mapped.series.find((row) => row.minute >= evaluationMinutes) ??
    mapped.series[mapped.series.length - 1];
  const peakRow = mapped.peakPrediction;

  return NextResponse.json({
    planned_duration_minutes: plannedDurationMinutes,
    evaluation_minutes: evaluationMinutes,
    current_predicted_intoxication_level: currentRow.predicted_intoxication_level,
    current_predicted_percent: levelToPercent(currentRow.predicted_intoxication_level),
    current_predicted_score: currentRow.predicted_score,
    current_bac: currentRow.bac,
    peak_predicted_intoxication_level: peakRow.predicted_intoxication_level,
    peak_predicted_percent: levelToPercent(peakRow.predicted_intoxication_level),
    peak_predicted_score: peakRow.predicted_score,
    peak_predicted_at_minute: peakRow.minute,
    peak_bac: simulation.peak_bac,
    peak_bac_at_minute: simulation.peak_at_minute,
    sober_at_minute: simulation.sober_at_minute,
    total_alcohol_grams: simulation.total_alcohol_grams,
    curve: mapped.series.map((row) => ({
      minute: row.minute,
      bac: row.bac,
      predicted_score: row.predicted_score,
      predicted_intoxication_level: row.predicted_intoxication_level,
      predicted_percent: row.predicted_percent,
    })),
    features: currentRow.features,
  });
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizePlannedDrinks(
  raw: PlannedPredictBody["planned_drinks"]
): PlannedDrinkInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      drink_name: typeof item.drink_name === "string" ? item.drink_name.trim() : "",
      amount: toNumber(item.amount, 1),
      volume_ml: toNumber(item.volume_ml, 0),
      abv: toNumber(item.abv, 0),
    }))
    .filter(
      (d) =>
        d.drink_name.length > 0 &&
        d.amount > 0 &&
        d.amount <= 30 &&
        d.volume_ml > 0 &&
        d.volume_ml <= 2000 &&
        d.abv > 0 &&
        d.abv <= 100
    );
}
