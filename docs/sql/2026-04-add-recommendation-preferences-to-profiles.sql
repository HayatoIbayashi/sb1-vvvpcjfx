ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS recommendation_preferences JSONB;

UPDATE profiles
SET recommendation_preferences = '{}'::jsonb
WHERE recommendation_preferences IS NULL;

ALTER TABLE profiles
  ALTER COLUMN recommendation_preferences SET DEFAULT '{}'::jsonb;
