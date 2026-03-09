"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function createRecipe(formData: FormData) {
  const nameRaw = formData.get("name");
  const abvRaw = formData.get("abv");
  const recipeNoteRaw = formData.get("recipeNote");
  const redirectToRaw = formData.get("redirectTo");
  const redirectTo =
    typeof redirectToRaw === "string" && redirectToRaw.startsWith("/")
      ? redirectToRaw
      : null;

  if (typeof nameRaw !== "string" || !nameRaw.trim()) {
    return;
  }

  const name = nameRaw.trim();
  const abv =
    typeof abvRaw === "string" && abvRaw.trim() !== "" ? Number(abvRaw) : null;
  if (abv != null && (!Number.isFinite(abv) || abv < 0 || abv > 100)) {
    return;
  }

  const recipeNote =
    typeof recipeNoteRaw === "string" && recipeNoteRaw.trim() !== ""
      ? recipeNoteRaw.trim()
      : null;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase.from("user_recipes").upsert(
    {
      user_id: user.id,
      name,
      abv,
      recipe_note: recipeNote,
    },
    {
      onConflict: "user_id,name",
    }
  );

  if (error) {
    return;
  }

  revalidatePath("/profile");
  revalidatePath("/profile/recipes");

  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function deleteRecipe(formData: FormData) {
  const recipeId = formData.get("recipeId");
  if (typeof recipeId !== "string" || !recipeId.trim()) {
    return;
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("user_recipes")
    .delete()
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (error) {
    return;
  }

  revalidatePath("/profile");
  revalidatePath("/profile/recipes");
}

export async function updateRecipe(formData: FormData) {
  const recipeId = formData.get("recipeId");
  const nameRaw = formData.get("name");
  const abvRaw = formData.get("abv");
  const recipeNoteRaw = formData.get("recipeNote");

  if (typeof recipeId !== "string" || !recipeId.trim()) {
    return { error: "Invalid recipe id" };
  }
  if (typeof nameRaw !== "string" || !nameRaw.trim()) {
    return { error: "Recipe name is required" };
  }

  const name = nameRaw.trim();
  const abv =
    typeof abvRaw === "string" && abvRaw.trim() !== "" ? Number(abvRaw) : null;
  if (abv != null && (!Number.isFinite(abv) || abv < 0 || abv > 100)) {
    return { error: "ABV must be between 0 and 100" };
  }

  const recipeNote =
    typeof recipeNoteRaw === "string" && recipeNoteRaw.trim() !== ""
      ? recipeNoteRaw.trim()
      : null;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("user_recipes")
    .update({
      name,
      abv,
      recipe_note: recipeNote,
    })
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/recipes");

  return { success: true };
}
