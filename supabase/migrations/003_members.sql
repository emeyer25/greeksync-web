create table if not exists public.members (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  name text not null,
  position text not null,
  email text unique,
  role text not null default 'member' check (role in ('admin', 'editor', 'member'))
);

-- Enable Row Level Security
alter table public.members enable row level security;

-- Anyone can view the roster
create policy "Public can read members" on public.members
  for select using (true);

-- Authenticated users can manage members (role checks enforced in app)
create policy "Authenticated can insert members" on public.members
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated can update members" on public.members
  for update using (auth.role() = 'authenticated');

create policy "Authenticated can delete members" on public.members
  for delete using (auth.role() = 'authenticated');

-- SETUP INSTRUCTIONS:
-- 1. Run this migration in your Supabase SQL editor
-- 2. Go to Authentication > Users and invite the first admin user
-- 3. Go to Table Editor > members and insert a row:
--    name: "Your Name", position: "President", email: "your@email.com", role: "admin"
-- 4. That person can now log in at /login and manage the rest of the roster
