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
    <div className="flex min-h-[100dvh] flex-col pb-16 sm:pb-20">
      <main className="flex-1 px-4 pt-6 pb-6 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-100">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">{user.email}</p>

        <section className="mt-8 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h2 className="text-sm font-medium text-slate-300">
            Today&apos;s Drinks
          </h2>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {(count ?? 0)} logged
          </p>
          <Link
            href="/diary/add"
            className="mt-3 inline-block text-sm text-sky-400 hover:text-sky-300"
          >
            Add a drink →
          </Link>
        </section>
      </main>

      <MobileNav />
    </div>
  );
}
