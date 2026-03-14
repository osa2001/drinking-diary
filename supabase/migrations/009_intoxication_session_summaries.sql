-- MVP storage for retrieval-based subjective intoxication prediction.
-- Keeps raw drink logs in drink_logs and stores optional denormalized summaries.

CREATE TABLE IF NOT EXISTS intoxication_session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_session_key TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  total_alcohol_grams NUMERIC(10, 3) NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  drink_count INTEGER NOT NULL,
  drinking_pace_gph NUMERIC(10, 3) NOT NULL,
  peak_intoxication_100 NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source_session_key)
);

CREATE INDEX IF NOT EXISTS idx_intoxication_session_summaries_user_created
  ON intoxication_session_summaries(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS planned_intoxication_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  planned_total_alcohol_grams NUMERIC(10, 3) NOT NULL,
  planned_duration_minutes INTEGER NOT NULL,
  planned_drink_count INTEGER NOT NULL,
  planned_drinking_pace_gph NUMERIC(10, 3) NOT NULL,
  predicted_peak_intoxication_100 NUMERIC(5, 2) NOT NULL,
  baseline_peak_intoxication_100 NUMERIC(5, 2) NOT NULL,
  personalized_peak_intoxication_100 NUMERIC(5, 2),
  baseline_weight NUMERIC(5, 3) NOT NULL,
  personalized_weight NUMERIC(5, 3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planned_intoxication_predictions_user_created
  ON planned_intoxication_predictions(user_id, created_at DESC);

ALTER TABLE intoxication_session_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_intoxication_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own intoxication session summaries"
  ON intoxication_session_summaries
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own planned intoxication predictions"
  ON planned_intoxication_predictions
  FOR ALL
  USING (auth.uid() = user_id);
