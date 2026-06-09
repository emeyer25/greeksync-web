-- RLS policies for the event-flyers storage bucket
-- Allows authenticated chapter members with calendar_write permission to upload/replace flyers.
-- Everyone can read (bucket is public), but writes are restricted.

-- Allow authenticated users to upload/overwrite flyers for their own chapter's events.
-- The path convention is: {chapter_id}/{event_id}/flyer.{ext}
-- We verify the chapter_id in the path matches the member's chapter.
CREATE POLICY "chapter members can upload event flyers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-flyers'
  AND (
    -- path starts with the member's chapter_id
    (storage.foldername(name))[1] IN (
      SELECT chapter_id::text
      FROM public.members
      WHERE user_id = auth.uid()
        AND (
          role IN ('admin', 'editor')
          OR 'calendar_write' = ANY(permissions)
        )
    )
  )
);

CREATE POLICY "chapter members can update event flyers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-flyers'
  AND (storage.foldername(name))[1] IN (
    SELECT chapter_id::text
    FROM public.members
    WHERE user_id = auth.uid()
      AND (
        role IN ('admin', 'editor')
        OR 'calendar_write' = ANY(permissions)
      )
  )
);

CREATE POLICY "chapter members can delete event flyers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-flyers'
  AND (storage.foldername(name))[1] IN (
    SELECT chapter_id::text
    FROM public.members
    WHERE user_id = auth.uid()
      AND (
        role IN ('admin', 'editor')
        OR 'calendar_write' = ANY(permissions)
      )
  )
);

-- Allow anyone to read (bucket is public, but RLS still needs a SELECT policy)
CREATE POLICY "public read event flyers"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-flyers');
