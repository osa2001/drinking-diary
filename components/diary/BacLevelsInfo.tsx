"use client";

import { useMemo, useState } from "react";

type BacLevelRow = {
  bac: string;
  condition: string;
  effect: string;
};

const BAC_LEVEL_ROWS: BacLevelRow[] = [
  {
    bac: "0.00%",
    condition: "Sober",
    effect: "Normal coordination and judgment",
  },
  {
    bac: "0.02%",
    condition: "Mild relaxation",
    effect: "Slight mood lift, light relaxation",
  },
  {
    bac: "0.05%",
    condition: "Light intoxication",
    effect: "Reduced inhibition, more talkative",
  },
  {
    bac: "0.08%",
    condition: "Legally intoxicated (in many countries)",
    effect: "Slower reaction time, impaired driving ability",
  },
  {
    bac: "0.10%",
    condition: "Clearly drunk",
    effect: "Reduced judgment, coordination problems",
  },
  {
    bac: "0.15%",
    condition: "Very drunk",
    effect: "Difficulty walking, poor balance",
  },
  {
    bac: "0.20%",
    condition: "Severe intoxication",
    effect: "Slurred speech, confusion",
  },
  {
    bac: "0.30%+",
    condition: "Dangerous / alcohol poisoning risk",
    effect: "Possible unconsciousness",
  },
];

export function BacLevelsInfo() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = useMemo(() => BAC_LEVEL_ROWS[selectedIndex], [selectedIndex]);

  return (
    <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/40 p-4 shadow-sm shadow-black/20">
      <h2 className="text-sm font-medium text-slate-200">Medical / Legal BAC Levels</h2>
      <p className="mt-1 text-xs text-slate-400">
        BAC = Blood Alcohol Concentration (the percentage of alcohol in the bloodstream).
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_1fr]">
        <div>
          <table className="w-full table-fixed text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="w-16 py-2 pr-3 font-medium">BAC</th>
                <th className="py-2 pr-3 font-medium">Condition</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {BAC_LEVEL_ROWS.map((row, idx) => {
                const active = idx === selectedIndex;
                return (
                  <tr key={row.bac} className="border-b border-slate-800 last:border-0">
                    <td className="py-2 pr-3 align-top">{row.bac}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(idx)}
                        className={`flex w-full items-start gap-2 rounded-md px-2 py-1 text-left transition ${
                          active
                            ? "bg-sky-500/15 text-sky-300"
                            : "text-slate-300 hover:bg-slate-700/50"
                        }`}
                      >
                        <span className="rounded-full border border-slate-500 px-1.5 text-[10px] text-slate-400">
                          i
                        </span>
                        <span className="min-w-0 whitespace-normal leading-4">{row.condition}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Typical Effect</p>
          <p className="mt-1 text-xs text-slate-400">{selected.bac}</p>
          <p className="mt-1 text-sm font-medium text-slate-200">{selected.condition}</p>
          <p className="mt-2 text-sm text-slate-300">{selected.effect}</p>
        </aside>
      </div>
    </section>
  );
}
