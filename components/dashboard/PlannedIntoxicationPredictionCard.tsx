"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DrinkSearchInput } from "@/components/diary/DrinkSearchInput";

type PlannedPredictionResponse = {
  predicted_peak_intoxication_100: number;
  predicted_peak_band: "minimal" | "light buzz" | "moderate" | "strong" | "very strong";
  baseline_peak_intoxication_100: number;
  personalized_peak_intoxication_100: number | null;
  baseline_weight: number;
  personalized_weight: number;
  historical_session_count: number;
  planned_features: {
    planned_total_alcohol_grams: number;
    planned_duration_minutes: number;
    planned_drink_count: number;
    planned_drinking_pace_gph: number;
  };
  similar_sessions: Array<{
    session_id: string;
    peak_intoxication_100: number;
    distance: number;
  }>;
  error?: string;
};

type PlannedDrink = {
  id: string;
  drink_name: string;
  amount: number;
  volume_ml: number;
  abv: number;
  note?: string;
};

export function PlannedIntoxicationPredictionCard() {
  const [plannedDrinks, setPlannedDrinks] = useState<PlannedDrink[]>([]);
  const [drinkName, setDrinkName] = useState("");
  const [volumeMl, setVolumeMl] = useState("330");
  const [abv, setAbv] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("1");
  const [plannedDurationHours, setPlannedDurationHours] = useState(3);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PlannedPredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);

  useEffect(() => {
    if (plannedDrinks.length === 0) {
      setResult(null);
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      void onPredict(plannedDrinks, plannedDurationHours);
    }, 250);
    return () => clearTimeout(timer);
  }, [plannedDrinks, plannedDurationHours]);

  async function onPredict(drinks: PlannedDrink[], durationHours: number) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/intoxication/planned-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planned_drinks: drinks.map((d) => ({
            drink_name: d.drink_name,
            amount: d.amount,
            volume_ml: d.volume_ml,
            abv: d.abv,
          })),
          planned_duration_minutes: Math.round(durationHours * 60),
          evaluation_minutes: Math.round(durationHours * 60),
        }),
      });
      const json = (await response.json()) as PlannedPredictionResponse;
      if (!response.ok) {
        throw new Error(json.error ?? "Could not predict planned intoxication");
      }
      setResult(json);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Could not predict planned intoxication");
    } finally {
      setPending(false);
    }
  }

  function onAddPlannedDrink() {
    setEntryError(null);

    const parsedAmount = Number(amount);
    const parsedVolume = Number(volumeMl);
    const parsedAbv = Number(abv);
    if (!drinkName.trim()) return setEntryError("Drink name is required");
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1 || parsedAmount > 30) {
      return setEntryError("Amount must be between 1 and 30");
    }
    if (!Number.isFinite(parsedVolume) || parsedVolume < 1 || parsedVolume > 2000) {
      return setEntryError("Volume must be between 1 and 2000 ml");
    }
    if (!Number.isFinite(parsedAbv) || parsedAbv <= 0 || parsedAbv > 100) {
      return setEntryError("ABV must be between 0.1 and 100");
    }

    setPlannedDrinks((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        drink_name: drinkName.trim(),
        amount: Math.round(parsedAmount),
        volume_ml: Math.round(parsedVolume),
        abv: parsedAbv,
        note: note.trim() || undefined,
      },
    ]);
    setDrinkName("");
    setVolumeMl("330");
    setAbv("");
    setNote("");
    setAmount("1");
  }

  function updateDrink(id: string, patch: Partial<PlannedDrink>) {
    setPlannedDrinks((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeDrink(id: string) {
    setPlannedDrinks((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <section className="mt-4 rounded-2xl border border-emerald-500/30 bg-slate-800/50 p-5 shadow-sm shadow-black/20">
      <h2 className="text-sm font-medium text-slate-100">Intoxication prediction</h2>
      <p className="mt-1 text-xs text-slate-400">
        Add planned drinks like drink logging. Prediction updates automatically.
      </p>

      <div className="mt-3 space-y-2">
        <DrinkSearchInput
          value={drinkName}
          onChange={setDrinkName}
          abvValue={abv}
          onAbvChange={setAbv}
          noteValue={note}
          onNoteChange={setNote}
          id="plannedDrinkName"
          required={false}
          placeholder="Search or type planned drink"
        />
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-slate-300">
            Amount
            <input
              type="number"
              min={1}
              max={30}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-300">
            Volume (ml)
            <input
              type="number"
              min={1}
              max={2000}
              value={volumeMl}
              onChange={(e) => setVolumeMl(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-300">
            ABV (%)
            <input
              type="number"
              min={0.1}
              max={100}
              step={0.1}
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onAddPlannedDrink}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
          >
            Add planned drink
          </button>
          {entryError ? <p className="text-xs text-rose-300">{entryError}</p> : null}
        </div>
      </div>

      {plannedDrinks.length > 0 ? (
        <div className="mt-3 space-y-2">
          {plannedDrinks.map((drink) => (
            <div
              key={drink.id}
              className="rounded-md border border-slate-700 bg-slate-900/40 p-2 text-xs text-slate-200"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium text-slate-100">{drink.drink_name}</p>
                <button
                  type="button"
                  onClick={() => removeDrink(drink.id)}
                  className="rounded border border-rose-400/40 px-2 py-0.5 text-[11px] text-rose-300 hover:bg-rose-500/10"
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={drink.amount}
                  onChange={(e) =>
                    updateDrink(drink.id, {
                      amount: clampInt(Number(e.target.value), 1, 30),
                    })
                  }
                  className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                />
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={drink.volume_ml}
                  onChange={(e) =>
                    updateDrink(drink.id, {
                      volume_ml: clampInt(Number(e.target.value), 1, 2000),
                    })
                  }
                  className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                />
                <input
                  type="number"
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={drink.abv}
                  onChange={(e) =>
                    updateDrink(drink.id, {
                      abv: clampFloat(Number(e.target.value), 0.1, 100),
                    })
                  }
                  className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">No planned drinks yet.</p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs text-slate-400">{pending ? "Predicting..." : "Auto prediction on"}</span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
            <span>Planned drinking duration</span>
            <span className="font-medium text-slate-100">{plannedDurationHours.toFixed(1)}h</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={24}
            step={0.5}
            value={plannedDurationHours}
            onChange={(e) => setPlannedDurationHours(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-emerald-500"
            aria-label="Planned drinking duration"
          />
        </div>
        <Link href="/profile/details" className="text-xs text-sky-300 hover:text-sky-200">
          Update profile
        </Link>
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <p className="text-xs text-slate-400">Predicted Peak Intoxication (0-100)</p>
          <p className="mt-1 text-base font-semibold text-slate-100">
            {Number(result.predicted_peak_intoxication_100).toFixed(1)}% -{" "}
            {result.predicted_peak_band}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Baseline: {Number(result.baseline_peak_intoxication_100).toFixed(1)}% | Personalized:{" "}
            {result.personalized_peak_intoxication_100 != null
              ? `${Number(result.personalized_peak_intoxication_100).toFixed(1)}%`
              : "N/A"}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Blend weights {"->"} baseline {Number(result.baseline_weight).toFixed(2)}, personalized{" "}
            {Number(result.personalized_weight).toFixed(2)} | History sessions:{" "}
            {result.historical_session_count}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Planned alcohol:{" "}
            {Number(result.planned_features.planned_total_alcohol_grams).toFixed(1)}g | Pace:{" "}
            {Number(result.planned_features.planned_drinking_pace_gph).toFixed(1)} g/h
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Similar sessions used: {result.similar_sessions.length}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.round(clamp(value, min, max));
}

function clampFloat(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return clamp(value, min, max);
}

