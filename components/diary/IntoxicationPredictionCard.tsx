"use client";

import { useEffect, useMemo, useState } from "react";

type PredictionResponse = {
  predicted_intoxication_level: number;
  predicted_score: number;
  features: {
    current_BAC: number;
    alcohol_grams: number;
    drink_count: number;
  };
  error?: string;
};

const LEVELS = ["Sober", "Tipsy", "Buzzed", "Drunk", "Wasted"];
const LEVEL_PERCENT_ANCHORS = [0, 20, 40, 60, 100];

export function IntoxicationPredictionCard({
  date,
  savedSliderPercent,
}: {
  date: string;
  savedSliderPercent: number;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [currentSliderPercent, setCurrentSliderPercent] = useState(savedSliderPercent);

  const levelLabel = useMemo(() => {
    if (!prediction) return "-";
    const index = clamp(prediction.predicted_intoxication_level, 0, 4);
    return LEVELS[index] ?? "Unknown";
  }, [prediction]);

  const predictedPercent = useMemo(() => {
    if (!prediction) return 0;
    const index = clamp(prediction.predicted_intoxication_level, 0, 4);
    return LEVEL_PERCENT_ANCHORS[index] ?? 0;
  }, [prediction]);

  const referenceLevel = useMemo(
    () => sliderPercentToModelLevel(currentSliderPercent),
    [currentSliderPercent]
  );

  useEffect(() => {
    setCurrentSliderPercent(savedSliderPercent);
  }, [savedSliderPercent]);

  useEffect(() => {
    let active = true;

    async function loadPrediction() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/intoxication/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date }),
        });
        const json = (await response.json()) as PredictionResponse;
        if (!response.ok) {
          throw new Error(json.error ?? "Could not load prediction");
        }
        if (active) {
          setPrediction(json);
        }
      } catch (err) {
        if (active) {
          setPrediction(null);
          setError(err instanceof Error ? err.message : "Could not load prediction");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPrediction();
    function onSaved(event: Event) {
      const customEvent = event as CustomEvent<{
        date?: string;
        intoxicationLevel?: number;
      }>;
      if (customEvent.detail?.date === date) {
        if (typeof customEvent.detail?.intoxicationLevel === "number") {
          setCurrentSliderPercent(customEvent.detail.intoxicationLevel);
        }
        void loadPrediction();
      }
    }

    window.addEventListener("intoxication-saved", onSaved);
    return () => {
      active = false;
      window.removeEventListener("intoxication-saved", onSaved);
    };
  }, [date]);

  return (
    <section className="mt-4 rounded-2xl border border-emerald-500/30 bg-slate-800/50 p-4 shadow-sm shadow-black/20">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-100">Intoxication Prediction</h2>
        {loading ? (
          <span className="text-xs text-slate-400">Loading...</span>
        ) : (
          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
            ML Live
          </span>
        )}
      </div>

      {error ? (
        <p className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      {!loading && prediction ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <p className="text-xs text-slate-400">Predicted Level</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {prediction.predicted_intoxication_level} - {levelLabel} (~{predictedPercent}%)
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Model score: {Number(prediction.predicted_score ?? 0).toFixed(3)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="BAC" value={Number(prediction.features?.current_BAC ?? 0).toFixed(4)} />
            <Metric
              label="Alcohol (g)"
              value={Number(prediction.features?.alcohol_grams ?? 0).toFixed(1)}
            />
            <Metric
              label="Drink count"
              value={String(Number(prediction.features?.drink_count ?? 0))}
            />
          </div>

          <div>
            <p className="text-xs text-slate-400">
              Training reference comes from your saved Intoxication slider value.
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Current reference: {Math.round(currentSliderPercent)}% ({referenceLevel} -{" "}
              {LEVELS[referenceLevel]}). Save the slider above to retrain and refresh.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900/30 px-2 py-2 text-center">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sliderPercentToModelLevel(percent: number) {
  const anchors = [0, 20, 40, 60, 100];
  let index = 0;
  let minDiff = Number.POSITIVE_INFINITY;
  for (let i = 0; i < anchors.length; i += 1) {
    const diff = Math.abs(percent - anchors[i]);
    if (diff <= minDiff) {
      minDiff = diff;
      index = i;
    }
  }
  return index;
}
