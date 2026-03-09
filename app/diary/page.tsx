import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";
import Link from "next/link";

type SearchParams = {
  month?: string;
};

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = searchParams ?? {};
  const today = new Date();
  const monthParam = isValidMonth(params.month)
    ? params.month
    : formatMonth(today);
  const [year, month] = monthParam.split("-").map(Number);
  const monthStart = `${monthParam}-01`;
  const monthEnd = formatDateISO(new Date(year, month, 0));

  const { data: monthSessions } = await supabase
    .from("drinking_sessions")
    .select("id, session_date")
    .eq("user_id", user.id)
    .gte("session_date", monthStart)
    .lte("session_date", monthEnd);

  const monthSessionIds = monthSessions?.map((s) => s.id) ?? [];
  const countByDate: Record<string, number> = {};
  if (monthSessionIds.length > 0) {
    const { data: monthLogs } = await supabase
      .from("drink_logs")
      .select("session_id")
      .eq("user_id", user.id)
      .in("session_id", monthSessionIds);

    const dateBySession = new Map(
      (monthSessions ?? []).map((s) => [s.id, s.session_date])
    );
    for (const log of monthLogs ?? []) {
      const d = dateBySession.get(log.session_id);
      if (d) countByDate[d] = (countByDate[d] ?? 0) + 1;
    }
  }

  const calendarDays = buildCalendarDays(year, month);
  const monthTitle = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const prevMonth = formatMonth(new Date(year, month - 2, 1));
  const nextMonth = formatMonth(new Date(year, month, 1));
  const todayIso = formatDateISO(today);

  return (
    <div className="flex min-h-[100dvh] flex-col pb-16 sm:pb-20">
      <main className="flex-1 px-4 pt-6 pb-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              Drink History
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Calendar-based drinking records
            </p>
          </div>
        </div>

        <section className="mt-6 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href={`/diary?month=${prevMonth}`}
              className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
            >
              Prev
            </Link>
            <h2 className="text-sm font-medium text-slate-200">{monthTitle}</h2>
            <Link
              href={`/diary?month=${nextMonth}`}
              className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
            >
              Next
            </Link>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dayCount = day ? countByDate[day] ?? 0 : 0;
              const isToday = day === todayIso;
              const isCurrentMonth = day?.startsWith(monthParam) ?? false;
              return (
                <div key={day ?? `blank-${idx}`} className="aspect-square">
                  {day ? (
                    <Link
                      href={`/diary/${day}?month=${monthParam}`}
                      className={`flex h-full w-full flex-col items-center justify-center rounded-md border text-xs ${
                        isToday
                          ? "border-sky-500 bg-sky-500/20 text-sky-200"
                          : isCurrentMonth
                            ? "border-slate-700 text-slate-200 hover:bg-slate-700/40"
                            : "border-slate-800 text-slate-500"
                      }`}
                    >
                      <span>{Number(day.slice(-2))}</span>
                      {dayCount > 0 && (
                        <span className="mt-0.5 text-[10px] text-slate-400">
                          {dayCount}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <div className="h-full w-full rounded-md border border-transparent" />
                  )}
                </div>
              );
            })}
          </div>
        </section>
        <p className="mt-4 text-xs text-slate-400">
          Tap a date to open that day&apos;s records.
        </p>
      </main>
      <MobileNav />
    </div>
  );
}

function formatDateISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMonth(date: Date) {
  return date.toISOString().slice(0, 7);
}

function isValidMonth(month?: string) {
  return !!month && /^\d{4}-\d{2}$/.test(month);
}

function buildCalendarDays(year: number, month: number) {
  const days: Array<string | null> = [];
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    days.push(formatDateISO(d));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}
