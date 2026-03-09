-- User profile data used for BAC/intoxication personalization

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  gender TEXT,
  weight_kg NUMERIC(5, 2),
  height_cm NUMERIC(5, 2),
  tolerance_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);
