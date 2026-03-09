import { createServerClient } from "@/lib/supabase/server";
import type { BacDrinkInput, BacGender } from "@/lib/bac";
import {
  computeFeaturesFromDrinkLogs,
  DEFAULT_MODEL_WEIGHTS,
  predictIntoxicationLevel,
  predictIntoxicationScore,
  sgdUpdateModel,
  type IntoxicationFeatures,
  type UserModelWeights,
} from "@/lib/ml/intoxication";

export async function loadUserModel(userId: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("user_models")
    .select("w_bac, w_alcohol, w_time, w_drinks, bias")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return DEFAULT_MODEL_WEIGHTS;
  }

  return {
    w_bac: Number(data.w_bac),
    w_alcohol: Number(data.w_alcohol),
    w_time: Number(data.w_time),
    w_drinks: Number(data.w_drinks),
    bias: Number(data.bias),
  } satisfies UserModelWeights;
}

export async function upsertUserModel(userId: string, model: UserModelWeights) {
  const supabase = await createServerClient();
  await supabase.from("user_models").upsert(
    {
      user_id: userId,
      ...model,
      last_updated: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function getProfileForMl(userId: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("weight_kg, gender")
    .eq("id", userId)
    .maybeSingle();

  return {
    weightKg: data?.weight_kg != null ? Number(data.weight_kg) : null,
    gender: (data?.gender as BacGender) ?? null,
  };
}

export async function getDrinkLogsForDate(userId: string, date: string) {
  const supabase = await createServerClient();
  const { data: sessions } = await supabase
    .from("drinking_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("session_date", date);

  const sessionIds = sessions?.map((s) => s.id) ?? [];
  if (sessionIds.length === 0) return [] as Array<
    BacDrinkInput & {
      id: string;
    }
  >;

  const { data: logs } = await supabase
    .from("drink_logs")
    .select("id, amount, volume_ml, abv, consumed_at")
    .eq("user_id", userId)
    .in("session_id", sessionIds)
    .order("consumed_at", { ascending: true });

  return (logs ?? []).map((l) => ({
    id: l.id,
    amount: l.amount,
    volume_ml: l.volume_ml,
    abv: l.abv,
    consumed_at: l.consumed_at,
  }));
}

export async function predictForDate(params: {
  userId: string;
  date: string;
  referenceTime?: Date;
}) {
  const { userId, date, referenceTime = new Date() } = params;
  const profile = await getProfileForMl(userId);
  if (profile.weightKg == null || !Number.isFinite(profile.weightKg) || profile.weightKg <= 0) {
    return { error: "Profile weight is required for prediction" as const };
  }

  const logs = await getDrinkLogsForDate(userId, date);
  const features = computeFeaturesFromDrinkLogs({
    drinks: logs,
    weightKg: profile.weightKg,
    gender: profile.gender,
    referenceTime,
  });
  const model = await loadUserModel(userId);
  const predictedScore = predictIntoxicationScore(features, model);
  const predictedLevel = predictIntoxicationLevel(features, model);

  return {
    features,
    model,
    predictedScore,
    predictedLevel,
    logs,
  };
}

export async function updateModelWithFeedback(params: {
  userId: string;
  date: string;
  actualLevel: number;
  referenceTime?: Date;
  learningRate?: number;
  logId?: string;
}) {
  const { userId, date, actualLevel, referenceTime = new Date(), learningRate, logId } = params;
  const prediction = await predictForDate({ userId, date, referenceTime });
  if ("error" in prediction) return { error: prediction.error };

  const updated = sgdUpdateModel({
    model: prediction.model,
    features: prediction.features,
    actualIntoxicationLevel: actualLevel,
    learningRate,
  });

  await upsertUserModel(userId, updated);

  if (logId) {
    const supabase = await createServerClient();
    await supabase
      .from("drink_logs")
      .update({
        timestamp: referenceTime.toISOString(),
        alcohol_grams: prediction.features.alcohol_grams,
        bac: prediction.features.current_BAC,
        drink_count: prediction.features.drink_count,
        predicted_intoxication: prediction.predictedLevel,
        actual_intoxication: actualLevel,
      })
      .eq("id", logId)
      .eq("user_id", userId);
  }

  return {
    features: prediction.features as IntoxicationFeatures,
    predictedScore: prediction.predictedScore,
    predictedLevel: prediction.predictedLevel,
    updatedModel: updated,
  };
}
