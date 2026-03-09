import { createRecipe } from "@/lib/actions/recipes";

type RecipeCreateFormProps = {
  redirectTo?: string;
};

export function RecipeCreateForm({ redirectTo }: RecipeCreateFormProps) {
  return (
    <form action={createRecipe} className="space-y-3">
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

      <div>
        <label
          htmlFor="recipeName"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Recipe name
        </label>
        <input
          id="recipeName"
          name="name"
          type="text"
          required
          placeholder="e.g. House Margarita"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div>
        <label
          htmlFor="recipeAbv"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          ABV % <span className="text-slate-500">(optional)</span>
        </label>
        <input
          id="recipeAbv"
          name="abv"
          type="number"
          min={0}
          max={100}
          step={0.1}
          placeholder="e.g. 12"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <div>
        <label
          htmlFor="recipeNote"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Recipe details <span className="text-slate-500">(optional)</span>
        </label>
        <textarea
          id="recipeNote"
          name="recipeNote"
          rows={3}
          placeholder="e.g. 45ml tequila, 20ml triple sec, 25ml lime juice"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        Save recipe
      </button>
    </form>
  );
}
