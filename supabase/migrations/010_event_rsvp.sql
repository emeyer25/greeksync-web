-- RSVP tracking per event per member
create table if not exists public.event_rsvp (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  event_id   uuid        not null references public.events(id) on delete cascade,
  member_id  uuid        not null references public.members(id) on delete cascade,
  status     text        not null check (status in ('going', 'not_going')),
  unique(event_id, member_id)
);

alter table public.event_rsvp enable row level security;

create policy "Chapter members can view rsvps"
  on public.event_rsvp for select using (true);

create policy "Authenticated can upsert rsvps"
  on public.event_rsvp for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated can update rsvps"
  on public.event_rsvp for update
  using (auth.role() = 'authenticated');

create policy "Authenticated can delete rsvps"
  on public.event_rsvp for delete
  using (auth.role() = 'authenticated');
