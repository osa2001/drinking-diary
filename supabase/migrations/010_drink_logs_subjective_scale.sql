-- Unified 0-100 subjective intoxication scale on raw drink logs.
ALTER TABLE drink_logs
  ADD COLUMN IF NOT EXISTS self_reported_intoxication_100 NUMERIC(5, 2);

-- Backfill from drinking_sessions.intoxication_level when available.
UPDATE drink_logs AS dl
SET self_reported_intoxication_100 = ds.intoxication_level
FROM drinking_sessions AS ds
WHERE dl.session_id = ds.id
  AND dl.self_reported_intoxication_100 IS NULL
  AND ds.intoxication_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_drink_logs_user_subjective_time
  ON drink_logs(user_id, consumed_at DESC, self_reported_intoxication_100);
