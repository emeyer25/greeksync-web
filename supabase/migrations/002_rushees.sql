create table if not exists public.rushees (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  name text not null,
  hometown text,
  notes text,
  status text default 'Rushing',
  photo_url text
);

alter table public.rushees enable row level security;

create policy "Allow all reads" on public.rushees for select using (true);
create policy "Allow all inserts" on public.rushees for insert with check (true);
create policy "Allow all deletes" on public.rushees for delete using (true);
create policy "Allow all updates" on public.rushees for update using (true);

-- Storage: run this separately in the Supabase dashboard > Storage
-- 1. Create a bucket called "rushee-photos" and set it to Public
-- 2. Add a storage policy allowing uploads:
--    insert: true
