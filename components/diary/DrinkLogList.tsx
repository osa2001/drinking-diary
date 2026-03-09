import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { deleteDrinkLog } from "@/lib/actions/drinks";

export async function DrinkLogList() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: logs } = await supabase
    .from("drink_logs")
    .select(`
      id,
      drink_name,
      amount,
      abv,
      consumed_at,
      note,
      drinking_sessions (session_date)
    `)
    .eq("user_id", user.id)
    .order("consumed_at", { ascending: false })
    .limit(50);

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-center">
        <p className="text-slate-400">No drinks logged yet.</p>
        <Link
          href="/diary/add"
          className="mt-2 inline-block text-sky-400 hover:text-sky-300"
        >
          Add your first drink
        </Link>
      </div>
    );
  }

  const groupedByDate = logs.reduce<Record<string, typeof logs>>((acc, log) => {
    const session = log.drinking_sessions as { session_date: string } | null;
    const date = session?.session_date ?? new Date(log.consumed_at).toISOString().split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <section key={date}>
          <h2 className="mb-2 text-sm font-medium text-slate-400">
            {formatDate(date)}
          </h2>
          <ul className="space-y-2">
            {groupedByDate[date].map((log) => (
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
        </section>
      ))}
    </div>
  );
}

function formatDate(isoDate: string) {
  const d = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
