"use client";

import { useMemo, useState } from "react";
import {
  calculateWidmarkBacOverTime,
  type BacGender,
} from "@/lib/bac";

type BacDetailInteractiveProps = {
  totalAlcoholGrams: number;
  weightKg: number;
  gender: BacGender;
  maxHours: number;
  initialHours: number;
};

export function BacDetailInteractive({
  totalAlcoholGrams,
  weightKg,
  gender,
  maxHours,
  initialHours,
}: BacDetailInteractiveProps) {
  const [hours, setHours] = useState(initialHours);

  const prediction = useMemo(
    () =>
      calculateWidmarkBacOverTime({
        totalAlcoholGrams,
        weightKg,
        gender,
        hoursSinceStart: hours,
      }),
    [gender, hours, totalAlcoholGrams, weightKg]
  );

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4 shadow-sm shadow-black/20">
      <h2 className="text-sm font-medium text-slate-200">Time Since Drinking Began</h2>
      <p className="mt-1 text-xs text-slate-400">
        Move the slider to see estimated BAC at different times in the session.
      </p>

      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={maxHours}
          step={0.25}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-sky-500"
          aria-label="Time since drinking began"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>0h</span>
          <span>{maxHours.toFixed(1)}h</span>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
        <p className="text-sm text-slate-300">
          Selected time: <span className="font-medium">{hours.toFixed(2)}h</span>
        </p>
        {prediction ? (
          <>
            <p className="mt-3 text-xl font-semibold text-sky-300">
              BAC {prediction.bac.toFixed(3)}% ({prediction.label})
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Using Widmark formula with A={prediction.totalAlcoholGrams.toFixed(1)}g and
              beta=0.015/hour.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Unable to calculate BAC.</p>
        )}
      </div>
    </section>
  );
}
