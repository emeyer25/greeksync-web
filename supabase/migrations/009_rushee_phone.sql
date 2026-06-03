-- Add phone number to rushees
ALTER TABLE rushees ADD COLUMN IF NOT EXISTS phone text;
