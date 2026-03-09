import type {
  IntoxicationFeaturesV2,
  UserModelWeightsV2,
} from "@/lib/intoxication/types";
import { clamp } from "@/lib/bac/utils";
import { computeIntoxicationScore } from "@/lib/intoxication/predict";

export function sgdUpdateModelOnline(params: {
  model: UserModelWeightsV2;
  features: IntoxicationFeaturesV2;
  actualLevel: number;
  learningRate?: number;
}) {
  const target = clamp(Math.round(params.actualLevel), 0, 4);
  const lr = params.learningRate ?? 0.01;
  const predicted = computeIntoxicationScore(params.features, params.model);
  const error = predicted - target;

  return {
    w_bac: params.model.w_bac - lr * error * params.features.current_BAC,
    w_alcohol: params.model.w_alcohol - lr * error * params.features.alcohol_grams,
    w_time: params.model.w_time - lr * error * params.features.time_since_first_drink,
    w_drinks: params.model.w_drinks - lr * error * params.features.drink_count,
    bias: params.model.bias - lr * error,
  } satisfies UserModelWeightsV2;
}
