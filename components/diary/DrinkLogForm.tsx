"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDrink } from "@/lib/actions/drinks";
import { DrinkSearchInput } from "./DrinkSearchInput";

type DrinkLogFormProps = {
  sessionDate?: string;
  redirectTo?: string;
};

export function DrinkLogForm({ sessionDate, redirectTo = "/diary" }: DrinkLogFormProps) {
  const router = useRouter();
  const [drinkName, setDrinkName] = useState("");
  const [amount, setAmount] = useState(1);
  const [abv, setAbv] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await addDrink({
      drinkName,
      amount,
      abv: abv ? parseFloat(abv) : undefined,
      note: note || undefined,
      sessionDate,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDrinkName("");
    setAmount(1);
    setAbv("");
    setNote("");
    router.refresh();
    router.push(redirectTo);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DrinkSearchInput
        value={drinkName}
        onChange={setDrinkName}
        abvValue={abv}
        onAbvChange={setAbv}
        noteValue={note}
        onNoteChange={setNote}
        autoFocus
      />

      <div>
        <label
          htmlFor="amount"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Amount
        </label>
        <input
          id="amount"
          type="number"
          min={1}
          max={99}
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value, 10) || 1)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div>
        <label
          htmlFor="abv"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          ABV % <span className="text-slate-500">(optional)</span>
        </label>
        <input
          id="abv"
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={abv}
          onChange={(e) => setAbv(e.target.value)}
          placeholder="e.g. 5, 40"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div>
        <label
          htmlFor="note"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Note <span className="text-slate-500">(optional)</span>
        </label>
        <input
          id="note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. At Atlas Bar"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-sky-600 px-4 py-3 font-medium text-white transition-colors hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
      >
        {loading ? "Adding…" : "Add drink"}
      </button>
    </form>
  );
}
