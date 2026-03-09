-- Add daily intoxication slider field to sessions
ALTER TABLE IF EXISTS drinking_sessions
ADD COLUMN IF NOT EXISTS intoxication_level INTEGER;

-- Keep values within 0-100 if present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'drinking_sessions_intoxication_level_check'
  ) THEN
    ALTER TABLE drinking_sessions
    ADD CONSTRAINT drinking_sessions_intoxication_level_check
    CHECK (intoxication_level IS NULL OR (intoxication_level >= 0 AND intoxication_level <= 100));
  END IF;
END
$$;
