-- Personalized intoxication prediction (online learning)
-- Adds ML-related columns to drink_logs and creates per-user model weights.

ALTER TABLE drink_logs
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS alcohol_grams NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS bac NUMERIC(6, 4),
  ADD COLUMN IF NOT EXISTS drink_count INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_intoxication SMALLINT,
  ADD COLUMN IF NOT EXISTS actual_intoxication SMALLINT;

-- Keep timestamp aligned with existing consumed_at for historical rows.
UPDATE drink_logs
SET timestamp = consumed_at
WHERE timestamp IS NULL;

CREATE INDEX IF NOT EXISTS idx_drink_logs_user_timestamp
  ON drink_logs(user_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS user_models (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  w_bac NUMERIC(10, 6) NOT NULL DEFAULT 8.000000,
  w_alcohol NUMERIC(10, 6) NOT NULL DEFAULT 0.020000,
  w_time NUMERIC(10, 6) NOT NULL DEFAULT -0.120000,
  w_drinks NUMERIC(10, 6) NOT NULL DEFAULT 0.180000,
  bias NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ML model" ON user_models
  FOR ALL USING (auth.uid() = user_id);
