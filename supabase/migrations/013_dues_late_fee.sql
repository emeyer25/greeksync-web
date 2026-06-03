-- Add optional late fee per dues period (stored in cents, default 0 = no late fee)
alter table public.dues_periods
  add column if not exists late_fee_cents integer not null default 0;
