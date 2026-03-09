import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { loadUserModel, updateModelWithFeedback, upsertUserModel } from "@/lib/ml/service";
import { sgdUpdateModelOnline } from "@/lib/ml/online";
import type { IntoxicationFeaturesV2 } from "@/lib/intoxication/types";

type FeedbackBody = {
  date?: string;
  actual_intoxication_level?: number;
  learning_rate?: number;
  referenceTime?: string;
  logId?: string;
  features?: Partial<IntoxicationFeaturesV2>;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as FeedbackBody;
  const actual =
    typeof body.actual_intoxication_level === "number"
      ? Math.round(body.actual_intoxication_level)
      : NaN;
  if (!Number.isFinite(actual) || actual < 0 || actual > 4) {
    return NextResponse.json(
      { error: "actual_intoxication_level must be between 0 and 4" },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const maybeFeatures = normalizeFeatures(body.features);
  if (maybeFeatures) {
    const currentModel = await loadUserModel(user.id);
    const updated = sgdUpdateModelOnline({
      model: currentModel,
      features: maybeFeatures,
      actualLevel: actual,
      learningRate: body.learning_rate,
    });
    await upsertUserModel(user.id, updated);
    return NextResponse.json({
      updated: true,
      source: "features",
      model: updated,
    });
  }

  const date = isIsoDate(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  const result = await updateModelWithFeedback({
    userId: user.id,
    date,
    actualLevel: actual,
    referenceTime: body.referenceTime ? new Date(body.referenceTime) : new Date(),
    learningRate: body.learning_rate,
    logId: body.logId,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    updated: true,
    source: "date",
    predicted_intoxication_level: result.predictedLevel,
    features: result.features,
    model: result.updatedModel,
  });
}

function isIsoDate(value?: string): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeFeatures(
  input?: Partial<IntoxicationFeaturesV2>
): IntoxicationFeaturesV2 | null {
  if (!input) return null;
  const required: Array<keyof IntoxicationFeaturesV2> = [
    "alcohol_grams",
    "current_BAC",
    "time_since_first_drink",
    "intake_rate_g_per_hour",
    "drink_count",
    "user_weight",
    "gender",
  ];
  for (const key of required) {
    if (input[key] == null) return null;
  }
  return input as IntoxicationFeaturesV2;
}
