import { clamp, round } from "@/lib/bac/utils";
import type {
  PlannedSessionFeatures,
  RetrievalPrediction,
  SessionSummary,
} from "@/lib/intoxication/types";
import { rankSimilarSessions } from "@/lib/intoxication/similarity";

export function predictBySessionRetrieval(params: {
  planned: PlannedSessionFeatures;
  history: SessionSummary[];
  topK?: number;
  distancePower?: number;
}): RetrievalPrediction | null {
  if (params.history.length === 0) return null;

  const neighbors = rankSimilarSessions({
    planned: params.planned,
    history: params.history,
    topK: params.topK ?? 2,
    distancePower: params.distancePower ?? 1.8,
  });
  if (neighbors.length === 0) return null;

  const totalWeight = neighbors.reduce((sum, n) => sum + n.weight, 0);
  if (totalWeight <= 0) return null;

  const weightedPeak =
    neighbors.reduce((sum, n) => sum + n.session.peak_intoxication_100 * n.weight, 0) / totalWeight;

  return {
    predicted_peak_intoxication_100: clamp(round(weightedPeak, 2), 0, 100),
    neighbors,
  };
}
