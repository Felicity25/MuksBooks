alter table public.uploads add column if not exists academic_mode text;
alter table public.uploads add column if not exists container_kind text;
alter table public.uploads add column if not exists container_id text;
alter table public.uploads add column if not exists subject_id text;

alter table public.uploads drop constraint if exists uploads_academic_mode_check;
alter table public.uploads add constraint uploads_academic_mode_check
  check (academic_mode is null or academic_mode in ('LEARNER', 'UNIVERSITY'));

alter table public.uploads drop constraint if exists uploads_container_kind_check;
alter table public.uploads add constraint uploads_container_kind_check
  check (container_kind is null or container_kind in ('SUBJECT', 'UNIT'));

create index if not exists idx_uploads_user_subject
  on public.uploads (user_id, subject_id, created_at desc)
  where subject_id is not null;

comment on column public.uploads.subject_id is
  'Stable learner-profile subject ID. The subject remains account-owned in user_settings.learner_profile.';