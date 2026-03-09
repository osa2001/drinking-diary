import type { BacGender } from "@/lib/bac";

export const ETHANOL_DENSITY_G_PER_ML = 0.789;
export const BAC_ELIMINATION_PER_HOUR = 0.015;

export function alcoholGramsFromDrink(params: {
  amount?: number;
  volumeMl: number;
  abv: number;
}) {
  const amount = Number.isFinite(params.amount) && (params.amount ?? 0) > 0 ? params.amount! : 1;
  if (!Number.isFinite(params.volumeMl) || params.volumeMl <= 0) return 0;
  if (!Number.isFinite(params.abv) || params.abv <= 0) return 0;
  return amount * params.volumeMl * (params.abv / 100) * ETHANOL_DENSITY_G_PER_ML;
}

export function getDistributionRatio(gender: BacGender) {
  if (gender === "male") return 0.68;
  if (gender === "female") return 0.55;
  return 0.61;
}

export function round(value: number, decimals: number) {
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
