import type { PlannedSessionFeatures, SessionSummary } from "@/lib/intoxication/types";
import { predictBySessionRetrieval } from "@/lib/intoxication/retrieval";
import {
  blendPredictions,
  getPersonalizationWeight,
  predictBaselinePeakIntoxication,
} from "@/lib/intoxication/baseline";
import {
  computeSessionDistanceBreakdown,
  rankSimilarSessions,
} from "@/lib/intoxication/similarity";

type BacktestRow = {
  session_id: string;
  actual_peak: number;
  predicted_peak: number;
  rounded_prediction: number;
  abs_error: number;
};

type Metrics = {
  mae: number;
  within5: number;
  within10: number;
  within15: number;
};

const MOCK_PROFILE = {
  gender: "male" as const,
  weightKg: 74,
  toleranceLevel: "medium",
};

// Small mock dataset for MVP offline checks
const MOCK_SESSIONS: SessionSummary[] = [
  {
    session_id: "s1",
    total_alcohol_grams: 22.5,
    total_duration_minutes: 55,
    drink_count: 2,
    drinking_pace_gph: 24.55,
    peak_intoxication_100: 26,
  },
  {
    session_id: "s2",
    total_alcohol_grams: 34.0,
    total_duration_minutes: 80,
    drink_count: 3,
    drinking_pace_gph: 25.5,
    peak_intoxication_100: 38,
  },
  {
    session_id: "s3",
    total_alcohol_grams: 51.5,
    total_duration_minutes: 95,
    drink_count: 4,
    drinking_pace_gph: 32.53,
    peak_intoxication_100: 57,
  },
  {
    session_id: "s4",
    total_alcohol_grams: 62.8,
    total_duration_minutes: 120,
    drink_count: 5,
    drinking_pace_gph: 31.4,
    peak_intoxication_100: 63,
  },
  {
    session_id: "s5",
    total_alcohol_grams: 43.3,
    total_duration_minutes: 180,
    drink_count: 4,
    drinking_pace_gph: 14.43,
    peak_intoxication_100: 44,
  },
  {
    session_id: "s6",
    total_alcohol_grams: 78.0,
    total_duration_minutes: 140,
    drink_count: 6,
    drinking_pace_gph: 33.43,
    peak_intoxication_100: 76,
  },
];

function main() {
  const rows = leaveOneOutBacktest(MOCK_SESSIONS, 2);
  printRows(rows);
  printMetrics("K=2 (default)", rows);
  printCalibrationDiagnostics(rows);
  printKComparison(MOCK_SESSIONS, [1, 2, 3]);
  runScenarioSanityTests(MOCK_SESSIONS);
  runMonotonicScenarioChecks(MOCK_SESSIONS);
  runBlendSanityTests();
  runBaselineCenterednessCheck(MOCK_SESSIONS);
}

function leaveOneOutBacktest(sessions: SessionSummary[], k: number) {
  return sessions.map((target) => {
    const history = sessions.filter((s) => s.session_id !== target.session_id);
    const planned = toPlannedFeatures(target);
    const predicted = predictPeakWithBlend(planned, history, k);

    return {
      session_id: target.session_id,
      actual_peak: round(target.peak_intoxication_100, 2),
      predicted_peak: round(predicted, 2),
      rounded_prediction: Math.round(predicted),
      abs_error: round(Math.abs(predicted - target.peak_intoxication_100), 2),
    } satisfies BacktestRow;
  });
}

function predictPeakWithBlend(planned: PlannedSessionFeatures, history: SessionSummary[], k: number) {
  const baseline = predictBaselinePeakIntoxication({
    planned,
    profile: MOCK_PROFILE,
  });
  const retrieval = predictBySessionRetrieval({
    planned,
    history,
    topK: k,
  });
  return blendPredictions({
    baselinePeak: baseline,
    personalizedPeak: retrieval?.predicted_peak_intoxication_100 ?? null,
    historySessionCount: history.length,
  }).predicted_peak_intoxication_100;
}

function toPlannedFeatures(summary: SessionSummary): PlannedSessionFeatures {
  return {
    planned_total_alcohol_grams: summary.total_alcohol_grams,
    planned_duration_minutes: summary.total_duration_minutes,
    planned_drink_count: summary.drink_count,
    planned_drinking_pace_gph: summary.drinking_pace_gph,
  };
}

function printRows(rows: BacktestRow[]) {
  const tableRows = rows.map((r) => ({
    session_id: r.session_id,
    actual_peak_intoxication: r.actual_peak,
    predicted_peak_intoxication: r.predicted_peak,
    rounded_prediction: r.rounded_prediction,
    absolute_error: r.abs_error,
  }));
  console.log("\n=== Leave-One-Out Backtest ===");
  console.table(tableRows);
}

function computeMetrics(rows: BacktestRow[]): Metrics {
  const mae = rows.reduce((sum, r) => sum + r.abs_error, 0) / rows.length;
  const within5 = rows.filter((r) => r.abs_error <= 5).length / rows.length;
  const within10 = rows.filter((r) => r.abs_error <= 10).length / rows.length;
  const within15 = rows.filter((r) => r.abs_error <= 15).length / rows.length;
  return { mae, within5, within10, within15 };
}

function printMetrics(label: string, rows: BacktestRow[]) {
  const metrics = computeMetrics(rows);
  console.log(`=== Metrics (${label}) ===`);
  console.log(`MAE: ${metrics.mae.toFixed(2)}`);
  console.log(`Within-5 Accuracy: ${(metrics.within5 * 100).toFixed(1)}%`);
  console.log(`Within-10 Accuracy: ${(metrics.within10 * 100).toFixed(1)}%`);
  console.log(`Within-15 Accuracy: ${(metrics.within15 * 100).toFixed(1)}%`);
}

function printCalibrationDiagnostics(rows: BacktestRow[]) {
  const actualMin = Math.min(...rows.map((r) => r.actual_peak));
  const actualMax = Math.max(...rows.map((r) => r.actual_peak));
  const predictedMin = Math.min(...rows.map((r) => r.predicted_peak));
  const predictedMax = Math.max(...rows.map((r) => r.predicted_peak));
  const actualRange = actualMax - actualMin;
  const predictedRange = predictedMax - predictedMin;
  const rangeRatio = actualRange > 0 ? predictedRange / actualRange : 0;
  const overlyCentered = rangeRatio < 0.7;

  console.log("\n=== Calibration / Spread Diagnostics ===");
  console.log(`Actual min/max: ${actualMin.toFixed(2)} / ${actualMax.toFixed(2)}`);
  console.log(`Predicted min/max: ${predictedMin.toFixed(2)} / ${predictedMax.toFixed(2)}`);
  console.log(`Actual range: ${actualRange.toFixed(2)}`);
  console.log(`Predicted range: ${predictedRange.toFixed(2)}`);
  console.log(`Predicted/Actual range ratio: ${rangeRatio.toFixed(2)}`);
  console.log(`Overly centered: ${overlyCentered ? "YES" : "NO"}`);
}

function printKComparison(sessions: SessionSummary[], ks: number[]) {
  const rows = ks.map((k) => {
    const backtestRows = leaveOneOutBacktest(sessions, k);
    const metrics = computeMetrics(backtestRows);
    return {
      K: k,
      MAE: round(metrics.mae, 2),
      Within5: `${(metrics.within5 * 100).toFixed(1)}%`,
      Within10: `${(metrics.within10 * 100).toFixed(1)}%`,
      Within15: `${(metrics.within15 * 100).toFixed(1)}%`,
    };
  });
  console.log("\n=== K Comparison (Retrieval Top-K) ===");
  console.table(rows);
}

function runScenarioSanityTests(history: SessionSummary[]) {
  const scenarios: Array<{
    name: string;
    grams: number;
    durationMinutes: number;
    drinkCount: number;
  }> = [
    { name: "low alcohol + long duration", grams: 20, durationMinutes: 180, drinkCount: 2 },
    { name: "low alcohol + short duration", grams: 20, durationMinutes: 45, drinkCount: 2 },
    { name: "medium alcohol + long duration", grams: 45, durationMinutes: 180, drinkCount: 4 },
    { name: "medium alcohol + short duration", grams: 45, durationMinutes: 45, drinkCount: 4 },
    { name: "high alcohol + long duration", grams: 80, durationMinutes: 180, drinkCount: 6 },
    { name: "high alcohol + short duration", grams: 80, durationMinutes: 45, drinkCount: 6 },
  ];

  const rows = scenarios.map((s) => {
    const planned = buildPlannedFromScenario(s.grams, s.durationMinutes, s.drinkCount);
    const prediction = predictPeakWithBlend(planned, history, 2);
    const topNeighbor = rankSimilarSessions({
      planned,
      history,
      topK: 1,
      distancePower: 1.8,
    })[0];
    const contributions = topNeighbor
      ? computeSessionDistanceBreakdown(planned, topNeighbor.session)
      : null;
    return {
      scenario: s.name,
      grams: s.grams,
      duration_min: s.durationMinutes,
      pace_gph: round(planned.planned_drinking_pace_gph, 2),
      predicted_peak_100: round(prediction, 2),
      sim_alcohol: contributions ? contributions.alcohol_contribution : null,
      sim_duration: contributions ? contributions.duration_contribution : null,
      sim_pace: contributions ? contributions.pace_contribution : null,
      sim_count: contributions ? contributions.drink_count_contribution : null,
      sim_total: contributions ? contributions.total_distance : null,
    };
  });

  console.log("\n=== Scenario Sanity Tests ===");
  console.table(rows);
}

function runMonotonicScenarioChecks(history: SessionSummary[]) {
  const lowLong = predictPeakWithBlend(buildPlannedFromScenario(20, 180, 2), history, 2);
  const lowShort = predictPeakWithBlend(buildPlannedFromScenario(20, 45, 2), history, 2);
  const mediumLong = predictPeakWithBlend(buildPlannedFromScenario(45, 180, 4), history, 2);
  const mediumShort = predictPeakWithBlend(buildPlannedFromScenario(45, 45, 4), history, 2);
  const highLong = predictPeakWithBlend(buildPlannedFromScenario(80, 180, 6), history, 2);
  const highShort = predictPeakWithBlend(buildPlannedFromScenario(80, 45, 6), history, 2);

  console.log("\n=== Monotonic Scenario Checks ===");
  console.log(
    `Fixed grams=20: short(${lowShort.toFixed(2)}) >= long(${lowLong.toFixed(2)}) -> ${
      lowShort >= lowLong ? "PASS" : "FAIL"
    }`
  );
  console.log(
    `Fixed grams=45: short(${mediumShort.toFixed(2)}) >= long(${mediumLong.toFixed(2)}) -> ${
      mediumShort >= mediumLong ? "PASS" : "FAIL"
    }`
  );
  console.log(
    `Fixed grams=80: short(${highShort.toFixed(2)}) >= long(${highLong.toFixed(2)}) -> ${
      highShort >= highLong ? "PASS" : "FAIL"
    }`
  );
  console.log(
    `Fixed duration=45: high(${highShort.toFixed(2)}) >= medium(${mediumShort.toFixed(
      2
    )}) >= low(${lowShort.toFixed(2)}) -> ${
      highShort >= mediumShort && mediumShort >= lowShort ? "PASS" : "FAIL"
    }`
  );
  console.log(
    `Fixed duration=180: high(${highLong.toFixed(2)}) >= medium(${mediumLong.toFixed(
      2
    )}) >= low(${lowLong.toFixed(2)}) -> ${
      highLong >= mediumLong && mediumLong >= lowLong ? "PASS" : "FAIL"
    }`
  );
}

function runBlendSanityTests() {
  const samplePlanned: PlannedSessionFeatures = {
    planned_total_alcohol_grams: 46,
    planned_duration_minutes: 120,
    planned_drink_count: 4,
    planned_drinking_pace_gph: 23,
  };

  const baselineOnly = predictBaselinePeakIntoxication({
    planned: samplePlanned,
    profile: MOCK_PROFILE,
  });
  const noHistoryBlend = blendPredictions({
    baselinePeak: baselineOnly,
    personalizedPeak: null,
    historySessionCount: 0,
  });
  const lowHistoryBlend = blendPredictions({
    baselinePeak: baselineOnly,
    personalizedPeak: 58,
    historySessionCount: 2,
  });
  const mixedHistoryBlend = blendPredictions({
    baselinePeak: baselineOnly,
    personalizedPeak: 58,
    historySessionCount: 4,
  });
  const strongHistoryBlend = blendPredictions({
    baselinePeak: baselineOnly,
    personalizedPeak: 58,
    historySessionCount: 8,
  });

  console.log("\n=== Sanity Tests ===");
  console.log(
    `Cold start (0 sessions): predicted=${noHistoryBlend.predicted_peak_intoxication_100.toFixed(
      2
    )}, personalized_weight=${noHistoryBlend.personalized_weight}`
  );
  console.log(
    `Low history (2 sessions): predicted=${lowHistoryBlend.predicted_peak_intoxication_100.toFixed(
      2
    )}, personalized_weight=${lowHistoryBlend.personalized_weight}`
  );
  console.log(
    `Mixed history (4 sessions): predicted=${mixedHistoryBlend.predicted_peak_intoxication_100.toFixed(
      2
    )}, personalized_weight=${mixedHistoryBlend.personalized_weight}`
  );
  console.log(
    `Strong history (8 sessions): predicted=${strongHistoryBlend.predicted_peak_intoxication_100.toFixed(
      2
    )}, personalized_weight=${strongHistoryBlend.personalized_weight}`
  );
  console.log(
    `Weight schedule check: [0,2,4,8] -> [${getPersonalizationWeight(0)}, ${getPersonalizationWeight(
      2
    )}, ${getPersonalizationWeight(4)}, ${getPersonalizationWeight(8)}]`
  );
}

function runBaselineCenterednessCheck(sessions: SessionSummary[]) {
  const actuals = sessions.map((s) => s.peak_intoxication_100);
  const baselines = sessions.map((s) =>
    predictBaselinePeakIntoxication({
      planned: toPlannedFeatures(s),
      profile: MOCK_PROFILE,
    })
  );

  const actualRange = Math.max(...actuals) - Math.min(...actuals);
  const baselineRange = Math.max(...baselines) - Math.min(...baselines);
  const actualMean = mean(actuals);
  const baselineMean = mean(baselines);
  const actualStd = stddev(actuals, actualMean);
  const baselineStd = stddev(baselines, baselineMean);
  const centered =
    baselineRange < actualRange * 0.65 && baselineStd < actualStd * 0.75;

  console.log("\n=== Baseline Conservativeness Check ===");
  console.log(`Actual mean/std/range: ${actualMean.toFixed(2)} / ${actualStd.toFixed(2)} / ${actualRange.toFixed(2)}`);
  console.log(
    `Baseline mean/std/range: ${baselineMean.toFixed(2)} / ${baselineStd.toFixed(2)} / ${baselineRange.toFixed(
      2
    )}`
  );
  console.log(`Baseline too centered around middle: ${centered ? "LIKELY YES" : "NO"}`);
}

function buildPlannedFromScenario(
  totalAlcoholGrams: number,
  durationMinutes: number,
  drinkCount: number
): PlannedSessionFeatures {
  return {
    planned_total_alcohol_grams: totalAlcoholGrams,
    planned_duration_minutes: durationMinutes,
    planned_drink_count: drinkCount,
    planned_drinking_pace_gph: totalAlcoholGrams / (durationMinutes / 60),
  };
}

function mean(values: number[]) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values: number[], avg: number) {
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / Math.max(1, values.length);
  return Math.sqrt(variance);
}

function round(value: number, decimals: number) {
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
}

main();
