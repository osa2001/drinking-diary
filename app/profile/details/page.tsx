import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/MobileNav";
import { ProfileDetailsForm } from "@/components/profile/ProfileDetailsForm";

type SearchParams = {
  mode?: string;
  saved?: string;
  error?: string;
};

export default async function ProfileDetailsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, gender, weight_kg, height_cm, tolerance_level")
    .eq("id", user.id)
    .maybeSingle();
  const hasProfile = !!profile;
  const editing = searchParams?.mode === "edit" || !hasProfile;
  const saved = searchParams?.saved === "1";
  const errorMessage =
    typeof searchParams?.error === "string" && searchParams.error.trim() !== ""
      ? searchParams.error
      : null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-950 to-slate-900 pb-16 sm:pb-20">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-6 sm:px-6">
        <Link
          href="/profile"
          className="mb-4 inline-flex w-fit rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
        >
          Back to Profile
        </Link>
        {saved && (
          <p className="mb-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            Profile saved successfully.
          </p>
        )}
        {errorMessage && (
          <p className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            Unable to save profile: {errorMessage}
          </p>
        )}
        {!editing ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4 shadow-sm shadow-black/20">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h1 className="text-xl font-semibold text-slate-100">My Profile</h1>
              <Link
                href="/profile/details?mode=edit"
                className="inline-flex rounded-md border border-slate-500/50 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
              >
                Edit
              </Link>
            </div>
            <p className="mb-4 text-sm text-slate-400">{user.email}</p>
            <div className="space-y-2 text-sm">
              <p className="text-slate-300">
                <span className="text-slate-500">Display name:</span>{" "}
                {profile?.display_name ?? "—"}
              </p>
              <p className="text-slate-300">
                <span className="text-slate-500">Gender:</span> {profile?.gender ?? "—"}
              </p>
              <p className="text-slate-300">
                <span className="text-slate-500">Weight:</span>{" "}
                {profile?.weight_kg != null ? `${profile.weight_kg} kg` : "—"}
              </p>
              <p className="text-slate-300">
                <span className="text-slate-500">Height:</span>{" "}
                {profile?.height_cm != null ? `${profile.height_cm} cm` : "—"}
              </p>
              <p className="text-slate-300">
                <span className="text-slate-500">Tolerance level:</span>{" "}
                {profile?.tolerance_level ?? "—"}
              </p>
            </div>
          </section>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-slate-100">My Profile</h1>
            <p className="mt-1 text-sm text-slate-400">{user.email}</p>
            <ProfileDetailsForm profile={profile} redirectTo="/profile/details" />
          </>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
