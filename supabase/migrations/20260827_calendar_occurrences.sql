alter table public.calendar_events add column if not exists recurrence_id text;
alter table public.calendar_events add column if not exists description text;
alter table public.calendar_events add column if not exists starts_at timestamptz;
alter table public.calendar_events add column if not exists ends_at timestamptz;
alter table public.calendar_events add column if not exists timezone text;
alter table public.calendar_events add column if not exists unit_code text;
alter table public.calendar_events add column if not exists activity_type text;
alter table public.calendar_events add column if not exists is_assessment boolean not null default false;

drop index if exists public.idx_calendar_events_source_uid;
create unique index if not exists idx_calendar_events_occurrence
  on public.calendar_events (user_id, source_uid, starts_at)
  where source_uid is not null and starts_at is not null;
create index if not exists idx_calendar_events_user_start on public.calendar_events (user_id, starts_at);

alter table public.unit_schedule_entries add column if not exists period_kind text not null default 'week';
alter table public.unit_schedule_entries add column if not exists period_label text;
alter table public.unit_schedule_entries add column if not exists activities jsonb not null default '[]';
alter table public.unit_schedule_entries add column if not exists assessment_references jsonb not null default '[]';
alter table public.unit_schedule_entries add column if not exists parser text;
alter table public.unit_schedule_entries add column if not exists original_values jsonb;
alter table public.unit_schedule_entries add column if not exists was_edited boolean not null default false;