import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-[100dvh] flex-col pb-16 sm:pb-20">
      <main className="flex-1 px-4 pt-6 pb-6 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-100">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">{user.email}</p>
        <p className="mt-4 text-slate-500">
          Editable user records (weight, gender, etc.) coming soon.
        </p>
      </main>
      <MobileNav />
    </div>
  );
}
