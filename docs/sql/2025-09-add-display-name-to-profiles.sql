-- Add display_name column to profiles (nullable, non-unique)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

