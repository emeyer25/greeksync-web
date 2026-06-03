-- ============================================================
-- 011_meals.sql
-- Chapter-wide meal plan
-- ============================================================

-- 1. Meals table
create table if not exists public.meals (
  id          uuid        default gen_random_uuid() primary key,
  chapter_id  uuid        not null references public.chapters(id) on delete cascade,
  meal_type   text        not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  title       text        not null,
  description text,
  image_url   text,
  date        date        not null,
  created_by  uuid        references auth.users(id),
  created_at  timestamptz default now() not null,
  unique (chapter_id, meal_type, date)
);

create index if not exists meals_chapter_id_idx on public.meals(chapter_id);
create index if not exists meals_date_idx        on public.meals(date);

-- 2. Enable RLS
alter table public.meals enable row level security;

-- 3. RLS Policies

-- All chapter members can read meals
create policy "Chapter members can view meals"
  on public.meals for select using (
    chapter_id = public.get_my_chapter_id()
  );

-- Only admins and editors (officers) can insert meals
create policy "Admins and editors can insert meals"
  on public.meals for insert
  with check (
    exists (
      select 1 from public.members
      where user_id = auth.uid()
        and chapter_id = meals.chapter_id
        and role in ('admin', 'editor')
    )
  );

-- Only admins and editors can update meals
create policy "Admins and editors can update meals"
  on public.meals for update using (
    exists (
      select 1 from public.members
      where user_id = auth.uid()
        and chapter_id = meals.chapter_id
        and role in ('admin', 'editor')
    )
  );

-- Only admins and editors can delete meals
create policy "Admins and editors can delete meals"
  on public.meals for delete using (
    exists (
      select 1 from public.members
      where user_id = auth.uid()
        and chapter_id = meals.chapter_id
        and role in ('admin', 'editor')
    )
  );

-- 4. Storage bucket for meal photos
insert into storage.buckets (id, name, public)
  values ('meal-photos', 'meal-photos', true)
  on conflict (id) do nothing;

-- Storage RLS
create policy "Authenticated can view meal photos"
  on storage.objects for select using (
    bucket_id = 'meal-photos'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated can upload meal photos"
  on storage.objects for insert with check (
    bucket_id = 'meal-photos'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated can update meal photos"
  on storage.objects for update using (
    bucket_id = 'meal-photos'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated can delete meal photos"
  on storage.objects for delete using (
    bucket_id = 'meal-photos'
    and auth.role() = 'authenticated'
  );
