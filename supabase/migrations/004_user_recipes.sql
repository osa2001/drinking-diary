-- User custom alcohol recipes
-- Allows each user to store personal drink recipes for autocomplete

CREATE TABLE IF NOT EXISTS user_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abv DECIMAL(4, 2),
  recipe_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_recipes_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_recipes_user_name_lower
  ON user_recipes (user_id, lower(name));

ALTER TABLE user_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recipes" ON user_recipes
  FOR ALL USING (auth.uid() = user_id);
