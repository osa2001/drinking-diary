import { clamp, round } from "@/lib/bac/utils";
import type {
  BacSimulationResult,
  IntoxicationFeaturesV2,
  UserModelWeightsV2,
} from "@/lib/intoxication/types";

export const INTAKE_RATE_COEFFICIENT = 0.01;

export function computeIntoxicationScore(
  features: IntoxicationFeaturesV2,
  model: UserModelWeightsV2
) {
  const subjectivePaceBoost = INTAKE_RATE_COEFFICIENT * features.intake_rate_g_per_hour;
  return (
    model.w_bac * features.current_BAC +
    model.w_alcohol * features.alcohol_grams +
    model.w_time * features.time_since_first_drink +
    model.w_drinks * features.drink_count +
    model.bias +
    subjectivePaceBoost
  );
}

export function scoreToLevel(score: number) {
  return clamp(Math.round(score), 0, 4);
}

export function levelToPercent(level: number) {
  const anchors = [0, 20, 40, 60, 100];
  const index = clamp(Math.round(level), 0, anchors.length - 1);
  return anchors[index] ?? 0;
}

export function mapCurveToPredictions(params: {
  simulation: BacSimulationResult;
  model: UserModelWeightsV2;
  drinkCount: number;
  userWeight: number;
  gender: IntoxicationFeaturesV2["gender"];
}) {
  const series = params.simulation.curve.map((point) => {
    const features: IntoxicationFeaturesV2 = {
      alcohol_grams: point.alcohol_grams_consumed,
      current_BAC: point.bac,
      time_since_first_drink: round(point.minute / 60, 3),
      intake_rate_g_per_hour: point.intake_rate_g_per_hour,
      drink_count: params.drinkCount,
      user_weight: params.userWeight,
      gender: params.gender,
    };
    const score = computeIntoxicationScore(features, params.model);
    const level = scoreToLevel(score);
    return {
      minute: point.minute,
      features,
      predicted_score: round(score, 4),
      predicted_intoxication_level: level,
      predicted_percent: levelToPercent(level),
      bac: point.bac,
    };
  });

  const peakPrediction = series.reduce((max, row) =>
    row.predicted_score > max.predicted_score ? row : max
  );

  return {
    series,
    peakPrediction,
  };
}
