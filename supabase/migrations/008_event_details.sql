-- Add detail fields to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS location    text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS flyer_url   text;

-- Storage bucket for event flyers:
-- Create a public bucket named "event-flyers" in your Supabase dashboard
-- Storage > New bucket > Name: event-flyers > Public: true
