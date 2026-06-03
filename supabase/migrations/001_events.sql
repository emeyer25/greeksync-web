create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  event_type text not null,
  theme text not null,
  date date not null,
  vibe text,
  headcount integer,
  sections text[],
  generated_content jsonb
);

-- Enable Row Level Security (update policies when you add auth)
alter table public.events enable row level security;

-- For now allow all reads and inserts (tighten once auth is added)
create policy "Allow all reads" on public.events for select using (true);
create policy "Allow all inserts" on public.events for insert with check (true);
