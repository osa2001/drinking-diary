import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { PlannedIntoxicationPredictionCard } from "@/components/dashboard/PlannedIntoxicationPredictionCard";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function IntoxicationPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-950 to-slate-900 pb-16 sm:pb-20">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-6 sm:px-6">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Intoxication Prediction</h1>
            <p className="mt-1 text-sm text-slate-400">
              Forecast current, peak, and sober timing from planned drinks.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
          >
            Back Home
          </Link>
        </div>

        <PlannedIntoxicationPredictionCard />
      </main>
      <MobileNav />
    </div>
  );
}
