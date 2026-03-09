"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { searchCocktails } from "@/lib/api/cocktail-db";
import { searchBeers } from "@/lib/api/punk";

// Fallback when all other sources return few results
const COMMON_DRINKS_FALLBACK = [
  "Beer", "IPA", "Vodka", "Gin", "Whiskey", "Margarita", "Wine",
];

export type DrinkSuggestion = {
  drink_name: string;
  abv: number | null;
  note: string | null;
  source:
    | "recent"
    | "recipe"
    | "database"
    | "cocktaildb"
    | "punkapi"
    | "fallback";
};

export async function searchDrinks(query: string): Promise<DrinkSuggestion[]> {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return [];

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const results: DrinkSuggestion[] = [];
  const seen = new Set<string>();

  function addUnique(s: DrinkSuggestion) {
    const lower = s.drink_name.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    results.push(s);
  }

  // 1. User's recently logged drinks
  if (user) {
    const { data: recentLogs } = await supabase
      .from("drink_logs")
      .select("drink_name, abv, note, consumed_at")
      .eq("user_id", user.id)
      .order("consumed_at", { ascending: false })
      .limit(100);

    if (recentLogs) {
      const byName = new Map<
        string,
        { drink_name: string; abv: number | null; note: string | null }
      >();
      for (const row of recentLogs) {
        const name = row.drink_name.trim();
        if (!byName.has(name))
          byName.set(name, {
            drink_name: name,
            abv: row.abv,
            note: row.note?.trim() || null,
          });
      }
      for (const { drink_name, abv, note } of byName.values()) {
        if (drink_name.toLowerCase().includes(trimmed)) {
          addUnique({ drink_name, abv, note, source: "recent" });
        }
      }
    }

    // 2. User custom recipes from profile
    try {
      const { data: recipes } = await supabase
        .from("user_recipes")
        .select("name, abv, recipe_note")
        .eq("user_id", user.id)
        .ilike("name", `%${trimmed}%`)
        .limit(50);

      if (recipes) {
        for (const recipe of recipes) {
          addUnique({
            drink_name: recipe.name.trim(),
            abv: recipe.abv,
            note: recipe.recipe_note?.trim() || null,
            source: "recipe",
          });
        }
      }
    } catch {
      // user_recipes table may not exist yet
    }
  }

  // 3. Drinks from Supabase (SQL catalog)
  try {
    const { data: dbDrinks } = await supabase
      .from("drinks")
      .select("name, abv, default_note, category")
      .ilike("name", `%${trimmed}%`);

    if (dbDrinks) {
      for (const row of dbDrinks) {
      const name = row.name.trim();
      const note = row.default_note || row.category || null;
        addUnique({ drink_name: name, abv: row.abv, note, source: "database" });
      }
    }
  } catch {
    // drinks table may not exist yet
  }

  // 4 & 5. External APIs (parallel)
  const [cocktailResults, beerResults] = await Promise.all([
    searchCocktails(query),
    searchBeers(query),
  ]);

  for (const drink of cocktailResults) {
    const note = drink.strCategory || drink.strGlass || null;
    addUnique({
      drink_name: drink.strDrink,
      abv: null,
      note,
      source: "cocktaildb",
    });
  }

  for (const beer of beerResults) {
    const note = beer.tagline || null;
    addUnique({
      drink_name: beer.name,
      abv: beer.abv,
      note,
      source: "punkapi",
    });
  }

  // 6. Fallback static list
  if (results.length < 5) {
    for (const name of COMMON_DRINKS_FALLBACK) {
      if (name.toLowerCase().includes(trimmed)) {
        addUnique({ drink_name: name, abv: null, note: null, source: "fallback" });
      }
    }
  }

  return results.slice(0, 15);
}

export type AddDrinkInput = {
  drinkName: string;
  abv?: number;
  volumeMl?: number;
  note?: string;
  sessionDate?: string;
};

export async function addDrink(input: AddDrinkInput) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { drinkName, abv, volumeMl, note, sessionDate } = input;

  if (!drinkName.trim()) {
    return { error: "Drink name is required" };
  }
  if (
    volumeMl != null &&
    (!Number.isFinite(volumeMl) || volumeMl <= 0 || volumeMl > 5000)
  ) {
    return { error: "Volume must be between 1ml and 5000ml" };
  }

  // Get or create session for requested date (default: today)
  const today = new Date().toISOString().split("T")[0];
  const targetDate = sessionDate ?? today;
  const { data: existingSession } = await supabase
    .from("drinking_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("session_date", targetDate)
    .limit(1)
    .single();

  let sessionId: string;

  if (existingSession) {
    sessionId = existingSession.id;
  } else {
    const { data: newSession, error: sessionError } = await supabase
      .from("drinking_sessions")
      .insert({
        user_id: user.id,
        session_date: targetDate,
      })
      .select("id")
      .single();

    if (sessionError) {
      return { error: sessionError.message };
    }
    sessionId = newSession!.id;
  }

  const { error: logError } = await supabase.from("drink_logs").insert({
    session_id: sessionId,
    user_id: user.id,
    drink_name: drinkName.trim(),
    amount: 1,
    abv: abv ?? null,
    volume_ml: volumeMl ?? null,
    note: note?.trim() || null,
  });

  if (logError) {
    return { error: logError.message };
  }

  // Persist custom drinks to the user's recipe library so they show up next time.
  await supabase.from("user_recipes").upsert(
    {
      user_id: user.id,
      name: drinkName.trim(),
      abv: abv ?? null,
      recipe_note: note?.trim() || null,
    },
    { onConflict: "user_id,name" }
  );

  revalidatePath("/diary");
  revalidatePath("/diary/add");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/profile/recipes");

  return { success: true };
}

export async function deleteDrinkLog(formData: FormData) {
  const logId = formData.get("logId");
  if (typeof logId !== "string" || !logId.trim()) {
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
    .from("drink_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    return;
  }

  revalidatePath("/diary");
  revalidatePath("/dashboard");
}

export async function saveDailyIntoxication(formData: FormData) {
  const date = formData.get("date");
  const levelRaw = formData.get("intoxicationLevel");

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Invalid date" };
  }

  const level = Number(levelRaw);
  if (!Number.isFinite(level) || level < 0 || level > 100) {
    return { error: "Intoxication level must be between 0 and 100" };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Reuse or create a session for this date
  const { data: existingSession } = await supabase
    .from("drinking_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("session_date", date)
    .limit(1)
    .single();

  let sessionId: string;
  if (existingSession) {
    sessionId = existingSession.id;
  } else {
    const { data: newSession, error: createError } = await supabase
      .from("drinking_sessions")
      .insert({
        user_id: user.id,
        session_date: date,
      })
      .select("id")
      .single();

    if (createError || !newSession) {
      return { error: createError?.message ?? "Unable to create session" };
    }
    sessionId = newSession.id;
  }

  const { error } = await supabase
    .from("drinking_sessions")
    .update({ intoxication_level: Math.round(level) })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/diary/${date}`);
  revalidatePath("/diary");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function updateDrinkLog(formData: FormData) {
  const logId = formData.get("logId");
  const drinkName = formData.get("drinkName");
  const volumeMlRaw = formData.get("volumeMl");
  const abvRaw = formData.get("abv");
  const noteRaw = formData.get("note");
  const date = formData.get("date");

  if (typeof logId !== "string" || !logId.trim()) {
    return { error: "Invalid log id" };
  }
  if (typeof drinkName !== "string" || !drinkName.trim()) {
    return { error: "Drink name is required" };
  }

  const volumeMl = Number(volumeMlRaw);
  if (!Number.isFinite(volumeMl) || volumeMl < 1 || volumeMl > 5000) {
    return { error: "Volume must be between 1ml and 5000ml" };
  }

  const abv =
    typeof abvRaw === "string" && abvRaw.trim() !== ""
      ? Number(abvRaw)
      : null;
  if (abv != null && (!Number.isFinite(abv) || abv < 0 || abv > 100)) {
    return { error: "ABV must be between 0 and 100" };
  }

  const note =
    typeof noteRaw === "string" && noteRaw.trim() !== "" ? noteRaw.trim() : null;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("drink_logs")
    .update({
      drink_name: drinkName.trim(),
      amount: 1,
      volume_ml: Math.round(volumeMl),
      abv,
      note,
    })
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    revalidatePath(`/diary/${date}`);
  }
  revalidatePath("/diary");
  revalidatePath("/dashboard");

  return { success: true };
}
