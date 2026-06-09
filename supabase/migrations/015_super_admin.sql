-- Add super_admin_id to chapters for independent super-admin designation
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS super_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Seed from created_by for all existing chapters
UPDATE public.chapters
SET super_admin_id = created_by
WHERE super_admin_id IS NULL AND created_by IS NOT NULL;
