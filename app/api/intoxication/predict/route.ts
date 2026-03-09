import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { predictForDate } from "@/lib/ml/service";

type PredictBody = {
  date?: string;
  referenceTime?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PredictBody;
  const date = isIsoDate(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  const referenceTime = body.referenceTime ? new Date(body.referenceTime) : new Date();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await predictForDate({
    userId: user.id,
    date,
    referenceTime,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    date,
    predicted_intoxication_level: result.predictedLevel,
    predicted_score: result.predictedScore,
    features: result.features,
  });
}

function isIsoDate(value?: string): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
