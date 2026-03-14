import type { BacGender } from "@/lib/bac";

export type PlannedDrinkInput = {
  drink_name: string;
  amount: number;
  volume_ml: number;
  abv: number;
};

export type BacCurvePoint = {
  minute: number;
  bac: number;
  alcohol_grams_consumed: number;
  intake_rate_g_per_hour: number;
};

export type BacSimulationResult = {
  curve: BacCurvePoint[];
  peak_bac: number;
  peak_at_minute: number;
  sober_at_minute: number | null;
  total_alcohol_grams: number;
};

export type IntoxicationFeaturesV2 = {
  alcohol_grams: number;
  current_BAC: number;
  time_since_first_drink: number;
  intake_rate_g_per_hour: number;
  drink_count: number;
  user_weight: number;
  gender: BacGender;
};

export type UserModelWeightsV2 = {
  w_bac: number;
  w_alcohol: number;
  w_time: number;
  w_drinks: number;
  bias: number;
};

// Raw drink log event used for sessionization in retrieval-based prediction.
export type DrinkLogEvent = {
  log_id: string;
  timestamp: string;
  drink_type: string;
  volume_ml: number;
  abv: number;
  amount: number;
  self_reported_intoxication_100?: number | null; // 0..100 subjective scale
};

// One grouped drinking session built from nearby log events.
export type GroupedSession = {
  session_id: string;
  started_at: string;
  ended_at: string;
  logs: DrinkLogEvent[];
};

// Aggregated session-level feature vector for similarity retrieval.
export type SessionSummary = {
  session_id: string;
  total_alcohol_grams: number;
  total_duration_minutes: number;
  drink_count: number;
  drinking_pace_gph: number;
  peak_intoxication_100: number; // 0..100
};

export type PlannedSessionFeatures = {
  planned_total_alcohol_grams: number;
  planned_duration_minutes: number;
  planned_drink_count: number;
  planned_drinking_pace_gph: number;
};

export type SimilarityNeighbor = {
  session: SessionSummary;
  distance: number;
  weight: number;
};

export type RetrievalPrediction = {
  predicted_peak_intoxication_100: number;
  neighbors: SimilarityNeighbor[];
};
