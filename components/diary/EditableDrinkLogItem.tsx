"use client";

import { useState, useTransition } from "react";
import { updateDrinkLog } from "@/lib/actions/drinks";

type EditableDrinkLogItemProps = {
  log: {
    id: string;
    drink_name: string;
    volume_ml: number | null;
    amount: number;
    abv: number | null;
    consumed_at: string;
    note: string | null;
  };
  date: string;
  deleteForm: React.ReactNode;
};

export function EditableDrinkLogItem({
  log,
  date,
  deleteForm,
}: EditableDrinkLogItemProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(log.drink_name);
  const [volumeMl, setVolumeMl] = useState(
    log.volume_ml != null ? String(log.volume_ml) : "330"
  );
  const [abv, setAbv] = useState(log.abv != null ? String(log.abv) : "");
  const [note, setNote] = useState(log.note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const timeLabel = new Date(log.consumed_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  function onSave() {
    setMessage(null);
    const fd = new FormData();
    fd.set("logId", log.id);
    fd.set("drinkName", name);
    fd.set("volumeMl", volumeMl);
    fd.set("abv", abv);
    fd.set("note", note);
    fd.set("date", date);

    startTransition(async () => {
      const result = await updateDrinkLog(fd);
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      setEditing(false);
      setMessage("Saved");
    });
  }

  function startEditing() {
    // Always hydrate inputs from the latest record values when opening edit mode.
    setName(log.drink_name);
    setVolumeMl(log.volume_ml != null ? String(log.volume_ml) : "330");
    setAbv(log.abv != null ? String(log.abv) : "");
    setNote(log.note ?? "");
    setMessage(null);
    setEditing(true);
  }

  return (
    <li className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-medium text-slate-100">{name}</span>
            {volumeMl && <span className="ml-1 text-slate-400">{volumeMl}ml</span>}
            {abv !== "" && <span className="ml-1 text-slate-500">{abv}%</span>}
            {note && <p className="mt-0.5 text-sm text-slate-500">{note}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-slate-500">{timeLabel}</span>
            <button
              type="button"
              onClick={startEditing}
              className="rounded-md border border-slate-500/50 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700/70"
            >
              Edit
            </button>
            {deleteForm}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="block text-xs font-medium text-slate-300">Drink name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Drink name"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-medium text-slate-300">Volume (ml)</span>
              <input
                type="number"
                min={1}
                max={5000}
                value={volumeMl}
                onChange={(e) => setVolumeMl(e.target.value)}
                placeholder="Volume (ml)"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="block text-xs font-medium text-slate-300">ABV %</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={abv}
                onChange={(e) => setAbv(e.target.value)}
                placeholder="ABV %"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-medium text-slate-300">Note</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setMessage(null);
                setName(log.drink_name);
                setVolumeMl(log.volume_ml != null ? String(log.volume_ml) : "330");
                setAbv(log.abv != null ? String(log.abv) : "");
                setNote(log.note ?? "");
              }}
              className="rounded-md border border-slate-500/50 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/70"
            >
              Cancel
            </button>
            <span className="text-xs text-slate-400">{message}</span>
          </div>
        </div>
      )}
    </li>
  );
}
