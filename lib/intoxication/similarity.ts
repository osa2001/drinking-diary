import { clamp, round } from "@/lib/bac/utils";
import type {
  PlannedSessionFeatures,
  SessionSummary,
  SimilarityNeighbor,
} from "@/lib/intoxication/types";

export type SimilarityWeights = {
  alcohol: number;
  duration: number;
  pace: number;
  drinkCount: number;
};

const DEFAULT_WEIGHTS: SimilarityWeights = {
  alcohol: 0.4, // strongest feature
  duration: 0.2,
  pace: 0.35,
  drinkCount: 0.05, // lowest importance
};

const EPSILON = 1e-6;

function normalizedDiff(a: number, b: number, floor = 1) {
  const scale = Math.max(floor, (Math.abs(a) + Math.abs(b)) / 2);
  return Math.abs(a - b) / scale;
}

export function computeSessionDistance(
  planned: PlannedSessionFeatures,
  historical: SessionSummary,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
) {
  const breakdown = computeSessionDistanceBreakdown(planned, historical, weights);
  return round(breakdown.total_distance, 6);
}

export function computeSessionDistanceBreakdown(
  planned: PlannedSessionFeatures,
  historical: SessionSummary,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
) {
  const alcoholDiff = normalizedDiff(
    planned.planned_total_alcohol_grams,
    historical.total_alcohol_grams,
    10
  );
  const durationDiff = normalizedDiff(
    planned.planned_duration_minutes,
    historical.total_duration_minutes,
    30
  );
  const paceDiff = normalizedDiff(
    planned.planned_drinking_pace_gph,
    historical.drinking_pace_gph,
    5
  );
  const countDiff = normalizedDiff(planned.planned_drink_count, historical.drink_count, 1);

  const alcoholContribution = weights.alcohol * alcoholDiff;
  const durationContribution = weights.duration * durationDiff;
  const paceContribution = weights.pace * paceDiff;
  const drinkCountContribution = weights.drinkCount * countDiff;
  const totalDistance =
    alcoholContribution + durationContribution + paceContribution + drinkCountContribution;

  return {
    total_distance: round(totalDistance, 6),
    alcohol_contribution: round(alcoholContribution, 6),
    duration_contribution: round(durationContribution, 6),
    pace_contribution: round(paceContribution, 6),
    drink_count_contribution: round(drinkCountContribution, 6),
  };
}

export function rankSimilarSessions(params: {
  planned: PlannedSessionFeatures;
  history: SessionSummary[];
  topK?: number;
  weights?: SimilarityWeights;
  distancePower?: number;
}) {
  const k = clamp(Math.round(params.topK ?? 5), 1, 20);
  const power = params.distancePower ?? 1.8;
  const ranked = params.history
    .map((session) => {
      const distance = computeSessionDistance(params.planned, session, params.weights);
      const weight = 1 / Math.pow(distance + EPSILON, power);
      return {
        session,
        distance,
        weight: round(weight, 6),
      } satisfies SimilarityNeighbor;
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);

  return ranked;
}
