import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";
import { BacDetailInteractive } from "@/components/diary/BacDetailInteractive";
import { BacLevelsInfo } from "@/components/diary/BacLevelsInfo";
import {
  getDefaultReferenceTime,
  getTotalAlcoholGrams,
  type BacDrinkInput,
  type BacGender,
} from "@/lib/bac";

type SearchParams = {
  month?: string;
};

export default async function BacDetailPage({
  params,
  searchParams,
}: {
  params: { date: string };
  searchParams: SearchParams;
}) {
  const date = params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

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
    .select("id")
    .eq("user_id", user.id)
    .eq("session_date", date);
  const sessionIds = sessions?.map((s) => s.id) ?? [];

  const { data: logs } =
    sessionIds.length > 0
      ? await supabase
          .from("drink_logs")
          .select("amount, volume_ml, abv, consumed_at")
          .eq("user_id", user.id)
          .in("session_id", sessionIds)
          .order("consumed_at", { ascending: true })
      : { data: [] as BacDrinkInput[] };

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

  const totalAlcoholGrams = getTotalAlcoholGrams(drinksForBac);
  const defaultRef = getDefaultReferenceTime(date, drinksForBac);
  const earliestDrinkMs =
    drinksForBac.length > 0
      ? drinksForBac
          .map((d) => new Date(d.consumed_at).getTime())
          .reduce((min, ts) => (ts < min ? ts : min), Number.POSITIVE_INFINITY)
      : new Date(`${date}T18:00:00`).getTime();
  const elapsedSinceStart = Math.max(0, (defaultRef.getTime() - earliestDrinkMs) / 3600000);
  const maxHours = Math.max(6, Number((elapsedSinceStart + 12).toFixed(2)));
  const initialHours = Number(elapsedSinceStart.toFixed(2));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-950 to-slate-900 pb-16 sm:pb-20">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            href={`/diary/${date}?month=${monthParam}`}
            className="inline-flex rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
          >
            Back to Record
          </Link>
        </div>

        <h1 className="text-xl font-semibold text-slate-100">BAC Detail</h1>
        <p className="mt-1 text-sm text-slate-400">{new Date(date).toLocaleDateString("en-US")}</p>

        {!hasProfileForBac ? (
          <p className="mt-4 text-sm text-slate-400">
            Add weight and gender in{" "}
            <Link href="/profile/details?mode=edit" className="text-sky-400 hover:text-sky-300">
              My Profile
            </Link>{" "}
            to use BAC detail.
          </p>
        ) : !hasEligibleDrinks ? (
          <p className="mt-4 text-sm text-slate-400">
            Add drink logs with both ABV and volume to calculate BAC over time.
          </p>
        ) : (
          <div className="mt-4">
            <BacDetailInteractive
              totalAlcoholGrams={totalAlcoholGrams}
              weightKg={profile?.weight_kg ?? 0}
              gender={(profile?.gender as BacGender) ?? null}
              maxHours={Number(maxHours.toFixed(2))}
              initialHours={Number(initialHours.toFixed(2))}
            />
          </div>
        )}

        <BacLevelsInfo />
      </main>
      <MobileNav />
    </div>
  );
}
