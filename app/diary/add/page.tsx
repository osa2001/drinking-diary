import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";
import { DrinkLogForm } from "@/components/diary/DrinkLogForm";

type SearchParams = {
  date?: string;
  month?: string;
};

export default async function AddDrinkPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dateParam =
    searchParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : undefined;
  const monthParam =
    searchParams?.month && /^\d{4}-\d{2}$/.test(searchParams.month)
      ? searchParams.month
      : dateParam?.slice(0, 7);
  const redirectTo = dateParam
    ? `/diary/${dateParam}?month=${monthParam ?? dateParam.slice(0, 7)}`
    : "/diary";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-950 to-slate-900 pb-16 sm:pb-20">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-6 sm:px-6">
        <Link
          href={redirectTo}
          className="mb-4 inline-flex w-fit rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
        >
          Back
        </Link>
        <h1 className="text-xl font-semibold text-slate-100">Add Drink</h1>
        <p className="mt-1 text-sm text-slate-400">
          {dateParam
            ? `Log a drink for ${new Date(dateParam).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}`
            : "Log a drink for today's session"}
        </p>
        <div className="mt-6">
          <DrinkLogForm sessionDate={dateParam} redirectTo={redirectTo} />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
