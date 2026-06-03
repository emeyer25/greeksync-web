-- Add rush event flag to events table
alter table public.events add column if not exists is_rush_event boolean not null default false;

-- Track which rushees have been contacted for a specific rush event
create table if not exists public.event_contacts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  event_id uuid not null references public.events(id) on delete cascade,
  rushee_id uuid not null references public.rushees(id) on delete cascade,
  unique(event_id, rushee_id)
);

alter table public.event_contacts enable row level security;

create policy "Anyone can view event_contacts" on public.event_contacts
  for select using (true);

create policy "Authenticated can insert event_contacts" on public.event_contacts
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated can delete event_contacts" on public.event_contacts
  for delete using (auth.role() = 'authenticated');
