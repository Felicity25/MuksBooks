-- Careers feature expansion: adds a career_area column (Actuarial | Banking | Technology),
-- fixes placeholder example.com seed job links to use real employer careers pages,
-- and adds Banking and Technology companies/jobs alongside the existing Actuarial data.
-- This migration is additive only; it does not alter any existing table, policy or trigger.

alter table public.career_jobs
  add column if not exists career_area text not null default 'Actuarial';

create index if not exists idx_career_jobs_area on public.career_jobs (career_area);

update public.career_jobs
set application_url = 'https://careers.mercer.com/', source_url = 'https://careers.mercer.com/', career_area = 'Actuarial'
where id = 'carjob_mercer_grad_actuarial';

update public.career_jobs
set application_url = 'https://careers.mercer.com/', source_url = 'https://careers.mercer.com/', career_area = 'Actuarial'
where id = 'carjob_mercer_investment_intern';

update public.career_jobs
set application_url = 'https://jobs.aon.com/', source_url = 'https://jobs.aon.com/', career_area = 'Actuarial'
where id = 'carjob_aon_risk_grad';

update public.career_jobs
set application_url = 'https://careers.qbe.com/', source_url = 'https://careers.qbe.com/', career_area = 'Actuarial'
where id = 'carjob_qbe_actuarial_intern';

update public.career_jobs
set application_url = 'https://apply.deloitte.com/careers', source_url = 'https://apply.deloitte.com/careers', career_area = 'Actuarial'
where id = 'carjob_deloitte_data_risk';

insert into public.career_companies (id, name, slug, official_careers_url, source_type, profile_created)
values
  ('carco_goldman_sachs', 'Goldman Sachs', 'goldman-sachs', 'https://www.goldmansachs.com/careers/', 'OFFICIAL', true),
  ('carco_jpmorgan', 'JPMorgan Chase', 'jpmorgan-chase', 'https://careers.jpmorgan.com/', 'OFFICIAL', true),
  ('carco_macquarie', 'Macquarie Group', 'macquarie-group', 'https://www.macquarie.com/careers', 'OFFICIAL', true),
  ('carco_cba', 'Commonwealth Bank', 'commonwealth-bank', 'https://www.commbank.com.au/about-us/careers.html', 'OFFICIAL', true),
  ('carco_morgan_stanley', 'Morgan Stanley', 'morgan-stanley', 'https://www.morganstanley.com/careers', 'OFFICIAL', true),
  ('carco_citi', 'Citi', 'citi', 'https://jobs.citi.com/', 'OFFICIAL', true),
  ('carco_google', 'Google', 'google', 'https://careers.google.com/', 'OFFICIAL', true),
  ('carco_microsoft', 'Microsoft', 'microsoft', 'https://careers.microsoft.com/', 'OFFICIAL', true),
  ('carco_amazon', 'Amazon', 'amazon', 'https://www.amazon.jobs/', 'OFFICIAL', true),
  ('carco_atlassian', 'Atlassian', 'atlassian', 'https://www.atlassian.com/company/careers', 'OFFICIAL', true),
  ('carco_canva', 'Canva', 'canva', 'https://www.canva.com/careers/', 'OFFICIAL', true),
  ('carco_accenture', 'Accenture', 'accenture', 'https://www.accenture.com/us-en/careers', 'OFFICIAL', true)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  official_careers_url = excluded.official_careers_url,
  source_type = excluded.source_type,
  profile_created = excluded.profile_created,
  updated_at = now();

insert into public.career_jobs (
  id, company_id, external_job_id, job_title, location, city, country, role_type, discipline, career_area,
  description, requirements, application_url, source_url, source_type, work_rights_information,
  international_student_information, date_found, last_verified, is_active
)
values
  (
    'carjob_gs_ib_grad', 'carco_goldman_sachs', 'goldman-sachs-investment-banking-analyst-graduate-program', 'Investment Banking Analyst Graduate Program',
    'Sydney, Australia', 'Sydney', 'Australia', 'Graduate', 'Investment Banking', 'Banking',
    'Investment Banking Analyst Graduate Program opportunity at Goldman Sachs.',
    'Finance, economics or quantitative degree, financial modelling, communication skills.',
    'https://www.goldmansachs.com/careers/', 'https://www.goldmansachs.com/careers/',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_jpm_cib_intern', 'carco_jpmorgan', 'jpmorgan-chase-corporate-investment-bank-summer-analyst', 'Corporate & Investment Bank Summer Analyst',
    'Melbourne, Australia', 'Melbourne', 'Australia', 'Internship', 'Investment Banking', 'Banking',
    'Corporate & Investment Bank Summer Analyst opportunity at JPMorgan Chase.',
    'Finance or business degree, Excel, stakeholder communication.',
    'https://careers.jpmorgan.com/', 'https://careers.jpmorgan.com/',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_macquarie_quant_grad', 'carco_macquarie', 'macquarie-group-quantitative-analyst-graduate-program', 'Quantitative Analyst Graduate Program',
    'Sydney, Australia', 'Sydney', 'Australia', 'Graduate', 'Quantitative', 'Banking',
    'Quantitative Analyst Graduate Program opportunity at Macquarie Group.',
    'Mathematics, statistics or actuarial degree, Python or R, analytical mindset.',
    'https://www.macquarie.com/careers', 'https://www.macquarie.com/careers',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_cba_retail_grad', 'carco_cba', 'commonwealth-bank-graduate-program-retail-banking', 'Graduate Program - Retail Banking',
    'Melbourne, Australia', 'Melbourne', 'Australia', 'Graduate', 'Banking', 'Banking',
    'Graduate Program - Retail Banking opportunity at Commonwealth Bank.',
    'Business, finance or commerce degree, communication and teamwork skills.',
    'https://www.commbank.com.au/about-us/careers.html', 'https://www.commbank.com.au/about-us/careers.html',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_ms_markets_intern', 'carco_morgan_stanley', 'morgan-stanley-markets-summer-analyst-program', 'Markets Summer Analyst Program',
    'London, United Kingdom', 'London', 'United Kingdom', 'Internship', 'Markets', 'Banking',
    'Markets Summer Analyst Program opportunity at Morgan Stanley.',
    'Finance, economics or quantitative degree, market awareness, communication skills.',
    'https://www.morganstanley.com/careers', 'https://www.morganstanley.com/careers',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_citi_treasury_analyst', 'carco_citi', 'citi-treasury-and-trade-solutions-analyst', 'Treasury and Trade Solutions Analyst',
    'International', null, 'International', 'Entry Level', 'Treasury', 'Banking',
    'Treasury and Trade Solutions Analyst opportunity at Citi.',
    'Finance or business degree, attention to detail, client communication.',
    'https://jobs.citi.com/', 'https://jobs.citi.com/',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_google_swe_grad', 'carco_google', 'google-software-engineering-graduate-program', 'Software Engineering Graduate Program',
    'Sydney, Australia', 'Sydney', 'Australia', 'Graduate', 'Software Engineering', 'Technology',
    'Software Engineering Graduate Program opportunity at Google.',
    'Computer science or related degree, coding proficiency, problem solving.',
    'https://careers.google.com/', 'https://careers.google.com/',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_msft_ds_intern', 'carco_microsoft', 'microsoft-data-scientist-internship', 'Data Scientist Internship',
    'Melbourne, Australia', 'Melbourne', 'Australia', 'Internship', 'Data Science', 'Technology',
    'Data Scientist Internship opportunity at Microsoft.',
    'Statistics, data science or computer science background, Python or R, SQL.',
    'https://careers.microsoft.com/', 'https://careers.microsoft.com/',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_amazon_sde_intern', 'carco_amazon', 'amazon-software-development-engineer-intern', 'Software Development Engineer Intern',
    'International', null, 'International', 'Internship', 'Software Engineering', 'Technology',
    'Software Development Engineer Intern opportunity at Amazon.',
    'Computer science or related degree, data structures and algorithms, coding proficiency.',
    'https://www.amazon.jobs/', 'https://www.amazon.jobs/',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_atlassian_swe_grad', 'carco_atlassian', 'atlassian-graduate-software-engineer', 'Graduate Software Engineer',
    'Sydney, Australia', 'Sydney', 'Australia', 'Graduate', 'Software Engineering', 'Technology',
    'Graduate Software Engineer opportunity at Atlassian.',
    'Computer science or related degree, coding proficiency, collaboration skills.',
    'https://www.atlassian.com/company/careers', 'https://www.atlassian.com/company/careers',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_canva_data_grad', 'carco_canva', 'canva-data-analytics-graduate-program', 'Data Analytics Graduate Program',
    'Sydney, Australia', 'Sydney', 'Australia', 'Graduate', 'Data Analytics', 'Technology',
    'Data Analytics Graduate Program opportunity at Canva.',
    'Data, statistics or computer science degree, SQL, communication skills.',
    'https://www.canva.com/careers/', 'https://www.canva.com/careers/',
    'SEED', 'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_accenture_tech_consulting_grad', 'carco_accenture', 'accenture-technology-consulting-analyst-graduate-program', 'Technology Consulting Analyst Graduate Program',
    'Melbourne, Australia', 'Melbourne', 'Australia', 'Graduate', 'Technology Consulting', 'Technology',
    'Technology Consulting Analyst Graduate Program opportunity at Accenture.',
    'Business, IT or engineering degree, client communication, problem solving.',
    'https://www.accenture.com/us-en/careers', 'https://www.accenture.com/us-en/careers',
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
  career_area = excluded.career_area,
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
where c.id in (
  'carco_goldman_sachs', 'carco_jpmorgan', 'carco_macquarie', 'carco_cba', 'carco_morgan_stanley', 'carco_citi',
  'carco_google', 'carco_microsoft', 'carco_amazon', 'carco_atlassian', 'carco_canva', 'carco_accenture'
)
on conflict (id) do update set
  status = excluded.status,
  last_checked_at = excluded.last_checked_at,
  last_successful_check_at = excluded.last_successful_check_at,
  error_message = excluded.error_message,
  total_openings = excluded.total_openings,
  updated_at = now();
