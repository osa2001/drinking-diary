"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { searchCocktails } from "@/lib/api/cocktail-db";
import { searchBeers } from "@/lib/api/punk";
import { updateModelWithFeedback } from "@/lib/ml/service";

// Fallback when all other sources return few results
const COMMON_DRINKS_FALLBACK = [
  "Beer", "IPA", "Vodka", "Gin", "Whiskey", "Margarita", "Wine",
];

const DRINK_QUERY_ALIASES: Record<string, string[]> = {
  "coors light": ["coors", "coorslite", "coors lt", "coorsl"],
  "coors": ["coors light", "coors banquet"],
  "bud light": ["budlight", "bud lt", "bud l"],
  "budweiser": ["bud", "bud heavy", "budweiswer"],
  "miller lite": ["miller light", "millerlite", "miller lt"],
  "michelob ultra": ["michelob", "ultra", "michelobultra", "michelob ult"],
  "stella artois": ["stella", "stella artios", "stela artois"],
  "modelo especial": ["modelo", "modello", "modelo esp"],
  "corona extra": ["corona", "coronae", "corona xtra"],
  "guinness draught": ["guinness", "guiness", "guinness draft"],
  "blue moon belgian white": ["blue moon", "bluemoon", "blue moon white"],
  "heineken": ["heiniken", "heiny", "heinie", "henieken"],
  "dos equis xx": ["dos equis", "xx", "dos xx"],
  "kronenbourg 1664": ["1664", "kronenbourg"],
  "truly hard seltzer": ["truly", "truly seltzer"],
  "samuel adams": ["sam adams", "samadams", "samueladams"],
};

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
  const searchTerms = expandSearchTerms(trimmed);
  const primaryTerm = searchTerms[0];

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
        const lowerName = drink_name.toLowerCase();
        if (searchTerms.some((term) => lowerName.includes(term))) {
          addUnique({ drink_name, abv, note, source: "recent" });
        }
      }
    }

    // 2. User custom recipes from profile
    try {
      const recipeOrClause = buildIlikeOrClause("name", searchTerms);
      const { data: recipes } = await supabase
        .from("user_recipes")
        .select("name, abv, recipe_note")
        .eq("user_id", user.id)
        .or(recipeOrClause)
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
    const drinkOrClause = buildIlikeOrClause("name", searchTerms);
    const { data: dbDrinks } = await supabase
      .from("drinks")
      .select("name, abv, default_note, category")
      .or(drinkOrClause);

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
      if (name.toLowerCase().includes(primaryTerm)) {
        addUnique({ drink_name: name, abv: null, note: null, source: "fallback" });
      }
    }
  }

  return results.slice(0, 15);
}

function expandSearchTerms(term: string) {
  const normalized = term.trim().toLowerCase();
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  const terms = new Set<string>([normalized]);

  for (const [canonical, aliases] of Object.entries(DRINK_QUERY_ALIASES)) {
    const canonicalCompact = canonical.replace(/[^a-z0-9]/g, "");
    if (normalized === canonical || compact === canonicalCompact) {
      terms.add(canonical);
      for (const alias of aliases) terms.add(alias);
      continue;
    }

    for (const alias of aliases) {
      const aliasCompact = alias.replace(/[^a-z0-9]/g, "");
      if (normalized === alias || compact === aliasCompact) {
        terms.add(canonical);
        for (const related of aliases) terms.add(related);
      }
    }
  }

  return Array.from(terms);
}

function buildIlikeOrClause(column: string, terms: string[]) {
  return terms
    .filter((term) => term.length >= 2)
    .map((term) => `${column}.ilike.%${escapeLikeValue(term)}%`)
    .join(",");
}

function escapeLikeValue(value: string) {
  return value.replaceAll("%", "\\%").replaceAll(",", "\\,");
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

  // Keep raw drink logs aligned with unified subjective 0-100 input.
  await supabase
    .from("drink_logs")
    .update({ self_reported_intoxication_100: Math.round(level) })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  const mappedLevel = sliderPercentToModelLevel(level);
  await updateModelWithFeedback({
    userId: user.id,
    date,
    actualLevel: mappedLevel,
    referenceTime: new Date(),
  });

  revalidatePath(`/diary/${date}`);
  revalidatePath("/diary");
  revalidatePath("/dashboard");

  return { success: true };
}

function sliderPercentToModelLevel(percent: number) {
  const anchors = [0, 20, 40, 60, 100];
  let index = 0;
  let minDiff = Number.POSITIVE_INFINITY;
  for (let i = 0; i < anchors.length; i += 1) {
    const diff = Math.abs(percent - anchors[i]);
    // Bias ties toward higher level for upper-end intoxication values.
    if (diff <= minDiff) {
      minDiff = diff;
      index = i;
    }
  }
  return index;
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
