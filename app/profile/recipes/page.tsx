import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";
import { MyRecipesList } from "@/components/profile/MyRecipesList";

export default async function MyRecipesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: recipes } = await supabase
    .from("user_recipes")
    .select("id, name, abv, recipe_note")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-950 to-slate-900 pb-16 sm:pb-20">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            href="/profile"
            className="inline-flex rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
          >
            Back to Profile
          </Link>
          <Link
            href="/profile/recipes/add"
            className="inline-flex rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500"
          >
            Add Recipe
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4 shadow-sm shadow-black/20">
          <h1 className="text-xl font-semibold text-slate-100">My Recipes</h1>
          <p className="mt-1 text-sm text-slate-400">
            Your saved custom recipes for drink logging.
          </p>
          <div className="mt-4">
            <MyRecipesList recipes={recipes} />
          </div>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}
