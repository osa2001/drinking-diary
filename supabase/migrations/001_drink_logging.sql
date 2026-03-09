-- Drinking Diary: drinking_sessions and drink_logs
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)

-- Drinking sessions: one per drinking event (e.g. a night out)
CREATE TABLE IF NOT EXISTS drinking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  location_name TEXT,
  mood TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drink logs: individual drinks within a session
CREATE TABLE IF NOT EXISTS drink_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES drinking_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drink_name TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  abv DECIMAL(4, 2),
  volume_ml INTEGER,
  consumed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_drinking_sessions_user_date ON drinking_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_drink_logs_session ON drink_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_drink_logs_user ON drink_logs(user_id);

-- Row Level Security (RLS)
ALTER TABLE drinking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drink_logs ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY "Users can manage own sessions" ON drinking_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own drink logs" ON drink_logs
  FOR ALL USING (auth.uid() = user_id);
