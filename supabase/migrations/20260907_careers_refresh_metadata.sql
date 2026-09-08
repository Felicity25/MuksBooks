-- Careers refresh metadata and admin deactivation support.
-- Additive migration to preserve existing data.

alter table public.career_jobs
  add column if not exists first_seen_at timestamptz;

alter table public.career_jobs
  add column if not exists last_seen_at timestamptz;

alter table public.career_jobs
  add column if not exists inactive_reason text;

alter table public.career_jobs
  add column if not exists admin_removed boolean not null default false;

update public.career_jobs
set
  first_seen_at = coalesce(first_seen_at, date_found, created_at),
  last_seen_at = coalesce(last_seen_at, last_verified, date_found, created_at)
where first_seen_at is null or last_seen_at is null;

create index if not exists idx_career_jobs_first_seen on public.career_jobs (first_seen_at);
create index if not exists idx_career_jobs_last_seen on public.career_jobs (last_seen_at);
create index if not exists idx_career_jobs_admin_removed on public.career_jobs (admin_removed);
