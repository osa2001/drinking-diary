import { clamp } from "@/lib/bac/utils";

export type IntoxicationBand =
  | "minimal"
  | "light buzz"
  | "moderate"
  | "strong"
  | "very strong";

export function getIntoxicationBandFrom100(score: number): IntoxicationBand {
  const value = clamp(Math.round(score), 0, 100);
  if (value <= 19) return "minimal";
  if (value <= 39) return "light buzz";
  if (value <= 59) return "moderate";
  if (value <= 79) return "strong";
  return "very strong";
}
