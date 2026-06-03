-- dues_periods: one row per billing period per chapter
create table if not exists public.dues_periods (
  id                 uuid        default gen_random_uuid() primary key,
  chapter_id         uuid        not null references public.chapters(id) on delete cascade,
  name               text        not null,
  amount_per_member  integer     not null, -- stored in cents
  due_date           date        not null,
  created_by         uuid        references auth.users(id),
  created_at         timestamptz default now() not null,
  is_active          boolean     default true not null,
  constraint dues_periods_chapter_name_unique unique (chapter_id, name)
);

-- dues_payments: one or more payment rows per member per period
-- (a $0 seed row is auto-inserted for every member when a period is created;
--  subsequent logs are additional rows — total paid = SUM(amount_paid))
create table if not exists public.dues_payments (
  id               uuid        default gen_random_uuid() primary key,
  dues_period_id   uuid        not null references public.dues_periods(id) on delete cascade,
  member_id        uuid        not null references auth.users(id) on delete cascade,
  amount_paid      integer     not null default 0, -- cents
  paid_at          timestamptz default now() not null,
  logged_by        uuid        references auth.users(id),
  notes            text
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.dues_periods  enable row level security;
alter table public.dues_payments enable row level security;

-- Helper: true when the current user has role admin or editor in their chapter
create or replace function public.is_dues_manager()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid()
      and role in ('admin', 'editor')
  );
$$;

-- dues_periods ─────────────────────────────────────────────────────────────

-- All chapter members can read their chapter's periods
create policy "dues_periods_select"
  on public.dues_periods for select
  using (chapter_id = public.get_my_chapter_id());

-- Only admin / officer can create periods
create policy "dues_periods_insert"
  on public.dues_periods for insert
  with check (
    chapter_id = public.get_my_chapter_id()
    and public.is_dues_manager()
  );

-- Only admin / officer can update periods
create policy "dues_periods_update"
  on public.dues_periods for update
  using (
    chapter_id = public.get_my_chapter_id()
    and public.is_dues_manager()
  );

-- Only admin / officer can delete periods
create policy "dues_periods_delete"
  on public.dues_periods for delete
  using (
    chapter_id = public.get_my_chapter_id()
    and public.is_dues_manager()
  );

-- dues_payments ────────────────────────────────────────────────────────────

-- All chapter members can read payments belonging to their chapter's periods
create policy "dues_payments_select"
  on public.dues_payments for select
  using (
    exists (
      select 1 from public.dues_periods dp
      where dp.id = dues_payments.dues_period_id
        and dp.chapter_id = public.get_my_chapter_id()
    )
  );

-- Only admin / officer can log payments
create policy "dues_payments_insert"
  on public.dues_payments for insert
  with check (
    public.is_dues_manager()
    and exists (
      select 1 from public.dues_periods dp
      where dp.id = dues_payments.dues_period_id
        and dp.chapter_id = public.get_my_chapter_id()
    )
  );

-- Only admin / officer can update payments
create policy "dues_payments_update"
  on public.dues_payments for update
  using (
    public.is_dues_manager()
    and exists (
      select 1 from public.dues_periods dp
      where dp.id = dues_payments.dues_period_id
        and dp.chapter_id = public.get_my_chapter_id()
    )
  );

-- Only admin / officer can delete payments
create policy "dues_payments_delete"
  on public.dues_payments for delete
  using (
    public.is_dues_manager()
    and exists (
      select 1 from public.dues_periods dp
      where dp.id = dues_payments.dues_period_id
        and dp.chapter_id = public.get_my_chapter_id()
    )
  );
