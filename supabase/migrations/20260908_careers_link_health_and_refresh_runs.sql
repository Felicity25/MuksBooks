-- Careers link verification metadata + daily refresh run logging.
-- Additive migration. Safe to run multiple times.

alter table public.career_jobs
  add column if not exists verification_status text;

alter table public.career_jobs
  add column if not exists last_successful_verification_at timestamptz;

alter table public.career_jobs
  add column if not exists verification_failure_count integer not null default 0;

alter table public.career_jobs
  add column if not exists last_verification_http_status integer;

alter table public.career_jobs
  add column if not exists last_verification_error text;

update public.career_jobs
set
  verification_status = coalesce(verification_status, 'UNVERIFIED'),
  verification_failure_count = coalesce(verification_failure_count, 0)
where verification_status is null
   or verification_failure_count is null;

create index if not exists idx_career_jobs_verification_status on public.career_jobs (verification_status);
create index if not exists idx_career_jobs_last_successful_verification_at on public.career_jobs (last_successful_verification_at);

create table if not exists public.career_refresh_runs (
  id text primary key,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null,
  mode text,
  sources_checked integer not null default 0,
  opportunities_scanned integer not null default 0,
  opportunities_created integer not null default 0,
  opportunities_updated integer not null default 0,
  opportunities_closed integer not null default 0,
  links_verified integer not null default 0,
  links_broken integer not null default 0,
  links_repaired integer not null default 0,
  duplicates_ignored integer not null default 0,
  failures integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_career_refresh_runs_started_at on public.career_refresh_runs (started_at desc);

alter table public.career_refresh_runs enable row level security;

drop policy if exists "Career refresh runs visible to authenticated users" on public.career_refresh_runs;
create policy "Career refresh runs visible to authenticated users"
  on public.career_refresh_runs
  for select
  to authenticated
  using (true);

revoke all on public.career_refresh_runs from anon;
grant select on public.career_refresh_runs to authenticated;
