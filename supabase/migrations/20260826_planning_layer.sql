-- PART E: Real academic planning layer
-- 1. Tag uploads with an explicit domain ('academic' | 'career' | 'personal' | 'other') and a
--    direct unit_id FK so the Planner can reliably tell curriculum material apart from career
--    documents (CVs, cover letters) without guessing from filenames.
-- 2. Add a calendar_events table to store imported .ics timetable entries (lectures, tutorials,
--    workshops, seminars) so the Planner knows WHEN a student's classes actually happen.

alter table public.uploads add column if not exists domain text not null default 'academic';
alter table public.uploads add column if not exists unit_id uuid references public.units(id) on delete set null;

-- Backfill: any upload already tagged as a CV was a career document, even though the domain
-- column didn't exist yet when it was ingested.
update public.uploads set domain = 'career' where document_type = 'CV' and domain = 'academic';

create index if not exists idx_uploads_domain  on public.uploads (domain);
create index if not exists idx_uploads_unit_id on public.uploads (unit_id);

create table if not exists public.calendar_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  unit_id        uuid references public.units(id) on delete cascade,
  title          text not null,
  event_type     text not null default 'Class', -- Lecture | Tutorial | Workshop | Seminar | Practical | Class
  day_of_week    integer,                        -- 0 (Sunday) - 6 (Saturday); used for weekly-recurring class times
  specific_date  date,                            -- used for one-off events instead of a recurring day
  start_time     text not null,                   -- 'HH:MM' 24h, local timezone (Australia/Melbourne)
  end_time       text not null,
  location       text,
  recurrence     text not null default 'weekly',  -- 'weekly' | 'once'
  source         text not null default 'ics_import',
  source_uid     text,                            -- ICS UID, used to dedupe re-imports
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

create policy "calendar_events_owner_all"
  on public.calendar_events
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_calendar_events_user   on public.calendar_events (user_id);
create index if not exists idx_calendar_events_unit   on public.calendar_events (unit_id);
create index if not exists idx_calendar_events_source on public.calendar_events (user_id, source);
create index if not exists idx_calendar_events_source_uid on public.calendar_events (user_id, source_uid) where source_uid is not null;
