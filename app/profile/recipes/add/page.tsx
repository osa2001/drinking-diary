import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";
import { RecipeCreateForm } from "@/components/profile/RecipeCreateForm";

export default async function AddRecipePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-950 to-slate-900 pb-16 sm:pb-20">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-6 sm:px-6">
        <Link
          href="/profile"
          className="mb-4 inline-flex w-fit rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
        >
          Back to Profile
        </Link>

        <section className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4 shadow-sm shadow-black/20">
          <h1 className="text-xl font-semibold text-slate-100">Add Recipe</h1>
          <p className="mt-1 text-sm text-slate-400">
            Save a custom alcohol recipe to reuse in drink logging.
          </p>
          <div className="mt-4">
            <RecipeCreateForm redirectTo="/profile/recipes" />
          </div>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}
