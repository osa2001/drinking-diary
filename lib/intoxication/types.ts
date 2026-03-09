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
