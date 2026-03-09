import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date().toISOString().split("T")[0];
  const { data: todaySessions } = await supabase
    .from("drinking_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("session_date", today);
  const sessionIds = todaySessions?.map((s) => s.id) ?? [];

  const { count } =
    sessionIds.length > 0
      ? await supabase
          .from("drink_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("session_id", sessionIds)
      : { count: 0 };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-950 to-slate-900 pb-16 sm:pb-20">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-6 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-100">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">{user.email}</p>

        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/50 p-5 shadow-sm shadow-black/20">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Today&apos;s Drinks
          </p>
          <p className="mt-2 text-4xl font-semibold text-slate-100">
            {count ?? 0}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {count === 1 ? "drink logged" : "drinks logged"}
          </p>
          <Link
            href="/diary/add"
            className="mt-4 inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Add Drink
          </Link>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href="/diary"
            className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-sm text-slate-200 hover:bg-slate-800/70"
          >
            <p className="font-medium">Diary</p>
            <p className="mt-1 text-xs text-slate-400">Open calendar view</p>
          </Link>
          <Link
            href="/profile"
            className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-sm text-slate-200 hover:bg-slate-800/70"
          >
            <p className="font-medium">Profile</p>
            <p className="mt-1 text-xs text-slate-400">Update your details</p>
          </Link>
        </section>
      </main>

      <MobileNav />
    </div>
  );
}
