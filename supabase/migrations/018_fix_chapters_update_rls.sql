-- The chapters UPDATE policy previously queried members directly, which triggered
-- members RLS and caused the check to fail. Use a security-definer function instead,
-- matching the same pattern as get_my_chapter_id().
CREATE OR REPLACE FUNCTION public.is_chapter_admin(chapter_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE user_id = auth.uid()
      AND chapter_id = chapter_uuid
      AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Chapter admins can update their chapter" ON public.chapters;

CREATE POLICY "Chapter admins can update their chapter"
  ON public.chapters FOR UPDATE USING (
    public.is_chapter_admin(id)
  );
