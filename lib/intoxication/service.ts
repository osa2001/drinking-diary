import { createServerClient } from "@/lib/supabase/server";
import { clamp } from "@/lib/bac/utils";
import type {
  DrinkLogEvent,
  PlannedSessionFeatures,
  PlannedDrinkInput,
  SessionSummary,
} from "@/lib/intoxication/types";
import {
  buildPlannedSessionFeatures,
  groupDrinkLogsIntoSessions,
  summarizeSessions,
} from "@/lib/intoxication/sessionize";
import {
  applyPaceNudge,
  blendPredictions,
  predictBaselinePeakIntoxication,
} from "@/lib/intoxication/baseline";
import { predictBySessionRetrieval } from "@/lib/intoxication/retrieval";

export async function buildHistoricalSessionSummaries(userId: string) {
  const supabase = await createServerClient();

  const { data: sessions } = await supabase
    .from("drinking_sessions")
    .select("id, intoxication_level")
    .eq("user_id", userId)
    .order("session_date", { ascending: false })
    .limit(300);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) return [] as SessionSummary[];

  const sessionPeakMap = new Map<string, number>();
  for (const session of sessions ?? []) {
    const peak = typeof session.intoxication_level === "number" ? session.intoxication_level : 0;
    sessionPeakMap.set(session.id, peak);
  }

  const { data: logs } = await supabase
    .from("drink_logs")
    .select(
      "id, session_id, consumed_at, drink_name, volume_ml, abv, amount, actual_intoxication, self_reported_intoxication_100"
    )
    .eq("user_id", userId)
    .in("session_id", sessionIds)
    .order("consumed_at", { ascending: true });

  const events = (logs ?? [])
    .map((log): DrinkLogEvent | null => {
      if (log.volume_ml == null || log.abv == null) return null;
      const logLevel =
        typeof log.self_reported_intoxication_100 === "number"
          ? Number(log.self_reported_intoxication_100)
          : typeof log.actual_intoxication === "number"
            ? modelLevelToPercent(log.actual_intoxication)
          : sessionPeakMap.get(log.session_id) ?? null;
      return {
        log_id: log.id,
        timestamp: log.consumed_at,
        drink_type: log.drink_name,
        volume_ml: Number(log.volume_ml),
        abv: Number(log.abv),
        amount: Number.isFinite(log.amount) && log.amount > 0 ? Number(log.amount) : 1,
        self_reported_intoxication_100: logLevel,
      } satisfies DrinkLogEvent;
    })
    .filter((e): e is DrinkLogEvent => e != null);

  const grouped = groupDrinkLogsIntoSessions(events);
  return summarizeSessions(grouped).filter((s) => s.peak_intoxication_100 > 0);
}

export function buildPlannedFeaturesFromInputs(params: {
  drinks: PlannedDrinkInput[];
  plannedDurationMinutes: number;
}) {
  const totalVolume = params.drinks.reduce((sum, d) => sum + d.amount * d.volume_ml, 0);
  const weightedAbvNumerator = params.drinks.reduce(
    (sum, d) => sum + d.amount * d.volume_ml * d.abv,
    0
  );
  const weightedAbv = totalVolume > 0 ? weightedAbvNumerator / totalVolume : 0;
  const drinkCount = params.drinks.reduce((sum, d) => sum + d.amount, 0);

  return buildPlannedSessionFeatures({
    plannedVolumeMl: totalVolume,
    plannedAbv: weightedAbv,
    plannedDurationMinutes: params.plannedDurationMinutes,
    plannedDrinkCount: drinkCount,
  }) satisfies PlannedSessionFeatures;
}

export async function predictPlannedPeakIntoxication(params: {
  userId: string;
  drinks: PlannedDrinkInput[];
  plannedDurationMinutes: number;
  profile: {
    gender: "male" | "female" | "non-binary" | "prefer-not-to-say" | null;
    weightKg: number | null;
    toleranceLevel?: string | null;
  };
}) {
  const planned = buildPlannedFeaturesFromInputs({
    drinks: params.drinks,
    plannedDurationMinutes: clamp(Math.round(params.plannedDurationMinutes), 1, 24 * 60),
  });

  const history = await buildHistoricalSessionSummaries(params.userId);
  const baselinePeak = predictBaselinePeakIntoxication({
    planned,
    profile: {
      gender: params.profile.gender,
      weightKg: params.profile.weightKg,
      toleranceLevel: params.profile.toleranceLevel,
    },
  });

  const retrieval = predictBySessionRetrieval({
    planned,
    history,
    topK: 2,
    distancePower: 1.8,
  });

  const blend = blendPredictions({
    baselinePeak,
    personalizedPeak: retrieval?.predicted_peak_intoxication_100 ?? null,
    historySessionCount: history.length,
  });
  const historyMedianPace = median(history.map((s) => s.drinking_pace_gph));
  const nudged = applyPaceNudge({
    blendedPeak100: blend.predicted_peak_intoxication_100,
    plannedPaceGph: planned.planned_drinking_pace_gph,
    historyMedianPaceGph: historyMedianPace,
    beta: 0.08,
    maxNudgeAbs: 12,
  });

  return {
    planned_features: planned,
    predicted_peak_intoxication_100: nudged.predicted_peak_intoxication_100,
    baseline_peak_intoxication_100: baselinePeak,
    personalized_peak_intoxication_100: retrieval?.predicted_peak_intoxication_100 ?? null,
    baseline_weight: blend.baseline_weight,
    personalized_weight: blend.personalized_weight,
    pace_nudge: nudged.pace_nudge,
    history_median_pace_gph: nudged.history_median_pace_gph,
    historical_session_count: history.length,
    similar_sessions: retrieval?.neighbors.map((n) => ({
      session_id: n.session.session_id,
      peak_intoxication_100: n.session.peak_intoxication_100,
      total_alcohol_grams: n.session.total_alcohol_grams,
      total_duration_minutes: n.session.total_duration_minutes,
      drinking_pace_gph: n.session.drinking_pace_gph,
      distance: n.distance,
      weight: n.weight,
    })) ?? [],
  };
}

function modelLevelToPercent(level: number) {
  const anchors = [0, 20, 40, 60, 100];
  const idx = clamp(Math.round(level), 0, anchors.length - 1);
  return anchors[idx] ?? 0;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}
