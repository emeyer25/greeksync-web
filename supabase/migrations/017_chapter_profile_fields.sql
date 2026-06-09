-- Add extended profile fields to chapters
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS greek_letters text,
  ADD COLUMN IF NOT EXISTS school        text,
  ADD COLUMN IF NOT EXISTS description   text;
