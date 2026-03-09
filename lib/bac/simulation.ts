import type { BacGender } from "@/lib/bac";
import type { BacSimulationResult, PlannedDrinkInput } from "@/lib/intoxication/types";
import {
  alcoholGramsFromDrink,
  BAC_ELIMINATION_PER_HOUR,
  clamp,
  getDistributionRatio,
  round,
} from "@/lib/bac/utils";

export function simulatePlannedBacOverTime(params: {
  drinks: PlannedDrinkInput[];
  plannedDurationMinutes: number;
  weightKg: number;
  gender: BacGender;
  stepMinutes?: number;
  horizonMinutes?: number;
}): BacSimulationResult {
  const stepMinutes = clamp(Math.round(params.stepMinutes ?? 5), 1, 30);
  const plannedDurationMinutes = clamp(Math.round(params.plannedDurationMinutes), 1, 24 * 60);

  const totalAlcoholGrams = params.drinks.reduce(
    (sum, d) =>
      sum +
      alcoholGramsFromDrink({
        amount: d.amount,
        volumeMl: d.volume_ml,
        abv: d.abv,
      }),
    0
  );
  const intakeRatePerMinute = totalAlcoholGrams / plannedDurationMinutes;
  const intakeRatePerHour = intakeRatePerMinute * 60;

  const r = getDistributionRatio(params.gender);
  const horizonMinutes = Math.max(
    plannedDurationMinutes + 12 * 60,
    params.horizonMinutes ?? plannedDurationMinutes + 8 * 60
  );

  let bac = 0;
  let consumed = 0;
  let peakBac = 0;
  let peakAtMinute = 0;
  let soberAtMinute: number | null = null;
  const curve: BacSimulationResult["curve"] = [];

  for (let minute = 0; minute <= horizonMinutes; minute += stepMinutes) {
    const intakeThisStep =
      minute < plannedDurationMinutes ? intakeRatePerMinute * stepMinutes : 0;
    consumed = Math.min(totalAlcoholGrams, consumed + intakeThisStep);

    const bacUp = ((intakeThisStep / (params.weightKg * 1000 * r)) * 100);
    const bacDown = BAC_ELIMINATION_PER_HOUR * (stepMinutes / 60);
    bac = Math.max(0, bac + bacUp - bacDown);

    if (bac > peakBac) {
      peakBac = bac;
      peakAtMinute = minute;
    }
    if (soberAtMinute == null && minute > plannedDurationMinutes && bac <= 0.001) {
      soberAtMinute = minute;
    }

    curve.push({
      minute,
      bac: round(bac, 5),
      alcohol_grams_consumed: round(consumed, 3),
      intake_rate_g_per_hour: round(intakeRatePerHour, 3),
    });

    if (soberAtMinute != null && minute > peakAtMinute + 60) {
      break;
    }
  }

  return {
    curve,
    peak_bac: round(peakBac, 5),
    peak_at_minute: peakAtMinute,
    sober_at_minute: soberAtMinute,
    total_alcohol_grams: round(totalAlcoholGrams, 3),
  };
}
