import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";
import { MyRecipesSection } from "@/components/profile/MyRecipesSection";

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-950 to-slate-900 pb-16 sm:pb-20">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-6 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-100">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">{user.email}</p>

        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/40 p-4 shadow-sm shadow-black/20">
          <h2 className="text-sm font-medium text-slate-200">My Profile</h2>
          <p className="mt-1 text-xs text-slate-400">
            Edit your personal details like gender, weight, height, and tolerance.
          </p>
          <Link
            href="/profile/details"
            className="mt-4 inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            My Profile
          </Link>
        </section>

        <MyRecipesSection />
      </main>
      <MobileNav />
    </div>
  );
}
