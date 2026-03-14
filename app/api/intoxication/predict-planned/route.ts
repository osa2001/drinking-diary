import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { predictPlannedPeakIntoxication } from "@/lib/intoxication/service";
import type { PlannedDrinkInput } from "@/lib/intoxication/types";
import { getIntoxicationBandFrom100 } from "@/lib/intoxication/bands";

type PlannedPredictBody = {
  planned_drinks?: PlannedDrinkInput[];
  planned_volume_ml?: number;
  planned_abv?: number;
  planned_duration_minutes?: number;
  planned_drink_count?: number;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PlannedPredictBody;
  const plannedDrinks = normalizePlannedDrinks(body);
  if (plannedDrinks.length === 0) {
    return NextResponse.json(
      { error: "At least one planned drink with volume and ABV is required" },
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("weight_kg, gender, tolerance_level")
    .eq("id", user.id)
    .maybeSingle();

  const weightKg = profile?.weight_kg != null ? Number(profile.weight_kg) : null;
  const plannedDurationMinutes = clampInt(toNumber(body.planned_duration_minutes, 180), 1, 24 * 60);

  const prediction = await predictPlannedPeakIntoxication({
    userId: user.id,
    drinks: plannedDrinks,
    plannedDurationMinutes,
    profile: {
      weightKg,
      gender: (profile?.gender as "male" | "female" | "non-binary" | "prefer-not-to-say" | null) ?? null,
      toleranceLevel: profile?.tolerance_level ?? null,
    },
  });

  return NextResponse.json({
    predicted_peak_intoxication_100: prediction.predicted_peak_intoxication_100,
    predicted_peak_band: getIntoxicationBandFrom100(
      prediction.predicted_peak_intoxication_100
    ),
    baseline_peak_intoxication_100: prediction.baseline_peak_intoxication_100,
    personalized_peak_intoxication_100: prediction.personalized_peak_intoxication_100,
    baseline_weight: prediction.baseline_weight,
    personalized_weight: prediction.personalized_weight,
    historical_session_count: prediction.historical_session_count,
    planned_features: prediction.planned_features,
    similar_sessions: prediction.similar_sessions,
  });
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizePlannedDrinks(body: PlannedPredictBody) {
  if (Array.isArray(body.planned_drinks) && body.planned_drinks.length > 0) {
    return body.planned_drinks
      .map((d) => ({
        drink_name: typeof d.drink_name === "string" ? d.drink_name : "Planned drink",
        amount: clampInt(toNumber(d.amount, 1), 1, 30),
        volume_ml: toNumber(d.volume_ml, 0),
        abv: toNumber(d.abv, 0),
      }))
      .filter((d) => d.volume_ml > 0 && d.volume_ml <= 2000 && d.abv > 0 && d.abv <= 100);
  }

  // Backward-compatible single-item input.
  const volume = toNumber(body.planned_volume_ml, 0);
  const abv = toNumber(body.planned_abv, 0);
  if (volume > 0 && volume <= 2000 && abv > 0 && abv <= 100) {
    return [
      {
        drink_name: "Planned drink",
        amount: clampInt(toNumber(body.planned_drink_count, 1), 1, 30),
        volume_ml: volume,
        abv,
      },
    ];
  }
  return [];
}
