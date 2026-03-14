import { alcoholGramsFromDrink, clamp, round } from "@/lib/bac/utils";
import type {
  DrinkLogEvent,
  GroupedSession,
  PlannedSessionFeatures,
  SessionSummary,
} from "@/lib/intoxication/types";

const DEFAULT_GAP_MINUTES = 120;

export function toAlcoholGrams(volumeMl: number, abv: number, amount = 1) {
  return round(alcoholGramsFromDrink({ volumeMl, abv, amount }), 3);
}

export function buildPlannedSessionFeatures(params: {
  plannedVolumeMl: number;
  plannedAbv: number;
  plannedDurationMinutes: number;
  plannedDrinkCount?: number;
}) {
  const totalAlcoholGrams = toAlcoholGrams(
    params.plannedVolumeMl,
    params.plannedAbv,
    params.plannedDrinkCount ?? 1
  );
  const durationMinutes = clamp(Math.round(params.plannedDurationMinutes), 1, 24 * 60);
  const durationHours = Math.max(durationMinutes / 60, 1 / 60);

  return {
    planned_total_alcohol_grams: totalAlcoholGrams,
    planned_duration_minutes: durationMinutes,
    planned_drink_count: clamp(Math.round(params.plannedDrinkCount ?? 1), 1, 100),
    planned_drinking_pace_gph: round(totalAlcoholGrams / durationHours, 3),
  } satisfies PlannedSessionFeatures;
}

export function groupDrinkLogsIntoSessions(
  logs: DrinkLogEvent[],
  gapMinutes = DEFAULT_GAP_MINUTES
) {
  if (logs.length === 0) return [] as GroupedSession[];

  const sorted = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const sessions: GroupedSession[] = [];
  let currentLogs: DrinkLogEvent[] = [sorted[0]];
  let start = sorted[0].timestamp;

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const deltaMinutes =
      (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / (1000 * 60);

    if (deltaMinutes <= gapMinutes) {
      currentLogs.push(curr);
      continue;
    }

    const end = currentLogs[currentLogs.length - 1].timestamp;
    sessions.push({
      session_id: `session-${sessions.length + 1}`,
      started_at: start,
      ended_at: end,
      logs: currentLogs,
    });

    currentLogs = [curr];
    start = curr.timestamp;
  }

  const lastEnd = currentLogs[currentLogs.length - 1].timestamp;
  sessions.push({
    session_id: `session-${sessions.length + 1}`,
    started_at: start,
    ended_at: lastEnd,
    logs: currentLogs,
  });

  return sessions;
}

export function summarizeSession(grouped: GroupedSession): SessionSummary {
  const totalAlcoholGrams = grouped.logs.reduce(
    (sum, log) => sum + toAlcoholGrams(log.volume_ml, log.abv, log.amount),
    0
  );
  const durationMinutes = Math.max(
    1,
    Math.round(
      (new Date(grouped.ended_at).getTime() - new Date(grouped.started_at).getTime()) /
        (1000 * 60)
    )
  );
  const durationHours = Math.max(durationMinutes / 60, 1 / 60);
  const drinkCount = grouped.logs.reduce((sum, log) => sum + Math.max(1, log.amount || 1), 0);
  const peak = grouped.logs.reduce((max, log) => {
    const level =
      typeof log.self_reported_intoxication_100 === "number"
        ? log.self_reported_intoxication_100
        : 0;
    return level > max ? level : max;
  }, 0);

  return {
    session_id: grouped.session_id,
    total_alcohol_grams: round(totalAlcoholGrams, 3),
    total_duration_minutes: durationMinutes,
    drink_count: drinkCount,
    drinking_pace_gph: round(totalAlcoholGrams / durationHours, 3),
    peak_intoxication_100: clamp(round(peak, 2), 0, 100),
  };
}

export function summarizeSessions(groupedSessions: GroupedSession[]) {
  return groupedSessions.map(summarizeSession).filter((s) => s.total_alcohol_grams > 0);
}
