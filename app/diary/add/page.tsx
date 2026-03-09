import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";
import { DrinkLogForm } from "@/components/diary/DrinkLogForm";

export default async function AddDrinkPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-[100dvh] flex-col pb-16 sm:pb-20">
      <main className="flex-1 px-4 pt-6 pb-6 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-100">Add Drink</h1>
        <p className="mt-1 text-sm text-slate-400">
          Log a drink for today&apos;s session
        </p>
        <div className="mt-6">
          <DrinkLogForm />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
