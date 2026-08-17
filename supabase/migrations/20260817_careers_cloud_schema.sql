create table if not exists public.career_companies (
  id text primary key,
  name text not null,
  slug text not null unique,
  official_careers_url text,
  source_type text,
  profile_created boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_jobs (
  id text primary key,
  company_id text not null references public.career_companies(id) on delete cascade,
  external_job_id text,
  job_title text not null,
  location text,
  city text,
  country text,
  role_type text,
  discipline text,
  description text,
  requirements text,
  opening_date timestamptz,
  closing_date timestamptz,
  closing_time text,
  application_url text,
  source_url text,
  source_type text,
  work_rights_information text,
  international_student_information text,
  date_found timestamptz,
  last_verified timestamptz,
  source_timezone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_company_checks (
  id text primary key,
  company_id text not null references public.career_companies(id) on delete cascade,
  status text not null,
  last_checked_at timestamptz,
  last_successful_check_at timestamptz,
  error_message text,
  total_openings integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_company_follows (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null references public.career_companies(id) on delete cascade,
  role_types jsonb not null default '[]'::jsonb,
  disciplines jsonb not null default '[]'::jsonb,
  countries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create table if not exists public.career_saved_jobs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null references public.career_jobs(id) on delete cascade,
  job_snapshot jsonb not null,
  date_saved timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table if not exists public.career_applications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text references public.career_companies(id) on delete set null,
  job_id text references public.career_jobs(id) on delete set null,
  job_snapshot jsonb not null,
  title text not null,
  stage text not null,
  outstanding_actions jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  notes text,
  applied_at_utc timestamptz,
  cv_document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_application_events (
  id text primary key,
  application_id text not null references public.career_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  title text not null,
  details text,
  event_time_utc timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.career_assessments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id text references public.career_applications(id) on delete set null,
  company_id text references public.career_companies(id) on delete set null,
  assessment_type text not null,
  title text not null,
  status text not null,
  invitation_received_at_utc timestamptz,
  deadline_rule_hours integer,
  deadline_at_utc timestamptz,
  deadline_date_only date,
  deadline_has_exact_time boolean not null default false,
  employer_deadline_label text,
  employer_timezone text,
  assessment_url text,
  notes text,
  completed_at_utc timestamptz,
  planner_task_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text,
  timezone_confirmed boolean not null default false,
  auto_add_deadlines_to_planner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_cv_documents (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_document_id text not null,
  label text,
  filename text,
  summary text,
  uploaded_at timestamptz,
  extracted_profile jsonb,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_document_id)
);

create table if not exists public.career_requirement_matches (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null references public.career_jobs(id) on delete cascade,
  cv_document_id text references public.career_cv_documents(id) on delete set null,
  source_document_id text not null,
  results_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id, source_document_id)
);

alter table public.tasks
  add column if not exists career_assessment_id text references public.career_assessments(id) on delete set null;

insert into public.career_companies (id, name, slug, official_careers_url, source_type, profile_created)
values
  ('carco_mercer', 'Mercer', 'mercer', 'https://careers.mercer.com/', 'OFFICIAL', true),
  ('carco_aon', 'Aon', 'aon', 'https://jobs.aon.com/', 'OFFICIAL', true),
  ('carco_qbe', 'QBE', 'qbe', 'https://careers.qbe.com/', 'OFFICIAL', true),
  ('carco_deloitte', 'Deloitte', 'deloitte', 'https://apply.deloitte.com/careers', 'OFFICIAL', true),
  ('carco_ey', 'EY', 'ey', 'https://careers.ey.com/', 'OFFICIAL', false),
  ('carco_kpmg', 'KPMG', 'kpmg', 'https://kpmg.com/careers', 'OFFICIAL', false),
  ('carco_pwc', 'PwC', 'pwc', 'https://www.pwc.com/gx/en/careers.html', 'OFFICIAL', false),
  ('carco_swissre', 'Swiss Re', 'swiss-re', 'https://careers.swissre.com/', 'OFFICIAL', false),
  ('carco_munichre', 'Munich Re', 'munich-re', 'https://www.munichre.com/en/company/careers.html', 'OFFICIAL', false),
  ('carco_allianz', 'Allianz', 'allianz', 'https://careers.allianz.com/', 'OFFICIAL', false),
  ('carco_tal', 'TAL', 'tal', 'https://www.tal.com.au/about-us/careers', 'OFFICIAL', false),
  ('carco_suncorp', 'Suncorp', 'suncorp', 'https://www.suncorpgroup.com.au/careers', 'OFFICIAL', false)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  official_careers_url = excluded.official_careers_url,
  source_type = excluded.source_type,
  profile_created = excluded.profile_created,
  updated_at = now();

insert into public.career_jobs (
  id, company_id, external_job_id, job_title, location, city, country, role_type, discipline,
  description, requirements, application_url, source_url, source_type, work_rights_information,
  international_student_information, date_found, last_verified, is_active
)
values
  (
    'carjob_mercer_grad_actuarial', 'carco_mercer', 'mercer-graduate-actuarial-analyst', 'Graduate Actuarial Analyst',
    'Melbourne, Australia', 'Melbourne', 'Australia', 'Graduate', 'Actuarial',
    'Graduate Actuarial Analyst opportunity at Mercer.',
    'Bachelor degree in Actuarial Science, Excel, R or Python, communication skills.',
    'https://example.com/apply/carjob_mercer_grad_actuarial', 'https://example.com/jobs/carjob_mercer_grad_actuarial',
    'SEED', 'Valid Australian work rights required', 'Not stated', now(), now(), true
  ),
  (
    'carjob_mercer_investment_intern', 'carco_mercer', 'mercer-investment-analyst-intern', 'Investment Analyst Intern',
    'Sydney, Australia', 'Sydney', 'Australia', 'Internship', 'Investments',
    'Investment Analyst Intern opportunity at Mercer.',
    'Finance or Actuarial degree, Excel, stakeholder communication.',
    'https://example.com/apply/carjob_mercer_investment_intern', 'https://example.com/jobs/carjob_mercer_investment_intern',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_aon_risk_grad', 'carco_aon', 'aon-risk-graduate-program', 'Risk Graduate Program',
    'Johannesburg, South Africa', 'Johannesburg', 'South Africa', 'Graduate', 'Risk',
    'Risk Graduate Program opportunity at Aon.',
    'Quantitative degree, analytics mindset, teamwork.',
    'https://example.com/apply/carjob_aon_risk_grad', 'https://example.com/jobs/carjob_aon_risk_grad',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_qbe_actuarial_intern', 'carco_qbe', 'qbe-actuarial-internship', 'Actuarial Internship',
    'London, United Kingdom', 'London', 'United Kingdom', 'Internship', 'Insurance',
    'Actuarial Internship opportunity at QBE.',
    'Actuarial studies, SQL preferred, presentation skills.',
    'https://example.com/apply/carjob_qbe_actuarial_intern', 'https://example.com/jobs/carjob_qbe_actuarial_intern',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_deloitte_data_risk', 'carco_deloitte', 'deloitte-data-risk-analyst', 'Data & Risk Analyst',
    'International', null, 'International', 'Entry Level', 'Data',
    'Data & Risk Analyst opportunity at Deloitte.',
    'Statistics or actuarial background, Python, communication.',
    'https://example.com/apply/carjob_deloitte_data_risk', 'https://example.com/jobs/carjob_deloitte_data_risk',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  )
on conflict (id) do update set
  company_id = excluded.company_id,
  external_job_id = excluded.external_job_id,
  job_title = excluded.job_title,
  location = excluded.location,
  city = excluded.city,
  country = excluded.country,
  role_type = excluded.role_type,
  discipline = excluded.discipline,
  description = excluded.description,
  requirements = excluded.requirements,
  application_url = excluded.application_url,
  source_url = excluded.source_url,
  source_type = excluded.source_type,
  work_rights_information = excluded.work_rights_information,
  international_student_information = excluded.international_student_information,
  date_found = excluded.date_found,
  last_verified = excluded.last_verified,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.career_company_checks (
  id, company_id, status, last_checked_at, last_successful_check_at, error_message, total_openings
)
select
  'carcheck_' || c.id,
  c.id,
  'HEALTHY',
  now(),
  now(),
  null,
  coalesce((select count(1) from public.career_jobs j where j.company_id = c.id and j.is_active = true), 0)
from public.career_companies c
on conflict (id) do update set
  status = excluded.status,
  last_checked_at = excluded.last_checked_at,
  last_successful_check_at = excluded.last_successful_check_at,
  error_message = excluded.error_message,
  total_openings = excluded.total_openings,
  updated_at = now();

create index if not exists idx_career_jobs_company on public.career_jobs (company_id);
create index if not exists idx_career_jobs_active on public.career_jobs (is_active);
create index if not exists idx_career_jobs_filters on public.career_jobs (country, role_type, discipline);
create index if not exists idx_tasks_user_planned on public.tasks (user_id, planned_date, due_date);
create unique index if not exists idx_tasks_career_assessment_unique on public.tasks (career_assessment_id) where career_assessment_id is not null;
create index if not exists idx_career_follows_user on public.career_company_follows (user_id, updated_at desc);
create index if not exists idx_career_saved_user on public.career_saved_jobs (user_id, date_saved desc);
create index if not exists idx_career_apps_user on public.career_applications (user_id, updated_at desc);
create index if not exists idx_career_events_app on public.career_application_events (application_id, event_time_utc asc);
create index if not exists idx_career_assess_user on public.career_assessments (user_id, deadline_at_utc asc);
create unique index if not exists idx_career_assess_planner_task on public.career_assessments (planner_task_id) where planner_task_id is not null;
create index if not exists idx_career_cv_user on public.career_cv_documents (user_id, updated_at desc);
create index if not exists idx_career_matches_user on public.career_requirement_matches (user_id, updated_at desc);

create trigger set_career_companies_updated_at
before update on public.career_companies
for each row execute procedure public.update_updated_at_column();

create trigger set_career_jobs_updated_at
before update on public.career_jobs
for each row execute procedure public.update_updated_at_column();

create trigger set_career_company_checks_updated_at
before update on public.career_company_checks
for each row execute procedure public.update_updated_at_column();

create trigger set_career_company_follows_updated_at
before update on public.career_company_follows
for each row execute procedure public.update_updated_at_column();

create trigger set_career_saved_jobs_updated_at
before update on public.career_saved_jobs
for each row execute procedure public.update_updated_at_column();

create trigger set_career_applications_updated_at
before update on public.career_applications
for each row execute procedure public.update_updated_at_column();

create trigger set_career_assessments_updated_at
before update on public.career_assessments
for each row execute procedure public.update_updated_at_column();

create trigger set_career_settings_updated_at
before update on public.career_settings
for each row execute procedure public.update_updated_at_column();

create trigger set_career_cv_documents_updated_at
before update on public.career_cv_documents
for each row execute procedure public.update_updated_at_column();

create trigger set_career_requirement_matches_updated_at
before update on public.career_requirement_matches
for each row execute procedure public.update_updated_at_column();

alter table public.career_companies enable row level security;
alter table public.career_jobs enable row level security;
alter table public.career_company_checks enable row level security;
alter table public.career_company_follows enable row level security;
alter table public.career_saved_jobs enable row level security;
alter table public.career_applications enable row level security;
alter table public.career_application_events enable row level security;
alter table public.career_assessments enable row level security;
alter table public.career_settings enable row level security;
alter table public.career_cv_documents enable row level security;
alter table public.career_requirement_matches enable row level security;

drop policy if exists "Career companies readable by all authenticated users" on public.career_companies;
create policy "Career companies readable by all authenticated users"
on public.career_companies for select
using (true);

drop policy if exists "Career jobs readable by all authenticated users" on public.career_jobs;
create policy "Career jobs readable by all authenticated users"
on public.career_jobs for select
using (true);

drop policy if exists "Career checks readable by all authenticated users" on public.career_company_checks;
create policy "Career checks readable by all authenticated users"
on public.career_company_checks for select
using (true);

drop policy if exists "Career follows are viewable by owner" on public.career_company_follows;
create policy "Career follows are viewable by owner"
on public.career_company_follows for select
using (auth.uid() = user_id);

drop policy if exists "Career follows can be modified by owner" on public.career_company_follows;
create policy "Career follows can be modified by owner"
on public.career_company_follows for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Career saved jobs are viewable by owner" on public.career_saved_jobs;
create policy "Career saved jobs are viewable by owner"
on public.career_saved_jobs for select
using (auth.uid() = user_id);

drop policy if exists "Career saved jobs can be modified by owner" on public.career_saved_jobs;
create policy "Career saved jobs can be modified by owner"
on public.career_saved_jobs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Career applications are viewable by owner" on public.career_applications;
create policy "Career applications are viewable by owner"
on public.career_applications for select
using (auth.uid() = user_id);

drop policy if exists "Career applications can be modified by owner" on public.career_applications;
create policy "Career applications can be modified by owner"
on public.career_applications for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Career application events are viewable by owner" on public.career_application_events;
create policy "Career application events are viewable by owner"
on public.career_application_events for select
using (auth.uid() = user_id);

drop policy if exists "Career application events can be modified by owner" on public.career_application_events;
create policy "Career application events can be modified by owner"
on public.career_application_events for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Career assessments are viewable by owner" on public.career_assessments;
create policy "Career assessments are viewable by owner"
on public.career_assessments for select
using (auth.uid() = user_id);

drop policy if exists "Career assessments can be modified by owner" on public.career_assessments;
create policy "Career assessments can be modified by owner"
on public.career_assessments for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Career settings are viewable by owner" on public.career_settings;
create policy "Career settings are viewable by owner"
on public.career_settings for select
using (auth.uid() = user_id);

drop policy if exists "Career settings can be modified by owner" on public.career_settings;
create policy "Career settings can be modified by owner"
on public.career_settings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Career CV documents are viewable by owner" on public.career_cv_documents;
create policy "Career CV documents are viewable by owner"
on public.career_cv_documents for select
using (auth.uid() = user_id);

drop policy if exists "Career CV documents can be modified by owner" on public.career_cv_documents;
create policy "Career CV documents can be modified by owner"
on public.career_cv_documents for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Career requirement matches are viewable by owner" on public.career_requirement_matches;
create policy "Career requirement matches are viewable by owner"
on public.career_requirement_matches for select
using (auth.uid() = user_id);

drop policy if exists "Career requirement matches can be modified by owner" on public.career_requirement_matches;
create policy "Career requirement matches can be modified by owner"
on public.career_requirement_matches for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
