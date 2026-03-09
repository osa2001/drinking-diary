"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const displayNameRaw = formData.get("displayName");
  const genderRaw = formData.get("gender");
  const weightRaw = formData.get("weightKg");
  const heightRaw = formData.get("heightCm");
  const toleranceRaw = formData.get("toleranceLevel");
  const redirectToRaw = formData.get("redirectTo");
  const redirectTo =
    typeof redirectToRaw === "string" && redirectToRaw.startsWith("/")
      ? redirectToRaw
      : null;
  const fallbackRedirect = "/profile/details";

  const displayName =
    typeof displayNameRaw === "string" && displayNameRaw.trim() !== ""
      ? displayNameRaw.trim()
      : null;
  const gender =
    typeof genderRaw === "string" && genderRaw.trim() !== "" ? genderRaw.trim() : null;
  const weightKg =
    typeof weightRaw === "string" && weightRaw.trim() !== "" ? Number(weightRaw) : null;
  const heightCm =
    typeof heightRaw === "string" && heightRaw.trim() !== "" ? Number(heightRaw) : null;
  const toleranceLevel =
    typeof toleranceRaw === "string" && toleranceRaw.trim() !== ""
      ? toleranceRaw.trim()
      : null;

  if (weightKg != null && (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400)) {
    redirect(`${fallbackRedirect}?mode=edit&error=Invalid+weight+value`);
  }
  if (heightCm != null && (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 250)) {
    redirect(`${fallbackRedirect}?mode=edit&error=Invalid+height+value`);
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      gender,
      weight_kg: weightKg,
      height_cm: heightCm,
      tolerance_level: toleranceLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    const encoded = encodeURIComponent(error.message);
    redirect(`${fallbackRedirect}?mode=edit&error=${encoded}`);
  }

  revalidatePath("/profile");
  revalidatePath("/profile/details");

  if (redirectTo) {
    redirect(`${redirectTo}?saved=1`);
  }

  redirect(`${fallbackRedirect}?saved=1`);
}
