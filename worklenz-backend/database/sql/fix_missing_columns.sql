-- Add missing columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD'::TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;
