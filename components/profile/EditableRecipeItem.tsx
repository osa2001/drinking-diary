"use client";

import { useState, useTransition } from "react";
import { updateRecipe } from "@/lib/actions/recipes";

type EditableRecipeItemProps = {
  recipe: {
    id: string;
    name: string;
    abv: number | null;
    recipe_note: string | null;
  };
  deleteForm: React.ReactNode;
};

export function EditableRecipeItem({ recipe, deleteForm }: EditableRecipeItemProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(recipe.name);
  const [abv, setAbv] = useState(recipe.abv != null ? String(recipe.abv) : "");
  const [recipeNote, setRecipeNote] = useState(recipe.recipe_note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEditing() {
    setName(recipe.name);
    setAbv(recipe.abv != null ? String(recipe.abv) : "");
    setRecipeNote(recipe.recipe_note ?? "");
    setMessage(null);
    setEditing(true);
  }

  function onSave() {
    setMessage(null);
    const fd = new FormData();
    fd.set("recipeId", recipe.id);
    fd.set("name", name);
    fd.set("abv", abv);
    fd.set("recipeNote", recipeNote);

    startTransition(async () => {
      const result = await updateRecipe(fd);
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      setEditing(false);
      setMessage("Saved");
    });
  }

  return (
    <li className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2">
      {!editing ? (
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-100">{name}</p>
            {abv !== "" && <p className="text-xs text-slate-400">ABV {abv}%</p>}
            {recipeNote && <p className="mt-1 text-xs text-slate-400">{recipeNote}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
              <span className="block text-xs font-medium text-slate-300">Recipe name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Recipe name"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>
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
          </div>
          <label className="space-y-1">
            <span className="block text-xs font-medium text-slate-300">Recipe details</span>
            <textarea
              rows={3}
              value={recipeNote}
              onChange={(e) => setRecipeNote(e.target.value)}
              placeholder="Recipe details"
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            />
          </label>
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
                setName(recipe.name);
                setAbv(recipe.abv != null ? String(recipe.abv) : "");
                setRecipeNote(recipe.recipe_note ?? "");
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
