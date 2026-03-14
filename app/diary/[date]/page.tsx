import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";
import { deleteDrinkLog } from "@/lib/actions/drinks";
import { IntoxicationSlider } from "@/components/diary/IntoxicationSlider";
import { EditableDrinkLogItem } from "@/components/diary/EditableDrinkLogItem";
import { BacPredictionSection } from "@/components/diary/BacPredictionSection";
import {
  calculateBacPrediction,
  getDefaultReferenceTime,
  type BacDrinkInput,
  type BacGender,
} from "@/lib/bac";

type SearchParams = {
  month?: string;
};

export default async function DiaryDatePage({
  params,
  searchParams,
}: {
  params: { date: string };
  searchParams: SearchParams;
}) {
  const date = params.date;
  if (!isValidDate(date)) notFound();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const monthParam =
    searchParams?.month && /^\d{4}-\d{2}$/.test(searchParams.month)
      ? searchParams.month
      : date.slice(0, 7);

  const { data: sessions } = await supabase
    .from("drinking_sessions")
    .select("id, intoxication_level")
    .eq("user_id", user.id)
    .eq("session_date", date);

  const sessionIds = sessions?.map((s) => s.id) ?? [];
  const currentIntoxication = sessions?.[0]?.intoxication_level ?? 0;

  const { data: logs } =
    sessionIds.length > 0
      ? await supabase
          .from("drink_logs")
          .select("id, drink_name, amount, volume_ml, abv, consumed_at, note")
          .eq("user_id", user.id)
          .in("session_id", sessionIds)
          .order("consumed_at", { ascending: false })
      : { data: [] as Array<{
          id: string;
          drink_name: string;
          amount: number;
          volume_ml: number | null;
          abv: number | null;
          consumed_at: string;
          note: string | null;
        }> };

  let profile:
    | {
        gender: string | null;
        weight_kg: number | null;
      }
    | null
    | undefined;
  try {
    const result = await supabase
      .from("profiles")
      .select("gender, weight_kg")
      .eq("id", user.id)
      .maybeSingle();
    profile = result.data;
  } catch {
    profile = null;
  }

  const drinksForBac: BacDrinkInput[] = (logs ?? []).map((log) => ({
    amount: log.amount,
    volume_ml: log.volume_ml,
    abv: log.abv,
    consumed_at: log.consumed_at,
  }));
  const hasEligibleDrinks = drinksForBac.some((d) => d.volume_ml != null && d.abv != null);
  const hasProfileForBac =
    profile?.weight_kg != null && Number.isFinite(profile.weight_kg) && profile.weight_kg > 0;
  const prediction = hasProfileForBac
    ? calculateBacPrediction({
        drinks: drinksForBac,
        weightKg: profile?.weight_kg ?? null,
        gender: (profile?.gender as BacGender) ?? null,
        referenceTime: getDefaultReferenceTime(date, drinksForBac),
      })
    : null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-950 to-slate-900 pb-16 sm:pb-20">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-6 sm:px-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              {formatSelectedDate(date)}
            </h1>
            <p className="mt-1 text-sm text-slate-400">Daily drinking records</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/diary/add?date=${date}&month=${monthParam}`}
              className="rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500"
            >
              Add drink
            </Link>
            <Link
              href={`/diary?month=${monthParam}`}
              className="rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
            >
              Back to Calendar
            </Link>
          </div>
        </div>

        <section>
          <IntoxicationSlider date={date} initialValue={currentIntoxication} />
        </section>

        <BacPredictionSection
          prediction={prediction}
          hasProfileForBac={hasProfileForBac}
          hasEligibleDrinks={hasEligibleDrinks}
          detailHref={`/diary/${date}/bac?month=${monthParam}`}
        />

        <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/40 p-4 shadow-sm shadow-black/20">
          <h2 className="mb-3 text-sm font-medium text-slate-200">Records</h2>
          {!logs || logs.length === 0 ? (
            <p className="text-sm text-slate-400">No records for this date.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <EditableDrinkLogItem
                  key={log.id}
                  log={log}
                  date={date}
                  deleteForm={
                    <form action={deleteDrinkLog}>
                      <input type="hidden" name="logId" value={log.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </form>
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

function isValidDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function formatSelectedDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


