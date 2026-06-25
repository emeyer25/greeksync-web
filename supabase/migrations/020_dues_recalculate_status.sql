-- Compute the authoritative payment status for a member in a dues period.
-- Returns 'paid' | 'partial' | 'overdue' | 'unpaid'.
-- Called by the frontend after every payment insert or delete so the UI
-- always reflects DB-computed totals, not stale client state.
create or replace function public.recalculate_dues_status(
  p_member_id     uuid,
  p_dues_period_id uuid
)
returns text
language sql
security definer
stable
set search_path = public
as $$
  with period_data as (
    select
      dp.amount_per_member,
      dp.due_date,
      dp.late_fee_cents,
      case
        when now() > (dp.due_date::timestamp + interval '23:59:59')
          and dp.late_fee_cents > 0
        then dp.amount_per_member + dp.late_fee_cents
        else dp.amount_per_member
      end as effective_due
    from public.dues_periods dp
    where dp.id = p_dues_period_id
  ),
  payment_total as (
    select coalesce(sum(amount_paid), 0) as total_paid
    from public.dues_payments
    where dues_period_id = p_dues_period_id
      and member_id = p_member_id
  )
  select
    case
      when pt.total_paid >= pd.effective_due then 'paid'
      when now() > (pd.due_date::timestamp + interval '23:59:59') then 'overdue'
      when pt.total_paid > 0 then 'partial'
      else 'unpaid'
    end
  from period_data pd, payment_total pt
$$;
