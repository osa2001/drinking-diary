"use client";

import { useState, useTransition } from "react";
import { saveDailyIntoxication } from "@/lib/actions/drinks";

type IntoxicationSliderProps = {
  date: string;
  initialValue: number;
};

export function IntoxicationSlider({ date, initialValue }: IntoxicationSliderProps) {
  const [value, setValue] = useState(initialValue);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave() {
    setMessage(null);
    const formData = new FormData();
    formData.set("date", date);
    formData.set("intoxicationLevel", String(value));

    startTransition(async () => {
      const result = await saveDailyIntoxication(formData);
      if (result?.error) {
        setMessage(result.error);
      } else {
        setMessage("Saved");
        window.dispatchEvent(
          new CustomEvent("intoxication-saved", {
            detail: { date, intoxicationLevel: value },
          })
        );
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-200">Intoxication Level</h2>
        <span className="text-sm font-semibold text-sky-300">{value}%</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-sky-500"
        aria-label="Intoxication level"
      />

      <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[11px] text-slate-500">
        <span>Sober<br />0%</span>
        <span>Tipsy<br />20%</span>
        <span>Buzzed<br />40%</span>
        <span>Drunk<br />60%</span>
        <span>Wasted<br />100%</span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save Intoxication"}
        </button>
        {message && <span className="text-xs text-slate-400">{message}</span>}
      </div>
    </div>
  );
}
