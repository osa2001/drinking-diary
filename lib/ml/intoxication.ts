import { calculateBacPrediction, type BacDrinkInput, type BacGender } from "@/lib/bac";

export type IntoxicationFeatures = {
  alcohol_grams: number;
  current_BAC: number;
  time_since_first_drink: number;
  drink_count: number;
  user_weight: number;
  gender: BacGender;
};

export type UserModelWeights = {
  w_bac: number;
  w_alcohol: number;
  w_time: number;
  w_drinks: number;
  bias: number;
};

export const DEFAULT_MODEL_WEIGHTS: UserModelWeights = {
  w_bac: 8.0,
  w_alcohol: 0.02,
  w_time: -0.12,
  w_drinks: 0.18,
  bias: 0,
};

const ETHANOL_DENSITY_G_PER_ML = 0.789;

export function computeFeaturesFromDrinkLogs(params: {
  drinks: BacDrinkInput[];
  weightKg: number;
  gender: BacGender;
  referenceTime: Date;
}): IntoxicationFeatures {
  const { drinks, weightKg, gender, referenceTime } = params;

  const included = drinks.filter(
    (d) => new Date(d.consumed_at).getTime() <= referenceTime.getTime()
  );

  const alcoholGrams = included.reduce((sum, d) => {
    if (d.volume_ml == null || d.abv == null || d.volume_ml <= 0 || d.abv <= 0) return sum;
    const amount = Number.isFinite(d.amount) && d.amount > 0 ? d.amount : 1;
    return sum + amount * d.volume_ml * (d.abv / 100) * ETHANOL_DENSITY_G_PER_ML;
  }, 0);

  const bacPrediction = calculateBacPrediction({
    drinks: included,
    weightKg,
    gender,
    referenceTime,
  });

  const earliestDrinkMs =
    included.length > 0
      ? included
          .map((d) => new Date(d.consumed_at).getTime())
          .reduce((min, ts) => (ts < min ? ts : min), Number.POSITIVE_INFINITY)
      : referenceTime.getTime();
  const timeSinceFirstDrink = Math.max(
    0,
    (referenceTime.getTime() - earliestDrinkMs) / (1000 * 60 * 60)
  );

  return {
    alcohol_grams: round(alcoholGrams, 3),
    current_BAC: round(bacPrediction?.bac ?? 0, 4),
    time_since_first_drink: round(timeSinceFirstDrink, 3),
    drink_count: included.length,
    user_weight: weightKg,
    gender,
  };
}

export function predictIntoxicationScore(
  features: IntoxicationFeatures,
  model: UserModelWeights
) {
  const score =
    model.w_bac * features.current_BAC +
    model.w_alcohol * features.alcohol_grams +
    model.w_time * features.time_since_first_drink +
    model.w_drinks * features.drink_count +
    model.bias;
  return score;
}

export function scoreToLevel(score: number) {
  return clamp(Math.round(score), 0, 4);
}

export function predictIntoxicationLevel(
  features: IntoxicationFeatures,
  model: UserModelWeights
) {
  return scoreToLevel(predictIntoxicationScore(features, model));
}

export function sgdUpdateModel(params: {
  model: UserModelWeights;
  features: IntoxicationFeatures;
  actualIntoxicationLevel: number;
  learningRate?: number;
}) {
  const { model, features, actualIntoxicationLevel } = params;
  const lr = params.learningRate ?? 0.01;
  const target = clamp(actualIntoxicationLevel, 0, 4);
  const pred = predictIntoxicationScore(features, model);
  const error = pred - target;

  // SGD step for squared loss: w := w - lr * error * x
  return {
    w_bac: model.w_bac - lr * error * features.current_BAC,
    w_alcohol: model.w_alcohol - lr * error * features.alcohol_grams,
    w_time: model.w_time - lr * error * features.time_since_first_drink,
    w_drinks: model.w_drinks - lr * error * features.drink_count,
    bias: model.bias - lr * error,
  } satisfies UserModelWeights;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number) {
  const p = Math.pow(10, decimals);
  return Math.round(value * p) / p;
}
