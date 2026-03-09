import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";
import { DrinkLogForm } from "@/components/diary/DrinkLogForm";
import { deleteDrinkLog } from "@/lib/actions/drinks";

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
    .select("id")
    .eq("user_id", user.id)
    .eq("session_date", date);

  const sessionIds = sessions?.map((s) => s.id) ?? [];

  const { data: logs } =
    sessionIds.length > 0
      ? await supabase
          .from("drink_logs")
          .select("id, drink_name, amount, abv, consumed_at, note")
          .eq("user_id", user.id)
          .in("session_id", sessionIds)
          .order("consumed_at", { ascending: false })
      : { data: [] as Array<{
          id: string;
          drink_name: string;
          amount: number;
          abv: number | null;
          consumed_at: string;
          note: string | null;
        }> };

  const redirectTo = `/diary/${date}?month=${monthParam}`;

  return (
    <div className="flex min-h-[100dvh] flex-col pb-16 sm:pb-20">
      <main className="flex-1 px-4 pt-6 pb-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              {formatSelectedDate(date)}
            </h1>
            <p className="mt-1 text-sm text-slate-400">Daily drinking records</p>
          </div>
          <Link
            href={`/diary?month=${monthParam}`}
            className="rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
          >
            Back to Calendar
          </Link>
        </div>

        <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h2 className="text-sm font-medium text-slate-200">Add record</h2>
          <div className="mt-4">
            <DrinkLogForm sessionDate={date} redirectTo={redirectTo} />
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-200">Records</h2>
          {!logs || logs.length === 0 ? (
            <p className="text-sm text-slate-400">No records for this date.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-slate-100">
                      {log.drink_name}
                    </span>
                    {log.amount > 1 && (
                      <span className="ml-1 text-slate-400">×{log.amount}</span>
                    )}
                    {log.abv != null && (
                      <span className="ml-1 text-slate-500">{log.abv}%</span>
                    )}
                    {log.note && (
                      <p className="mt-0.5 text-sm text-slate-500">{log.note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm text-slate-500">
                      {formatTime(log.consumed_at)}
                    </span>
                    <form action={deleteDrinkLog}>
                      <input type="hidden" name="logId" value={log.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
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

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
