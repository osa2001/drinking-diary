export type BacGender = "male" | "female" | "non-binary" | "prefer-not-to-say" | null;

export type BacDrinkInput = {
  amount: number;
  volume_ml: number | null;
  abv: number | null;
  consumed_at: string;
};

export type BacPrediction = {
  bac: number;
  label: "Sober" | "Tipsy" | "Buzzed" | "Drunk" | "Wasted";
  referenceTime: Date;
  totalAlcoholGrams: number;
};

const ETHANOL_DENSITY_G_PER_ML = 0.789;
const BAC_ELIMINATION_PER_HOUR = 0.015;

export const WIDMARK_BETA_PER_HOUR = BAC_ELIMINATION_PER_HOUR;

export function calculateBacPrediction(params: {
  drinks: BacDrinkInput[];
  weightKg: number | null;
  gender: BacGender;
  referenceTime: Date;
}): BacPrediction | null {
  const { drinks, weightKg, gender, referenceTime } = params;
  if (weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0) return null;

  const r = getDistributionRatio(gender);
  let bac = 0;
  let totalAlcoholGrams = 0;

  for (const drink of drinks) {
    if (drink.volume_ml == null || drink.abv == null) continue;
    if (drink.volume_ml <= 0 || drink.abv <= 0) continue;

    const amount = Number.isFinite(drink.amount) && drink.amount > 0 ? drink.amount : 1;
    const alcoholGrams =
      amount * drink.volume_ml * (drink.abv / 100) * ETHANOL_DENSITY_G_PER_ML;
    totalAlcoholGrams += alcoholGrams;

    const rawBacContribution = (alcoholGrams / (weightKg * 1000 * r)) * 100;
    const consumedAt = new Date(drink.consumed_at);
    if (consumedAt.getTime() > referenceTime.getTime()) continue;
    const hoursElapsed = Math.max(
      0,
      (referenceTime.getTime() - consumedAt.getTime()) / (1000 * 60 * 60)
    );
    const metabolized = BAC_ELIMINATION_PER_HOUR * hoursElapsed;
    bac += Math.max(0, rawBacContribution - metabolized);
  }

  return {
    bac: roundTo(bac, 3),
    label: toBacLabel(bac),
    referenceTime,
    totalAlcoholGrams: roundTo(totalAlcoholGrams, 1),
  };
}

export function calculateWidmarkBacOverTime(params: {
  totalAlcoholGrams: number;
  weightKg: number | null;
  gender: BacGender;
  hoursSinceStart: number;
}): BacPrediction | null {
  const { totalAlcoholGrams, weightKg, gender, hoursSinceStart } = params;
  if (weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isFinite(totalAlcoholGrams) || totalAlcoholGrams < 0) return null;
  if (!Number.isFinite(hoursSinceStart) || hoursSinceStart < 0) return null;

  const r = getDistributionRatio(gender);
  const rawBac = (totalAlcoholGrams / (weightKg * 1000 * r)) * 100;
  const bac = Math.max(0, rawBac - WIDMARK_BETA_PER_HOUR * hoursSinceStart);

  return {
    bac: roundTo(bac, 3),
    label: toBacLabel(bac),
    referenceTime: new Date(),
    totalAlcoholGrams: roundTo(totalAlcoholGrams, 1),
  };
}

export function getTotalAlcoholGrams(drinks: BacDrinkInput[]) {
  let total = 0;
  for (const drink of drinks) {
    if (drink.volume_ml == null || drink.abv == null) continue;
    if (drink.volume_ml <= 0 || drink.abv <= 0) continue;
    const amount = Number.isFinite(drink.amount) && drink.amount > 0 ? drink.amount : 1;
    total += amount * drink.volume_ml * (drink.abv / 100) * ETHANOL_DENSITY_G_PER_ML;
  }
  return roundTo(total, 1);
}

export function getSessionStartTime(drinks: BacDrinkInput[], fallbackDate?: string) {
  if (drinks.length === 0) {
    return fallbackDate ? new Date(`${fallbackDate}T18:00:00`) : new Date();
  }

  const earliest = drinks
    .map((d) => new Date(d.consumed_at).getTime())
    .reduce((min, ts) => (ts < min ? ts : min), Number.POSITIVE_INFINITY);
  return new Date(earliest);
}

export function getDefaultReferenceTime(date: string, drinks: BacDrinkInput[]) {
  const today = new Date().toISOString().slice(0, 10);
  if (date === today) return new Date();

  if (drinks.length === 0) {
    return new Date(`${date}T23:59:59`);
  }

  const latest = drinks
    .map((d) => new Date(d.consumed_at).getTime())
    .reduce((max, ts) => (ts > max ? ts : max), 0);
  return new Date(latest);
}

function getDistributionRatio(gender: BacGender) {
  if (gender === "male") return 0.68;
  if (gender === "female") return 0.55;
  return 0.61;
}

function toBacLabel(bac: number): BacPrediction["label"] {
  if (bac < 0.02) return "Sober";
  if (bac < 0.05) return "Tipsy";
  if (bac < 0.08) return "Buzzed";
  if (bac < 0.15) return "Drunk";
  return "Wasted";
}

function roundTo(value: number, decimals: number) {
  const p = Math.pow(10, decimals);
  return Math.round(value * p) / p;
}
