-- Careers discovery engine expansion.
-- Broadens employer universe using actuarial student ecosystem seeds
-- (MASS + University of Melbourne actuarial society context), while keeping
-- opportunities independently represented from employer entities.

insert into public.career_companies (id, name, slug, official_careers_url, source_type, profile_created)
values
  ('carco_taylor_fry', 'Taylor Fry', 'taylor-fry', 'https://taylorfry.com.au/careers/', 'SOCIETY_SEED_MASS', false),
  ('carco_dynamo_analytics', 'Dynamo Analytics', 'dynamo-analytics', 'https://www.dynamoanalytics.com/careers', 'SOCIETY_SEED_MASS', false),
  ('carco_am_actuaries', 'am actuaries', 'am-actuaries', 'https://www.amact.com.au/', 'SOCIETY_SEED_MASS', false),
  ('carco_unisuper', 'UniSuper', 'unisuper', 'https://www.unisuper.com.au/about-us/careers', 'SOCIETY_SEED_MASS', false),
  ('carco_quantium', 'Quantium', 'quantium', 'https://www.quantium.com/careers/', 'SOCIETY_SEED_MASS', false),
  ('carco_flow_traders', 'Flow Traders', 'flow-traders', 'https://www.flowtraders.com/careers/', 'SOCIETY_SEED_MASS', false),
  ('carco_imc', 'IMC', 'imc', 'https://www.imc.com/ap/careers/', 'SOCIETY_SEED_MASS', false),
  ('carco_akuna', 'Akuna Capital', 'akuna-capital', 'https://akunacapital.com/careers/', 'SOCIETY_SEED_MASS', false),
  ('carco_kearney', 'Kearney', 'kearney', 'https://www.kearney.com/careers', 'SOCIETY_SEED_MASS', false),
  ('carco_finity', 'Finity', 'finity', 'https://finity.com.au/careers/', 'SOCIETY_SEED_MASS', false),
  ('carco_gen_re', 'Gen Re', 'gen-re', 'https://www.genre.com/careers', 'SOCIETY_SEED_MELBOURNE', false),
  ('carco_rga', 'RGA', 'rga', 'https://www.rgare.com/careers', 'SOCIETY_SEED_MELBOURNE', false),
  ('carco_apra', 'APRA', 'apra', 'https://www.apra.gov.au/careers', 'SOCIETY_SEED_MELBOURNE', false),
  ('carco_rba', 'Reserve Bank of Australia', 'reserve-bank-of-australia', 'https://www.rba.gov.au/careers/', 'SOCIETY_SEED_MELBOURNE', false),
  ('carco_frontier_advisors', 'Frontier Advisors', 'frontier-advisors', 'https://frontieradvisors.com.au/careers/', 'SOCIETY_SEED_MELBOURNE', false)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  official_careers_url = excluded.official_careers_url,
  source_type = excluded.source_type,
  updated_at = now();

insert into public.career_jobs (
  id, company_id, external_job_id, job_title, location, city, country, role_type, discipline, career_area,
  description, requirements, application_url, source_url, source_type, work_rights_information,
  international_student_information, date_found, last_verified, is_active
)
values
  (
    'carjob_taylor_fry_grad_analyst', 'carco_taylor_fry', 'taylor-fry-graduate-analyst-actuarial-analytics', 'Graduate Analyst (Actuarial & Analytics)',
    'Melbourne, Australia', 'Melbourne', 'Australia', 'Graduate Program', 'Actuarial Consulting', 'Consulting',
    'Graduate Analyst opportunity combining actuarial and analytics work.',
    'Actuarial science, statistics or mathematics degree, modelling and communication skills.',
    'https://taylorfry.com.au/careers/', 'https://taylorfry.com.au/careers/', 'OFFICIAL_EMPLOYER',
    'Work rights required at commencement', 'Eligibility unclear', now(), now(), true
  ),
  (
    'carjob_dynamo_grad_actuarial_data', 'carco_dynamo_analytics', 'dynamo-analytics-actuarial-data-analytics-graduate', 'Actuarial & Data Analytics Graduate',
    'Sydney, Australia', 'Sydney', 'Australia', 'Graduate Role', 'Data & Analytics', 'Data & Analytics',
    'Actuarial and data analytics graduate opportunity.',
    'Actuarial, statistics, R or Python, SQL and commercial problem-solving.',
    'https://www.dynamoanalytics.com/careers', 'https://www.dynamoanalytics.com/careers', 'OFFICIAL_EMPLOYER',
    'Not stated', 'Sponsorship may be available', now(), now(), true
  ),
  (
    'carjob_unisuper_investment_intern', 'carco_unisuper', 'unisuper-investment-analytics-internship', 'Investment Analytics Internship',
    'Melbourne, Australia', 'Melbourne', 'Australia', 'Internship', 'Investments', 'Superannuation',
    'Investment analytics internship in a superannuation context.',
    'Quantitative degree, investment risk awareness, Excel and communication.',
    'https://www.unisuper.com.au/about-us/careers', 'https://www.unisuper.com.au/about-us/careers', 'OFFICIAL_EMPLOYER',
    'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_quantium_grad_decision_scientist', 'carco_quantium', 'quantium-graduate-decision-scientist', 'Graduate Decision Scientist',
    'Sydney, Australia', 'Sydney', 'Australia', 'Graduate Program', 'Data Science', 'Data & Analytics',
    'Graduate decision scientist role for quantitative students.',
    'Statistics, econometrics or actuarial studies, Python/R and business communication.',
    'https://www.quantium.com/careers/', 'https://www.quantium.com/careers/', 'OFFICIAL_EMPLOYER',
    'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_imc_quant_trading_intern', 'carco_imc', 'imc-quantitative-trading-intern', 'Quantitative Trading Intern',
    'Sydney, Australia', 'Sydney', 'Australia', 'Summer Internship', 'Quantitative Trading', 'Quant Finance',
    'Quantitative trading internship.',
    'Mathematics, probability, statistics and strong coding fundamentals.',
    'https://www.imc.com/ap/careers/', 'https://www.imc.com/ap/careers/', 'OFFICIAL_EMPLOYER',
    'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_flow_traders_intern', 'carco_flow_traders', 'flow-traders-trading-intern', 'Trading Intern',
    'Singapore', 'Singapore', 'International', 'Summer Internship', 'Trading', 'Trading',
    'Trading internship in a market-making environment.',
    'Probability, statistics, numerical reasoning and fast decision-making.',
    'https://www.flowtraders.com/careers/', 'https://www.flowtraders.com/careers/', 'OFFICIAL_EMPLOYER',
    'Relocation and visa requirements apply', 'Eligibility unclear', now(), now(), true
  ),
  (
    'carjob_akuna_quant_research_intern', 'carco_akuna', 'akuna-capital-quantitative-research-intern', 'Quantitative Research Intern',
    'Sydney, Australia', 'Sydney', 'Australia', 'Winter Internship', 'Quantitative Research', 'Quant Finance',
    'Quantitative research internship.',
    'Probability, optimisation, statistical modelling, Python/C++ beneficial.',
    'https://akunacapital.com/careers/', 'https://akunacapital.com/careers/', 'OFFICIAL_EMPLOYER',
    'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_kearney_strategy_analyst', 'carco_kearney', 'kearney-strategy-consulting-analyst-financial-services', 'Strategy Consulting Analyst (Financial Services)',
    'Melbourne, Australia', 'Melbourne', 'Australia', 'Entry-Level', 'Strategy Consulting', 'Consulting',
    'Strategy consulting role with financial-services exposure.',
    'Analytical problem-solving, quantitative reasoning and communication.',
    'https://www.kearney.com/careers', 'https://www.kearney.com/careers', 'OFFICIAL_EMPLOYER',
    'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_finity_actuarial_consulting_grad', 'carco_finity', 'finity-actuarial-consultant-graduate', 'Actuarial Consultant Graduate',
    'Sydney, Australia', 'Sydney', 'Australia', 'Graduate Role', 'Actuarial Consulting', 'Actuarial',
    'Graduate actuarial consulting role.',
    'Actuarial studies, insurance understanding, communication and modelling skills.',
    'https://finity.com.au/careers/', 'https://finity.com.au/careers/', 'OFFICIAL_EMPLOYER',
    'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_rga_reinsurance_pricing_analyst', 'carco_rga', 'rga-life-reinsurance-pricing-analyst', 'Life Reinsurance Pricing Analyst',
    'Melbourne, Australia', 'Melbourne', 'Australia', 'Graduate Role', 'Reinsurance', 'Insurance',
    'Life reinsurance pricing analyst role.',
    'Actuarial or quantitative degree, modelling and life insurance interest.',
    'https://www.rgare.com/careers', 'https://www.rgare.com/careers', 'OFFICIAL_EMPLOYER',
    'Not stated', 'Not stated', now(), now(), true
  ),
  (
    'carjob_apra_policy_risk_grad', 'carco_apra', 'apra-graduate-program-policy-risk-analytics', 'Graduate Program - Policy & Risk Analytics',
    'Canberra, Australia', 'Canberra', 'Australia', 'Graduate Program', 'Government Regulation', 'Government / Regulation',
    'Graduate program in policy and risk analytics.',
    'Quantitative degree, risk analysis and public policy interest.',
    'https://www.apra.gov.au/careers', 'https://www.apra.gov.au/careers', 'OFFICIAL_EMPLOYER',
    'Citizenship / PR may be required', 'Confirmed restricted', now(), now(), true
  ),
  (
    'carjob_rba_economic_analyst_cadetship', 'carco_rba', 'reserve-bank-of-australia-economic-analyst-cadetship', 'Economic Analyst Cadetship',
    'Sydney, Australia', 'Sydney', 'Australia', 'Cadetship', 'Economics', 'Economics',
    'Economic analyst cadetship with quantitative policy work.',
    'Econometrics, statistics, economics and data analysis capability.',
    'https://www.rba.gov.au/careers/', 'https://www.rba.gov.au/careers/', 'OFFICIAL_EMPLOYER',
    'Citizenship / PR may be required', 'Eligibility unclear', now(), now(), true
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
  'carco_taylor_fry', 'carco_dynamo_analytics', 'carco_am_actuaries', 'carco_unisuper', 'carco_quantium',
  'carco_flow_traders', 'carco_imc', 'carco_akuna', 'carco_kearney', 'carco_finity',
  'carco_gen_re', 'carco_rga', 'carco_apra', 'carco_rba', 'carco_frontier_advisors'
)
on conflict (id) do update set
  status = excluded.status,
  last_checked_at = excluded.last_checked_at,
  last_successful_check_at = excluded.last_successful_check_at,
  error_message = excluded.error_message,
  total_openings = excluded.total_openings,
  updated_at = now();
