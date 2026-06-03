-- Add granular permissions to members
-- Permissions are additive: a member has their role's defaults plus any extras granted

alter table public.members
  add column if not exists permissions text[] not null default '{}';

-- Comment documenting permission keys:
-- 'calendar_write' — can add / edit / delete events
-- 'rushees_write'  — can add / edit / delete rushees
-- 'members_write'  — can invite, add, delete members and change roles

-- Admins implicitly have all permissions regardless of this column.
-- Editors default to calendar_write + rushees_write (enforced in app).
-- Members default to none (enforced in app).
