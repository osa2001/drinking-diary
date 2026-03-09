import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { updateModelWithFeedback } from "@/lib/ml/service";

type UpdateBody = {
  date?: string;
  actual_intoxication_level?: number;
  learning_rate?: number;
  referenceTime?: string;
  logId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as UpdateBody;
  const date = isIsoDate(body.date) ? body.date : new Date().toISOString().slice(0, 10);
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

  const referenceTime = body.referenceTime ? new Date(body.referenceTime) : new Date();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await updateModelWithFeedback({
    userId: user.id,
    date,
    actualLevel: actual,
    referenceTime,
    learningRate: body.learning_rate,
    logId: body.logId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    date,
    updated: true,
    predicted_intoxication_level: result.predictedLevel,
    features: result.features,
    model: result.updatedModel,
  });
}

function isIsoDate(value?: string): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
