import Link from "next/link";
import type { BacPrediction } from "@/lib/bac";

type BacPredictionSectionProps = {
  prediction: BacPrediction | null;
  hasProfileForBac: boolean;
  hasEligibleDrinks: boolean;
  detailHref: string;
};

export function BacPredictionSection({
  prediction,
  hasProfileForBac,
  hasEligibleDrinks,
  detailHref,
}: BacPredictionSectionProps) {
  const meterPercent = prediction ? bacToMeterPercent(prediction.bac) : 0;
  const meterLevel = prediction?.label ?? "Sober";

  return (
    <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/40 p-4 shadow-sm shadow-black/20">
      <h2 className="text-sm font-medium text-slate-200">Drunk Meter</h2>

      {!hasProfileForBac ? (
        <p className="mt-2 text-sm text-slate-400">
          Complete your profile weight and gender to calculate BAC.{" "}
          <Link href="/profile/details?mode=edit" className="text-sky-400 hover:text-sky-300">
            Update profile
          </Link>
        </p>
      ) : !hasEligibleDrinks ? (
        <p className="mt-2 text-sm text-slate-400">
          Add drink logs with both volume and ABV to estimate BAC.
        </p>
      ) : prediction ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">Sober</span>
              <span className="text-xs text-slate-400">Wasted</span>
            </div>

            <div className="relative h-4 overflow-hidden rounded-full bg-slate-700">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500" />
              <div
                className="absolute top-1/2 h-6 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-[left,box-shadow,transform] duration-500 ease-out motion-safe:animate-pulse"
                style={{ left: `${meterPercent}%` }}
                aria-hidden="true"
              />
            </div>

            <div className="mt-2 grid grid-cols-5 text-center text-[10px] text-slate-500">
              <span>Sober</span>
              <span>Tipsy</span>
              <span>Buzzed</span>
              <span>Drunk</span>
              <span>Wasted</span>
            </div>
          </div>

          <div className="inline-flex rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
            {meterLevel}
          </div>

          <p className="text-xl font-semibold text-sky-300">
            BAC {prediction.bac.toFixed(3)}%
          </p>
          <p className="text-xs text-slate-400">
            Based on {prediction.totalAlcoholGrams.toFixed(1)}g alcohol and drink times.
          </p>
          <p className="text-xs text-slate-500">
            Estimation only. Not medical or legal advice.
          </p>
          <Link
            href={detailHref}
            className="mt-2 inline-flex rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-300 hover:bg-sky-500/20"
          >
            Detail
          </Link>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-400">Unable to calculate BAC for this record.</p>
      )}
    </section>
  );
}

function bacToMeterPercent(bac: number) {
  // 0.20 BAC maps to 100% of meter.
  const clamped = Math.max(0, Math.min(0.2, bac));
  return (clamped / 0.2) * 100;
}
