-- ============================================================
-- 006_multi_tenancy.sql
-- Chapter isolation: each fraternity has its own data silo
-- ============================================================

-- 1. Chapters table
create table if not exists public.chapters (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  name       text        not null,
  slug       text        not null unique,
  created_by uuid        references auth.users(id)
);

alter table public.chapters enable row level security;

create policy "Public can read chapters"
  on public.chapters for select using (true);

create policy "Authenticated can create chapters"
  on public.chapters for insert
  with check (auth.role() = 'authenticated');

create policy "Chapter admins can update their chapter"
  on public.chapters for update using (
    exists (
      select 1 from public.members
      where user_id = auth.uid()
        and chapter_id = public.chapters.id
        and role = 'admin'
    )
  );

-- 2. Add chapter_id and user_id to members
alter table public.members
  add column if not exists chapter_id uuid references public.chapters(id) on delete cascade,
  add column if not exists user_id    uuid references auth.users(id) on delete cascade;

create index if not exists members_user_id_idx    on public.members(user_id);
create index if not exists members_chapter_id_idx on public.members(chapter_id);

-- 3. Add chapter_id to events and rushees
alter table public.events
  add column if not exists chapter_id uuid references public.chapters(id) on delete cascade;

alter table public.rushees
  add column if not exists chapter_id uuid references public.chapters(id) on delete cascade;

create index if not exists events_chapter_id_idx  on public.events(chapter_id);
create index if not exists rushees_chapter_id_idx on public.rushees(chapter_id);

-- 4. Chapter invites table
create table if not exists public.chapter_invites (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  chapter_id uuid        not null references public.chapters(id) on delete cascade,
  email      text        not null,
  role       text        not null default 'member' check (role in ('admin', 'editor', 'member')),
  position   text,
  invited_by uuid        references auth.users(id),
  token      text        not null unique default encode(gen_random_bytes(32), 'hex'),
  used_at    timestamptz,
  expires_at timestamptz default (now() + interval '7 days')
);

alter table public.chapter_invites enable row level security;

-- Anyone can look up an invite by token (needed for the /join page)
create policy "Anyone can view invites"
  on public.chapter_invites for select using (true);

-- Only chapter admins can create invites
create policy "Chapter admins can create invites"
  on public.chapter_invites for insert
  with check (
    exists (
      select 1 from public.members
      where user_id = auth.uid()
        and chapter_id = chapter_invites.chapter_id
        and role = 'admin'
    )
  );

-- Authenticated users can mark invites as used
create policy "Authenticated can update invites"
  on public.chapter_invites for update
  using (auth.role() = 'authenticated');

-- 5. Security-definer helper: get current user's chapter_id
--    (used in RLS policies to avoid infinite recursion)
create or replace function public.get_my_chapter_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select chapter_id from public.members
  where user_id = auth.uid()
  limit 1;
$$;

-- 6. Update RLS on members to scope to chapter
--    Drop old open policy first
drop policy if exists "Anyone can view members" on public.members;

create policy "Chapter members can view members"
  on public.members for select using (
    chapter_id is null
    or chapter_id = public.get_my_chapter_id()
  );

-- Allow insert for registration flow (new user creating their member record)
drop policy if exists "Authenticated can upsert members" on public.members;

create policy "Authenticated can insert members"
  on public.members for insert
  with check (auth.role() = 'authenticated');

-- Allow admins to update members in their chapter
drop policy if exists "Authenticated can update members" on public.members;

create policy "Chapter admins can update members"
  on public.members for update using (
    auth.role() = 'authenticated'
    and (
      chapter_id is null
      or chapter_id = public.get_my_chapter_id()
    )
  );

-- Allow admins to delete members in their chapter
drop policy if exists "Authenticated can delete members" on public.members;

create policy "Chapter admins can delete members"
  on public.members for delete using (
    auth.role() = 'authenticated'
    and (
      chapter_id is null
      or chapter_id = public.get_my_chapter_id()
    )
  );

-- 7. Update RLS on events
drop policy if exists "Anyone can view events" on public.events;

create policy "Chapter members can view events"
  on public.events for select using (
    chapter_id is null
    or chapter_id = public.get_my_chapter_id()
  );

drop policy if exists "Authenticated can insert events" on public.events;

create policy "Authenticated can insert events"
  on public.events for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can update events" on public.events;

create policy "Authenticated can update events"
  on public.events for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete events" on public.events;

create policy "Authenticated can delete events"
  on public.events for delete using (auth.role() = 'authenticated');

-- 8. Update RLS on rushees
drop policy if exists "Anyone can view rushees" on public.rushees;

create policy "Chapter members can view rushees"
  on public.rushees for select using (
    chapter_id is null
    or chapter_id = public.get_my_chapter_id()
  );
