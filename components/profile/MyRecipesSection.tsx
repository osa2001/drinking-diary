import Link from "next/link";

export function MyRecipesSection() {
  return (
    <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/40 p-4 shadow-sm shadow-black/20">
      <h2 className="text-sm font-medium text-slate-200">My Recipes</h2>
      <p className="mt-1 text-xs text-slate-400">
        Save your custom alcohol recipes here. They will appear when you search drinks
        while logging.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Link
          href="/profile/recipes/add"
          className="inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Add Recipe
        </Link>
        <Link
          href="/profile/recipes"
          className="inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          My Recipes
        </Link>
      </div>
    </section>
  );
}
