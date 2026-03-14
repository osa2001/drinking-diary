import { clamp, round } from "@/lib/bac/utils";
import type { BacGender } from "@/lib/bac";
import type { PlannedSessionFeatures } from "@/lib/intoxication/types";

export type BaselineProfile = {
  gender: BacGender;
  weightKg: number | null;
  toleranceLevel?: string | null;
};

// Lightweight cold-start estimator for subjective peak intoxication (0..100).
export function predictBaselinePeakIntoxication(params: {
  planned: PlannedSessionFeatures;
  profile: BaselineProfile;
}) {
  const weightKg = params.profile.weightKg && params.profile.weightKg > 0 ? params.profile.weightKg : 70;
  const gramsPerKg = params.planned.planned_total_alcohol_grams / weightKg;
  const pace = params.planned.planned_drinking_pace_gph;

  const genderAdjustment = params.profile.gender === "female" ? 6 : params.profile.gender === "male" ? 0 : 3;
  const tolerance = (params.profile.toleranceLevel ?? "").toLowerCase();
  const toleranceAdjustment =
    tolerance.includes("low") ? 10 : tolerance.includes("high") ? -10 : 0;

  // Lightweight baseline tuned to avoid over-centering around mid values.
  const score = 5 + gramsPerKg * 40 + pace * 0.3 + genderAdjustment + toleranceAdjustment;
  return clamp(round(score, 2), 0, 100);
}

export function getPersonalizationWeight(sessionCount: number) {
  if (sessionCount <= 0) return 0;
  if (sessionCount <= 2) return 0.3;
  if (sessionCount <= 5) return 0.65;
  return 0.85;
}

export function blendPredictions(params: {
  baselinePeak: number;
  personalizedPeak?: number | null;
  historySessionCount: number;
}) {
  const personalWeight =
    params.personalizedPeak == null ? 0 : getPersonalizationWeight(params.historySessionCount);
  const baselineWeight = 1 - personalWeight;
  let blended =
    baselineWeight * params.baselinePeak + personalWeight * (params.personalizedPeak ?? 0);

  // Simple spread calibration: slightly expand away from center
  // when we have enough history and personalized signal exists.
  if (params.personalizedPeak != null && params.historySessionCount >= 3) {
    const spreadFactor = params.historySessionCount >= 6 ? 1.2 : 1.1;
    blended = 50 + (blended - 50) * spreadFactor;
  }
  return {
    predicted_peak_intoxication_100: clamp(round(blended, 2), 0, 100),
    baseline_weight: round(baselineWeight, 3),
    personalized_weight: round(personalWeight, 3),
  };
}
