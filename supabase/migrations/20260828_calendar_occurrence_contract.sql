-- The occurrence model introduced in 20260827 supersedes the weekly-template fields
-- created in 20260826. Keep any historical template data intact, but remove the two
-- obsolete constraints that otherwise reject canonical starts_at/ends_at inserts.
alter table public.calendar_events alter column start_time drop not null;
alter table public.calendar_events alter column end_time drop not null;