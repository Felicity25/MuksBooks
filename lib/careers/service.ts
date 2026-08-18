import crypto from 'crypto'
import { getDb, nowIso } from '@/lib/app-state/db'
import { ensureUser } from '@/lib/app-state/service'
import {
  resolveJobApplicationUrl,
  getActuarialCareerFit,
  inferCareerFamilies,
  matchesFilterValue,
  getOpportunityStatus,
  isHiddenGemCompany
} from '@/lib/careers/opportunity-utils'

export type CareerStage =
  | 'Interested'
  | 'Preparing'
  | 'Ready to Apply'
  | 'Applied'
  | 'Online Assessment'
  | 'Video Interview'
  | 'Phone Interview'
  | 'Interview'
  | 'Assessment Centre'
  | 'Final Interview'
  | 'Offer'
  | 'Accepted'
  | 'Rejected'
  | 'Withdrawn'
  | 'Closed'

const DEFAULT_TIMEZONE = 'Australia/Melbourne'

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

function toJson(value: unknown) {
  return JSON.stringify(value ?? null)
}

function fromJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizeArray(values?: string[] | null) {
  return (values || []).map((value) => value.trim()).filter(Boolean)
}

function normalizeText(value?: string | null) {
  return (value || '').trim().toLowerCase()
}

function matchesPreference(jobValue: string | null | undefined, selected: string[]) {
  if (!selected.length) return true
  const job = normalizeText(jobValue)
  if (!job) return false
  return selected.some((item) => job.includes(normalizeText(item)))
}

function normalizeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const ACTUARIAL_COMPANIES = [
  { name: 'Mercer', official_careers_url: 'https://careers.mercer.com/' },
  { name: 'Aon', official_careers_url: 'https://jobs.aon.com/' },
  { name: 'QBE', official_careers_url: 'https://careers.qbe.com/' },
  { name: 'Deloitte', official_careers_url: 'https://apply.deloitte.com/careers' },
  { name: 'EY', official_careers_url: 'https://careers.ey.com/' },
  { name: 'KPMG', official_careers_url: 'https://kpmg.com/careers' },
  { name: 'PwC', official_careers_url: 'https://www.pwc.com/gx/en/careers.html' },
  { name: 'Swiss Re', official_careers_url: 'https://careers.swissre.com/' },
  { name: 'Munich Re', official_careers_url: 'https://www.munichre.com/en/company/careers.html' },
  { name: 'Allianz', official_careers_url: 'https://careers.allianz.com/' },
  { name: 'TAL', official_careers_url: 'https://www.tal.com.au/about-us/careers' },
  { name: 'Suncorp', official_careers_url: 'https://www.suncorpgroup.com.au/careers' }
]

const BANKING_COMPANIES = [
  { name: 'Goldman Sachs', official_careers_url: 'https://www.goldmansachs.com/careers/' },
  { name: 'JPMorgan Chase', official_careers_url: 'https://careers.jpmorgan.com/' },
  { name: 'Macquarie Group', official_careers_url: 'https://www.macquarie.com/careers' },
  { name: 'Commonwealth Bank', official_careers_url: 'https://www.commbank.com.au/about-us/careers.html' },
  { name: 'Morgan Stanley', official_careers_url: 'https://www.morganstanley.com/careers' },
  { name: 'Citi', official_careers_url: 'https://jobs.citi.com/' }
]

const TECHNOLOGY_COMPANIES = [
  { name: 'Google', official_careers_url: 'https://careers.google.com/' },
  { name: 'Microsoft', official_careers_url: 'https://careers.microsoft.com/' },
  { name: 'Amazon', official_careers_url: 'https://www.amazon.jobs/' },
  { name: 'Atlassian', official_careers_url: 'https://www.atlassian.com/company/careers' },
  { name: 'Canva', official_careers_url: 'https://www.canva.com/careers/' },
  { name: 'Accenture', official_careers_url: 'https://www.accenture.com/us-en/careers' }
]

const EXPANDED_ECOSYSTEM_COMPANIES = [
  { name: 'Taylor Fry', official_careers_url: 'https://taylorfry.com.au/careers/', source_type: 'SOCIETY_SEED_MASS' },
  { name: 'Dynamo Analytics', official_careers_url: 'https://www.dynamoanalytics.com/careers', source_type: 'SOCIETY_SEED_MASS' },
  { name: 'am actuaries', official_careers_url: 'https://www.amact.com.au/', source_type: 'SOCIETY_SEED_MASS' },
  { name: 'UniSuper', official_careers_url: 'https://www.unisuper.com.au/about-us/careers', source_type: 'SOCIETY_SEED_MASS' },
  { name: 'Quantium', official_careers_url: 'https://www.quantium.com/careers/', source_type: 'SOCIETY_SEED_MASS' },
  { name: 'Flow Traders', official_careers_url: 'https://www.flowtraders.com/careers/', source_type: 'SOCIETY_SEED_MASS' },
  { name: 'IMC', official_careers_url: 'https://www.imc.com/ap/careers/', source_type: 'SOCIETY_SEED_MASS' },
  { name: 'Akuna Capital', official_careers_url: 'https://akunacapital.com/careers/', source_type: 'SOCIETY_SEED_MASS' },
  { name: 'Kearney', official_careers_url: 'https://www.kearney.com/careers', source_type: 'SOCIETY_SEED_MASS' },
  { name: 'Finity', official_careers_url: 'https://finity.com.au/careers/', source_type: 'SOCIETY_SEED_MASS' },
  { name: 'Gen Re', official_careers_url: 'https://www.genre.com/careers', source_type: 'SOCIETY_SEED_MELBOURNE' },
  { name: 'RGA', official_careers_url: 'https://www.rgare.com/careers', source_type: 'SOCIETY_SEED_MELBOURNE' },
  { name: 'APRA', official_careers_url: 'https://www.apra.gov.au/careers', source_type: 'SOCIETY_SEED_MELBOURNE' },
  { name: 'Reserve Bank of Australia', official_careers_url: 'https://www.rba.gov.au/careers/', source_type: 'SOCIETY_SEED_MELBOURNE' },
  { name: 'Frontier Advisors', official_careers_url: 'https://frontieradvisors.com.au/careers/', source_type: 'SOCIETY_SEED_MELBOURNE' }
]

const ACTUARIAL_JOBS = [
  {
    company: 'Mercer',
    title: 'Graduate Actuarial Analyst',
    location: 'Melbourne, Australia',
    city: 'Melbourne',
    country: 'Australia',
    role_type: 'Graduate',
    discipline: 'Actuarial',
    careerArea: 'Actuarial',
    requirements: 'Bachelor degree in Actuarial Science, Excel, R or Python, communication skills.',
    work_rights_information: 'Valid Australian work rights required',
    international_student_information: 'Not stated'
  },
  {
    company: 'Mercer',
    title: 'Investment Analyst Intern',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Internship',
    discipline: 'Investments',
    careerArea: 'Actuarial',
    requirements: 'Finance or Actuarial degree, Excel, stakeholder communication.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Aon',
    title: 'Risk Graduate Program',
    location: 'Johannesburg, South Africa',
    city: 'Johannesburg',
    country: 'South Africa',
    role_type: 'Graduate',
    discipline: 'Risk',
    careerArea: 'Actuarial',
    requirements: 'Quantitative degree, analytics mindset, teamwork.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'QBE',
    title: 'Actuarial Internship',
    location: 'London, United Kingdom',
    city: 'London',
    country: 'United Kingdom',
    role_type: 'Internship',
    discipline: 'Insurance',
    careerArea: 'Actuarial',
    requirements: 'Actuarial studies, SQL preferred, presentation skills.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Deloitte',
    title: 'Data & Risk Analyst',
    location: 'International',
    city: null,
    country: 'International',
    role_type: 'Entry Level',
    discipline: 'Data',
    careerArea: 'Actuarial',
    requirements: 'Statistics or actuarial background, Python, communication.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  }
]

const BANKING_JOBS = [
  {
    company: 'Goldman Sachs',
    title: 'Investment Banking Analyst Graduate Program',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Graduate',
    discipline: 'Investment Banking',
    careerArea: 'Banking',
    requirements: 'Finance, economics or quantitative degree, financial modelling, communication skills.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'JPMorgan Chase',
    title: 'Corporate & Investment Bank Summer Analyst',
    location: 'Melbourne, Australia',
    city: 'Melbourne',
    country: 'Australia',
    role_type: 'Internship',
    discipline: 'Investment Banking',
    careerArea: 'Banking',
    requirements: 'Finance or business degree, Excel, stakeholder communication.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Macquarie Group',
    title: 'Quantitative Analyst Graduate Program',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Graduate',
    discipline: 'Quantitative',
    careerArea: 'Banking',
    requirements: 'Mathematics, statistics or actuarial degree, Python or R, analytical mindset.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Commonwealth Bank',
    title: 'Graduate Program - Retail Banking',
    location: 'Melbourne, Australia',
    city: 'Melbourne',
    country: 'Australia',
    role_type: 'Graduate',
    discipline: 'Banking',
    careerArea: 'Banking',
    requirements: 'Business, finance or commerce degree, communication and teamwork skills.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Morgan Stanley',
    title: 'Markets Summer Analyst Program',
    location: 'London, United Kingdom',
    city: 'London',
    country: 'United Kingdom',
    role_type: 'Internship',
    discipline: 'Markets',
    careerArea: 'Banking',
    requirements: 'Finance, economics or quantitative degree, market awareness, communication skills.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Citi',
    title: 'Treasury and Trade Solutions Analyst',
    location: 'International',
    city: null,
    country: 'International',
    role_type: 'Entry Level',
    discipline: 'Treasury',
    careerArea: 'Banking',
    requirements: 'Finance or business degree, attention to detail, client communication.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  }
]

const TECHNOLOGY_JOBS = [
  {
    company: 'Google',
    title: 'Software Engineering Graduate Program',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Graduate',
    discipline: 'Software Engineering',
    careerArea: 'Technology',
    requirements: 'Computer science or related degree, coding proficiency, problem solving.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Microsoft',
    title: 'Data Scientist Internship',
    location: 'Melbourne, Australia',
    city: 'Melbourne',
    country: 'Australia',
    role_type: 'Internship',
    discipline: 'Data Science',
    careerArea: 'Technology',
    requirements: 'Statistics, data science or computer science background, Python or R, SQL.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Amazon',
    title: 'Software Development Engineer Intern',
    location: 'International',
    city: null,
    country: 'International',
    role_type: 'Internship',
    discipline: 'Software Engineering',
    careerArea: 'Technology',
    requirements: 'Computer science or related degree, data structures and algorithms, coding proficiency.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Atlassian',
    title: 'Graduate Software Engineer',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Graduate',
    discipline: 'Software Engineering',
    careerArea: 'Technology',
    requirements: 'Computer science or related degree, coding proficiency, collaboration skills.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Canva',
    title: 'Data Analytics Graduate Program',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Graduate',
    discipline: 'Data Analytics',
    careerArea: 'Technology',
    requirements: 'Data, statistics or computer science degree, SQL, communication skills.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Accenture',
    title: 'Technology Consulting Analyst Graduate Program',
    location: 'Melbourne, Australia',
    city: 'Melbourne',
    country: 'Australia',
    role_type: 'Graduate',
    discipline: 'Technology Consulting',
    careerArea: 'Technology',
    requirements: 'Business, IT or engineering degree, client communication, problem solving.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  }
]

const EXPANDED_ECOSYSTEM_JOBS = [
  {
    company: 'Taylor Fry',
    title: 'Graduate Analyst (Actuarial & Analytics)',
    location: 'Melbourne, Australia',
    city: 'Melbourne',
    country: 'Australia',
    role_type: 'Graduate Program',
    discipline: 'Actuarial Consulting',
    careerArea: 'Consulting',
    requirements: 'Actuarial science, statistics or mathematics degree, modelling and communication skills.',
    work_rights_information: 'Work rights required at commencement',
    international_student_information: 'Eligibility unclear - check employer details'
  },
  {
    company: 'Dynamo Analytics',
    title: 'Actuarial & Data Analytics Graduate',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Graduate Role',
    discipline: 'Data & Analytics',
    careerArea: 'Data & Analytics',
    requirements: 'Actuarial, statistics, R or Python, SQL and commercial problem-solving.',
    work_rights_information: 'Not stated',
    international_student_information: 'Sponsorship may be available'
  },
  {
    company: 'UniSuper',
    title: 'Investment Analytics Internship',
    location: 'Melbourne, Australia',
    city: 'Melbourne',
    country: 'Australia',
    role_type: 'Internship',
    discipline: 'Investments',
    careerArea: 'Superannuation',
    requirements: 'Quantitative degree, investment risk awareness, Excel and communication.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Quantium',
    title: 'Graduate Decision Scientist',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Graduate Program',
    discipline: 'Data Science',
    careerArea: 'Data & Analytics',
    requirements: 'Statistics, econometrics or actuarial studies, Python/R and business communication.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Flow Traders',
    title: 'Trading Intern',
    location: 'Singapore',
    city: 'Singapore',
    country: 'International',
    role_type: 'Summer Internship',
    discipline: 'Trading',
    careerArea: 'Trading',
    requirements: 'Probability, statistics, numerical reasoning and fast decision-making.',
    work_rights_information: 'Relocation and visa requirements apply',
    international_student_information: 'Eligibility unclear - check employer details'
  },
  {
    company: 'IMC',
    title: 'Quantitative Trading Intern',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Summer Internship',
    discipline: 'Quantitative Trading',
    careerArea: 'Quant Finance',
    requirements: 'Mathematics, probability, statistics and strong coding fundamentals.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Akuna Capital',
    title: 'Quantitative Research Intern',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Winter Internship',
    discipline: 'Quantitative Research',
    careerArea: 'Quant Finance',
    requirements: 'Probability, optimisation, statistical modelling, Python/C++ beneficial.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Kearney',
    title: 'Strategy Consulting Analyst (Financial Services)',
    location: 'Melbourne, Australia',
    city: 'Melbourne',
    country: 'Australia',
    role_type: 'Entry-Level',
    discipline: 'Strategy Consulting',
    careerArea: 'Consulting',
    requirements: 'Analytical problem-solving, quantitative reasoning and communication.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'Finity',
    title: 'Actuarial Consultant Graduate',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Graduate Role',
    discipline: 'Actuarial Consulting',
    careerArea: 'Actuarial',
    requirements: 'Actuarial studies, insurance understanding, communication and modelling skills.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'RGA',
    title: 'Life Reinsurance Pricing Analyst',
    location: 'Melbourne, Australia',
    city: 'Melbourne',
    country: 'Australia',
    role_type: 'Graduate Role',
    discipline: 'Reinsurance',
    careerArea: 'Insurance',
    requirements: 'Actuarial or quantitative degree, modelling and life insurance interest.',
    work_rights_information: 'Not stated',
    international_student_information: 'Not stated'
  },
  {
    company: 'APRA',
    title: 'Graduate Program - Policy & Risk Analytics',
    location: 'Canberra, Australia',
    city: 'Canberra',
    country: 'Australia',
    role_type: 'Graduate Program',
    discipline: 'Government Regulation',
    careerArea: 'Government / Regulation',
    requirements: 'Quantitative degree, risk analysis and public policy interest.',
    work_rights_information: 'Citizenship / PR may be required',
    international_student_information: 'Confirmed restricted'
  },
  {
    company: 'Reserve Bank of Australia',
    title: 'Economic Analyst Cadetship',
    location: 'Sydney, Australia',
    city: 'Sydney',
    country: 'Australia',
    role_type: 'Cadetship',
    discipline: 'Economics',
    careerArea: 'Economics',
    requirements: 'Econometrics, statistics, economics and data analysis capability.',
    work_rights_information: 'Citizenship / PR may be required',
    international_student_information: 'Eligibility unclear - check employer details'
  }
]

function ensureDefaultCareerData() {
  const db = getDb()
  const now = nowIso()

  const companies = [...ACTUARIAL_COMPANIES, ...BANKING_COMPANIES, ...TECHNOLOGY_COMPANIES, ...EXPANDED_ECOSYSTEM_COMPANIES]
  const jobs = [...ACTUARIAL_JOBS, ...BANKING_JOBS, ...TECHNOLOGY_JOBS, ...EXPANDED_ECOSYSTEM_JOBS]

  const companyIds = new Map<string, string>()

  for (const company of companies) {
    const slug = normalizeSlug(company.name)
    const existingCompany = db.prepare('SELECT id FROM career_companies WHERE slug = ?').get(slug) as any

    if (existingCompany?.id) {
      companyIds.set(company.name, existingCompany.id)
      continue
    }

    const companyId = id('carco')
    db.prepare(`
      INSERT INTO career_companies (id, name, slug, official_careers_url, source_type, profile_created, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(companyId, company.name, slug, company.official_careers_url, (company as any).source_type || 'OFFICIAL', 0, now, now)
    companyIds.set(company.name, companyId)

    db.prepare(`
      INSERT INTO career_company_checks (id, company_id, status, last_checked_at, last_successful_check_at, error_message, total_openings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id('carcheck'), companyId, 'HEALTHY', now, now, null, 0, now, now)
  }

  for (const job of jobs) {
    const companyId = companyIds.get(job.company)
    if (!companyId) continue

    const externalJobId = `${normalizeSlug(job.company)}-${normalizeSlug(job.title)}`
    const existingJob = db.prepare('SELECT id FROM career_jobs WHERE company_id = ? AND external_job_id = ?').get(companyId, externalJobId) as any
    if (existingJob?.id) continue

    const companyRecord = companies.find((item) => item.name === job.company) as any
    const jobUrl = companyRecord?.official_careers_url || null
    const jobId = id('carjob')

    db.prepare(`
      INSERT INTO career_jobs (
        id, company_id, external_job_id, job_title, location, city, country, role_type, discipline, career_area,
        description, requirements, opening_date, closing_date, closing_time, application_url,
        source_url, source_type, work_rights_information, international_student_information,
        date_found, last_verified, source_timezone, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      companyId,
      externalJobId,
      job.title,
      job.location,
      job.city,
      job.country,
      job.role_type,
      job.discipline,
      job.careerArea,
      `${job.title} opportunity at ${job.company}.`,
      job.requirements,
      now,
      null,
      null,
      jobUrl,
      jobUrl,
      companyRecord?.source_type || 'OFFICIAL_EMPLOYER',
      job.work_rights_information,
      job.international_student_information,
      now,
      now,
      null,
      1,
      now,
      now
    )
  }

  db.exec(`
    UPDATE career_companies
    SET profile_created = 1, updated_at = '${now}'
    WHERE id IN (
      SELECT c.id
      FROM career_companies c
      INNER JOIN career_jobs j ON j.company_id = c.id
      WHERE j.is_active = 1 AND c.official_careers_url IS NOT NULL
    );

    UPDATE career_company_checks
    SET total_openings = (
      SELECT COUNT(1)
      FROM career_jobs j
      WHERE j.company_id = career_company_checks.company_id
      AND j.is_active = 1
    )
  `)
}

export function getCareerSettings(userId: string) {
  ensureDefaultCareerData()
  ensureUser(userId)
  const db = getDb()
  const row = db.prepare('SELECT * FROM career_settings WHERE user_id = ?').get(userId) as any
  if (row) {
    return {
      timezone: row.timezone || DEFAULT_TIMEZONE,
      timezoneConfirmed: Boolean(row.timezone_confirmed),
      autoAddDeadlinesToPlanner: Boolean(row.auto_add_deadlines_to_planner)
    }
  }

  const userRow = db.prepare('SELECT timezone FROM users WHERE id = ?').get(userId) as any
  const timezone = userRow?.timezone || DEFAULT_TIMEZONE
  const now = nowIso()
  db.prepare(`
    INSERT INTO career_settings (user_id, timezone, timezone_confirmed, auto_add_deadlines_to_planner, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, timezone, 0, 0, now, now)

  return {
    timezone,
    timezoneConfirmed: false,
    autoAddDeadlinesToPlanner: false
  }
}

export function updateCareerSettings(userId: string, updates: {
  timezone?: string
  timezoneConfirmed?: boolean
  autoAddDeadlinesToPlanner?: boolean
}) {
  ensureUser(userId)
  const db = getDb()
  const current = getCareerSettings(userId)
  const merged = {
    timezone: updates.timezone || current.timezone,
    timezoneConfirmed: updates.timezoneConfirmed ?? current.timezoneConfirmed,
    autoAddDeadlinesToPlanner: updates.autoAddDeadlinesToPlanner ?? current.autoAddDeadlinesToPlanner
  }
  const now = nowIso()

  db.prepare(`
    UPDATE career_settings
    SET timezone = ?, timezone_confirmed = ?, auto_add_deadlines_to_planner = ?, updated_at = ?
    WHERE user_id = ?
  `).run(
    merged.timezone,
    merged.timezoneConfirmed ? 1 : 0,
    merged.autoAddDeadlinesToPlanner ? 1 : 0,
    now,
    userId
  )

  db.prepare('UPDATE users SET timezone = ?, updated_at = ? WHERE id = ?').run(merged.timezone, now, userId)

  return merged
}

function baseJobQuery() {
  return `
    SELECT
      j.*,
      c.name AS company_name,
      c.slug AS company_slug,
      c.official_careers_url,
      c.profile_created
    FROM career_jobs j
    INNER JOIN career_companies c ON c.id = j.company_id
    WHERE j.is_active = 1
  `
}

export function listDiscoverJobs(filters: {
  q?: string
  roleTypes?: string[]
  disciplines?: string[]
  countries?: string[]
  companies?: string[]
  careerAreas?: string[]
}) {
  ensureDefaultCareerData()
  const db = getDb()
  const clauses: string[] = []
  const params: any[] = []

  if (filters.q?.trim()) {
    const q = `%${filters.q.trim().toLowerCase()}%`
    clauses.push("(LOWER(c.name) LIKE ? OR LOWER(j.job_title) LIKE ? OR LOWER(COALESCE(j.description, '')) LIKE ? OR LOWER(COALESCE(j.requirements, '')) LIKE ?)")
    params.push(q, q, q, q)
  }

  if ((filters.countries || []).length) {
    clauses.push(`LOWER(COALESCE(j.country, '')) IN (${(filters.countries || []).map(() => '?').join(',')})`)
    params.push(...(filters.countries || []).map((value) => normalizeText(value)))
  }

  if ((filters.companies || []).length) {
    clauses.push(`LOWER(COALESCE(c.name, '')) IN (${(filters.companies || []).map(() => '?').join(',')})`)
    params.push(...(filters.companies || []).map((value) => normalizeText(value)))
  }

  const where = clauses.length ? ` AND ${clauses.join(' AND ')}` : ''
  const rows = db.prepare(`${baseJobQuery()} ${where} ORDER BY COALESCE(j.last_verified, j.created_at) DESC`).all(...params) as any[]

  const selectedAreas = normalizeArray(filters.careerAreas)
  const selectedRoles = normalizeArray(filters.roleTypes)
  const selectedDisciplines = normalizeArray(filters.disciplines)

  return rows
    .map((row) => ({
      id: row.id,
      companyId: row.company_id,
      company: row.company_name,
      companySlug: row.company_slug,
      companyProfileAvailable: Boolean(row.profile_created),
      officialCareersUrl: row.official_careers_url,
      jobTitle: row.job_title,
      externalJobId: row.external_job_id,
      location: row.location,
      city: row.city,
      country: row.country,
      roleType: row.role_type,
      discipline: row.discipline,
      careerArea: row.career_area || 'Actuarial',
      description: row.description,
      requirements: row.requirements,
      openingDate: row.opening_date,
      closingDate: row.closing_date,
      closingTime: row.closing_time,
      applicationUrl: resolveJobApplicationUrl({
        applicationUrl: row.application_url,
        sourceUrl: row.source_url,
        officialCareersUrl: row.official_careers_url
      }),
      sourceUrl: row.source_url,
      sourceType: row.source_type,
      workRightsInformation: row.work_rights_information || 'Not stated',
      internationalStudentInformation: row.international_student_information || 'Not stated',
      dateFound: row.date_found,
      lastVerified: row.last_verified,
      sourceTimezone: row.source_timezone
    }))
    .map((job) => {
      const fit = getActuarialCareerFit({
        title: job.jobTitle,
        description: job.description,
        requirements: job.requirements,
        discipline: job.discipline,
        careerArea: job.careerArea
      })
      const families = inferCareerFamilies({
        title: job.jobTitle,
        description: job.description,
        requirements: job.requirements,
        discipline: job.discipline,
        careerArea: job.careerArea
      })
      const status = getOpportunityStatus({
        closingDate: job.closingDate,
        applicationUrl: job.applicationUrl,
        lastVerified: job.lastVerified
      })
      return {
        ...job,
        careerFamilies: families,
        careerFitScore: fit.score,
        careerFitLabel: fit.label,
        careerFitReason: fit.reason,
        suitabilityStatus: fit.isRelevant ? 'Recommended' : 'Low relevance',
        opportunityStatus: status.status,
        opportunityStatusLabel: status.label
      }
    })
    .filter((job) => job.careerFitScore >= 60)
    .filter((job) => {
      if (selectedRoles.length && !matchesFilterValue(job.roleType, selectedRoles)) return false
      if (selectedDisciplines.length) {
        const disciplineHit = matchesFilterValue(job.discipline, selectedDisciplines)
          || selectedDisciplines.some((value) => job.careerFamilies.some((family: string) => family.toLowerCase().includes(value.toLowerCase())))
        if (!disciplineHit) return false
      }

      if (!selectedAreas.length) return true

      const normalizedAreas = selectedAreas.map((value) => value.toLowerCase())
      if (normalizedAreas.includes('recommended for actuarial students')) {
        return job.careerFitScore >= 70
      }
      if (normalizedAreas.includes('all quantitative careers')) {
        return job.careerFitScore >= 60
      }

      const matchedArea = normalizedAreas.some((value) =>
        (job.careerArea || '').toLowerCase() === value
        || job.careerFamilies.some((family: string) => family.toLowerCase() === value)
      )
      return matchedArea
    })
}

export function listCompanies() {
  ensureDefaultCareerData()
  const db = getDb()
  const rows = db.prepare(`
    SELECT c.*, (
      SELECT COUNT(1) FROM career_jobs j WHERE j.company_id = c.id AND j.is_active = 1
    ) AS active_job_count
    FROM career_companies c
    ORDER BY c.name ASC
  `).all() as any[]

  const jobs = db.prepare(`
    SELECT company_id, job_title, description, requirements, discipline, career_area
    FROM career_jobs
    WHERE is_active = 1
  `).all() as any[]

  const jobsByCompany = new Map<string, any[]>()
  for (const job of jobs) {
    const bucket = jobsByCompany.get(String(job.company_id)) || []
    bucket.push(job)
    jobsByCompany.set(String(job.company_id), bucket)
  }

  return rows.map((row) => {
    const companyJobs = jobsByCompany.get(String(row.id)) || []
    const families = new Set<string>()
    for (const job of companyJobs) {
      const inferred = inferCareerFamilies({
        title: job.job_title,
        description: job.description,
        requirements: job.requirements,
        discipline: job.discipline,
        careerArea: job.career_area
      })
      for (const family of inferred) families.add(family)
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      sourceType: row.source_type,
      officialCareersUrl: row.official_careers_url,
      profileCreated: Boolean(row.profile_created),
      activeJobCount: Number(row.active_job_count || 0),
      careerFamilies: Array.from(families),
      hiddenGem: isHiddenGemCompany({
        sourceType: row.source_type,
        activeJobCount: Number(row.active_job_count || 0),
        companyName: row.name
      })
    }
  })
}

export function getCompanyDetails(companyId: string, userId?: string) {
  ensureDefaultCareerData()
  const db = getDb()
  const company = db.prepare('SELECT * FROM career_companies WHERE id = ?').get(companyId) as any
  if (!company) return null

  const jobs = db.prepare(`
    SELECT * FROM career_jobs WHERE company_id = ? AND is_active = 1 ORDER BY COALESCE(last_verified, created_at) DESC
  `).all(companyId) as any[]

  const activeJobCount = jobs.length
  const qualifiesNow = Boolean(company.name && company.official_careers_url && activeJobCount > 0)

  let followed = false
  if (userId) {
    const follow = db.prepare('SELECT id FROM career_company_follows WHERE user_id = ? AND company_id = ?').get(userId, companyId) as any
    followed = Boolean(follow)
  }

  if (qualifiesNow && !company.profile_created) {
    db.prepare('UPDATE career_companies SET profile_created = 1, updated_at = ? WHERE id = ?').run(nowIso(), companyId)
    company.profile_created = 1
  }

  const pageAvailable = Boolean(company.profile_created) || qualifiesNow || followed

  const check = db.prepare(`
    SELECT * FROM career_company_checks
    WHERE company_id = ?
    ORDER BY COALESCE(updated_at, created_at) DESC
    LIMIT 1
  `).get(companyId) as any

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    sourceType: company.source_type,
    officialCareersUrl: company.official_careers_url,
    pageAvailable,
    activeJobCount,
    status: check?.status || 'HEALTHY',
    lastCheckedAt: check?.last_checked_at || null,
    lastSuccessfulCheckAt: check?.last_successful_check_at || null,
    sourceError: check?.error_message || null,
    jobs: jobs.map((job) => ({
      ...(function () {
        const status = getOpportunityStatus({
          closingDate: job.closing_date,
          applicationUrl: resolveJobApplicationUrl({
            applicationUrl: job.application_url,
            sourceUrl: job.source_url,
            officialCareersUrl: company.official_careers_url
          }),
          lastVerified: job.last_verified
        })
        return { opportunityStatus: status.status, opportunityStatusLabel: status.label }
      })(),
      id: job.id,
      jobTitle: job.job_title,
      location: job.location,
      roleType: job.role_type,
      discipline: job.discipline,
      careerArea: job.career_area || 'Actuarial',
      applicationUrl: resolveJobApplicationUrl({
        applicationUrl: job.application_url,
        sourceUrl: job.source_url,
        officialCareersUrl: company.official_careers_url
      }),
      sourceUrl: job.source_url,
      lastVerified: job.last_verified
    }))
  }
}

export function followCompany(userId: string, input: {
  companyId: string
  roleTypes?: string[]
  disciplines?: string[]
  countries?: string[]
}) {
  ensureDefaultCareerData()
  ensureUser(userId)
  const db = getDb()
  const now = nowIso()

  db.prepare(`
    INSERT INTO career_company_follows (id, user_id, company_id, role_types, disciplines, countries, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, company_id) DO UPDATE SET
      role_types = excluded.role_types,
      disciplines = excluded.disciplines,
      countries = excluded.countries,
      updated_at = excluded.updated_at
  `).run(
    id('follow'),
    userId,
    input.companyId,
    toJson(normalizeArray(input.roleTypes)),
    toJson(normalizeArray(input.disciplines)),
    toJson(normalizeArray(input.countries)),
    now,
    now
  )
}

export function unfollowCompany(userId: string, companyId: string) {
  const db = getDb()
  db.prepare('DELETE FROM career_company_follows WHERE user_id = ? AND company_id = ?').run(userId, companyId)
}

export function listFollowing(userId: string) {
  ensureDefaultCareerData()
  const db = getDb()
  const rows = db.prepare(`
    SELECT f.*, c.name, c.slug, c.official_careers_url
    FROM career_company_follows f
    INNER JOIN career_companies c ON c.id = f.company_id
    WHERE f.user_id = ?
    ORDER BY COALESCE(f.updated_at, f.created_at) DESC
  `).all(userId) as any[]

  const allJobsByCompany = new Map<string, any[]>()
  const jobs = db.prepare('SELECT * FROM career_jobs WHERE is_active = 1').all() as any[]
  for (const job of jobs) {
    const bucket = allJobsByCompany.get(job.company_id) || []
    bucket.push(job)
    allJobsByCompany.set(job.company_id, bucket)
  }

  return rows.map((row) => {
    const roleTypes = fromJson<string[]>(row.role_types, [])
    const disciplines = fromJson<string[]>(row.disciplines, [])
    const countries = fromJson<string[]>(row.countries, [])

    const companyJobs = allJobsByCompany.get(row.company_id) || []
    const matchingJobs = companyJobs.filter((job) => (
      matchesPreference(job.role_type, roleTypes)
      && matchesPreference(job.discipline, disciplines)
      && matchesPreference(job.country, countries)
    ))

    const check = db.prepare(`
      SELECT * FROM career_company_checks
      WHERE company_id = ?
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 1
    `).get(row.company_id) as any

    let state: 'MATCHING_AVAILABLE' | 'NO_MATCHING' | 'NO_OPENINGS' | 'SOURCE_UNAVAILABLE' = 'NO_OPENINGS'
    let summary = 'No current openings found.'

    if (check?.status === 'SOURCE_UNAVAILABLE') {
      state = 'SOURCE_UNAVAILABLE'
      summary = `We couldn't check ${row.name}'s careers listings right now.`
    } else if (companyJobs.length === 0) {
      state = 'NO_OPENINGS'
      summary = 'No current openings found.'
    } else if (matchingJobs.length === 0) {
      state = 'NO_MATCHING'
      summary = `${companyJobs.length} current ${row.name} opportunities found, but none match your selected preferences.`
    } else {
      state = 'MATCHING_AVAILABLE'
      summary = `${matchingJobs.length} role${matchingJobs.length === 1 ? '' : 's'} matching your preferences.`
    }

    return {
      id: row.id,
      companyId: row.company_id,
      company: row.name,
      companySlug: row.slug,
      officialCareersUrl: row.official_careers_url,
      roleTypes,
      disciplines,
      countries,
      state,
      summary,
      totalOpenings: companyJobs.length,
      matchingOpenings: matchingJobs.length,
      lastCheckedAt: check?.last_checked_at || null,
      lastSuccessfulCheckAt: check?.last_successful_check_at || null,
      sourceError: check?.error_message || null,
      matchingJobs: matchingJobs.map((job) => ({
        id: job.id,
        jobTitle: job.job_title,
        location: job.location,
        roleType: job.role_type,
        discipline: job.discipline,
        careerArea: job.career_area || 'Actuarial',
        applicationUrl: resolveJobApplicationUrl({
          applicationUrl: job.application_url,
          sourceUrl: job.source_url,
          officialCareersUrl: row.official_careers_url
        }),
        lastVerified: job.last_verified
      }))
    }
  })
}

export function updateCompanyCheckStatus(companyId: string, status: 'HEALTHY' | 'SOURCE_UNAVAILABLE', errorMessage?: string | null) {
  const db = getDb()
  const now = nowIso()
  const openings = db.prepare('SELECT COUNT(1) as count FROM career_jobs WHERE company_id = ? AND is_active = 1').get(companyId) as any
  const existing = db.prepare('SELECT id FROM career_company_checks WHERE company_id = ?').get(companyId) as any

  if (existing?.id) {
    db.prepare(`
      UPDATE career_company_checks
      SET status = ?,
          last_checked_at = ?,
          last_successful_check_at = CASE WHEN ? = 'SOURCE_UNAVAILABLE' THEN last_successful_check_at ELSE ? END,
          error_message = ?,
          total_openings = ?,
          updated_at = ?
      WHERE company_id = ?
    `).run(status, now, status, now, errorMessage || null, Number(openings?.count || 0), now, companyId)
    return
  }

  db.prepare(`
    INSERT INTO career_company_checks (id, company_id, status, last_checked_at, last_successful_check_at, error_message, total_openings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id('carcheck'),
    companyId,
    status,
    now,
    status === 'SOURCE_UNAVAILABLE' ? null : now,
    errorMessage || null,
    Number(openings?.count || 0),
    now,
    now
  )
}

function buildJobSnapshot(job: any) {
  return {
    jobId: job.id,
    companyId: job.company_id,
    company: job.company_name,
    jobTitle: job.job_title,
    description: job.description,
    requirements: job.requirements,
    location: job.location,
    roleType: job.role_type,
    discipline: job.discipline,
    careerArea: job.career_area || 'Actuarial',
    closingDate: job.closing_date,
    closingTime: job.closing_time,
    applicationUrl: resolveJobApplicationUrl({
      applicationUrl: job.application_url,
      sourceUrl: job.source_url,
      officialCareersUrl: job.official_careers_url
    }),
    sourceUrl: job.source_url,
    sourceType: job.source_type,
    workRightsInformation: job.work_rights_information || 'Not stated',
    internationalStudentInformation: job.international_student_information || 'Not stated',
    lastVerified: job.last_verified
  }
}

export function saveRole(userId: string, jobId: string) {
  ensureUser(userId)
  const db = getDb()
  const job = db.prepare(`${baseJobQuery()} AND j.id = ?`).get(jobId) as any
  if (!job) throw new Error('Job not found.')
  const now = nowIso()

  db.prepare(`
    INSERT INTO career_saved_jobs (id, user_id, job_id, job_snapshot, date_saved, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, job_id) DO UPDATE SET
      job_snapshot = excluded.job_snapshot,
      updated_at = excluded.updated_at
  `).run(id('saved'), userId, jobId, toJson(buildJobSnapshot(job)), now, now, now)
}

export function unsaveRole(userId: string, jobId: string) {
  const db = getDb()
  db.prepare('DELETE FROM career_saved_jobs WHERE user_id = ? AND job_id = ?').run(userId, jobId)
}

export function listSavedRoles(userId: string) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM career_saved_jobs WHERE user_id = ? ORDER BY COALESCE(updated_at, created_at) DESC
  `).all(userId) as any[]

  return rows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    dateSaved: row.date_saved,
    snapshot: fromJson<Record<string, unknown>>(row.job_snapshot, {})
  }))
}

function appendApplicationEvent(input: {
  applicationId: string
  userId: string
  eventType: string
  title: string
  details?: string | null
  eventTimeUtc?: string
}) {
  const db = getDb()
  const now = nowIso()
  db.prepare(`
    INSERT INTO career_application_events (id, application_id, user_id, event_type, title, details, event_time_utc, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id('appevt'),
    input.applicationId,
    input.userId,
    input.eventType,
    input.title,
    input.details || null,
    input.eventTimeUtc || now,
    now
  )
}

export function createApplicationFromJob(userId: string, input: {
  jobId: string
  stage?: CareerStage
  notes?: string
  appliedAtUtc?: string
}) {
  ensureUser(userId)
  const db = getDb()
  const job = db.prepare(`${baseJobQuery()} AND j.id = ?`).get(input.jobId) as any
  if (!job) throw new Error('Job not found.')

  const stage = input.stage || 'Applied'
  const now = nowIso()
  const applicationId = id('app')
  const snapshot = buildJobSnapshot(job)

  db.prepare(`
    INSERT INTO career_applications (
      id, user_id, company_id, job_id, job_snapshot, title, stage, outstanding_actions, checklist,
      notes, applied_at_utc, cv_document_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    applicationId,
    userId,
    job.company_id,
    job.id,
    toJson(snapshot),
    `${job.company_name} · ${job.job_title}`,
    stage,
    toJson([]),
    toJson(['CV', 'Cover letter', 'Transcript', 'Work rights information']),
    input.notes || null,
    input.appliedAtUtc || now,
    null,
    now,
    now
  )

  appendApplicationEvent({
    applicationId,
    userId,
    eventType: 'APPLICATION_CREATED',
    title: `Application tracked (${stage})`,
    details: `${job.company_name} · ${job.job_title}`,
    eventTimeUtc: input.appliedAtUtc || now
  })

  return applicationId
}

export function listApplications(userId: string) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT a.*, c.name AS company_name
    FROM career_applications a
    LEFT JOIN career_companies c ON c.id = a.company_id
    WHERE a.user_id = ?
    ORDER BY COALESCE(a.updated_at, a.created_at) DESC
  `).all(userId) as any[]

  return rows.map((row) => {
    const timeline = db.prepare(`
      SELECT * FROM career_application_events
      WHERE application_id = ?
      ORDER BY event_time_utc ASC, created_at ASC
    `).all(row.id) as any[]

    return {
      id: row.id,
      company: row.company_name,
      title: row.title,
      stage: row.stage,
      appliedAtUtc: row.applied_at_utc,
      notes: row.notes,
      outstandingActions: fromJson<string[]>(row.outstanding_actions, []),
      checklist: fromJson<string[]>(row.checklist, []),
      snapshot: fromJson<Record<string, unknown>>(row.job_snapshot, {}),
      cvDocumentId: row.cv_document_id,
      timeline: timeline.map((item) => ({
        id: item.id,
        eventType: item.event_type,
        title: item.title,
        details: item.details,
        eventTimeUtc: item.event_time_utc
      }))
    }
  })
}

export function updateApplication(userId: string, applicationId: string, updates: {
  stage?: CareerStage
  notes?: string
  outstandingActions?: string[]
  checklist?: string[]
  cvDocumentId?: string | null
}) {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM career_applications WHERE id = ? AND user_id = ?').get(applicationId, userId) as any
  if (!existing) throw new Error('Application not found.')

  const nextStage = updates.stage || existing.stage
  const nextNotes = updates.notes ?? existing.notes
  const nextActions = updates.outstandingActions ?? fromJson<string[]>(existing.outstanding_actions, [])
  const nextChecklist = updates.checklist ?? fromJson<string[]>(existing.checklist, [])
  const nextCv = updates.cvDocumentId === undefined ? existing.cv_document_id : updates.cvDocumentId

  db.prepare(`
    UPDATE career_applications
    SET stage = ?, notes = ?, outstanding_actions = ?, checklist = ?, cv_document_id = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    nextStage,
    nextNotes,
    toJson(nextActions),
    toJson(nextChecklist),
    nextCv,
    nowIso(),
    applicationId,
    userId
  )

  appendApplicationEvent({
    applicationId,
    userId,
    eventType: 'APPLICATION_UPDATED',
    title: updates.stage ? `Stage moved to ${updates.stage}` : 'Application updated',
    details: updates.stage ? null : 'Details updated'
  })
}

function createPlannerTaskForAssessment(userId: string, assessment: any, companyName?: string | null) {
  const db = getDb()
  const existingByAssessment = db.prepare(`
    SELECT id FROM planner_tasks WHERE user_id = ? AND career_assessment_id = ? LIMIT 1
  `).get(userId, assessment.id) as any

  if (existingByAssessment?.id) {
    db.prepare('UPDATE career_assessments SET planner_task_id = ?, updated_at = ? WHERE id = ?').run(existingByAssessment.id, nowIso(), assessment.id)
    return existingByAssessment.id as string
  }

  const now = nowIso()
  const taskId = id('task')
  const title = `Complete ${companyName || 'Company'} ${assessment.title}`

  db.prepare(`
    INSERT INTO planner_tasks (
      id, user_id, course_id, topic_id, assessment_id, career_assessment_id, title, description, task_type,
      priority, planned_date, due_date, estimated_minutes, completed, generated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    taskId,
    userId,
    null,
    null,
    null,
    assessment.id,
    title,
    `Careers · ${companyName || 'Employer'} recruitment workflow`,
    'career',
    0.95,
    assessment.deadline_at_utc || null,
    assessment.deadline_at_utc || null,
    45,
    0,
    'careers_auto',
    now,
    now
  )

  db.prepare('UPDATE career_assessments SET planner_task_id = ?, updated_at = ? WHERE id = ?').run(taskId, now, assessment.id)
  return taskId
}

export function addAssessmentToPlanner(userId: string, assessmentId: string) {
  const db = getDb()
  const assessment = db.prepare('SELECT * FROM career_assessments WHERE id = ? AND user_id = ?').get(assessmentId, userId) as any
  if (!assessment) throw new Error('Assessment not found.')
  if (!assessment.deadline_has_exact_time || !assessment.deadline_at_utc) {
    throw new Error('Exact deadline time is required before auto-linking this assessment to Planner.')
  }

  const companyName = assessment.company_id
    ? (db.prepare('SELECT name FROM career_companies WHERE id = ?').get(assessment.company_id) as any)?.name
    : (assessment.custom_company_name || null)

  return createPlannerTaskForAssessment(userId, assessment, companyName)
}

export function createAssessment(userId: string, input: {
  applicationId?: string | null
  companyId?: string | null
  customCompanyName?: string | null
  assessmentType: string
  title: string
  invitationReceivedAtUtc?: string | null
  deadlineRuleHours?: number | null
  deadlineAtUtc?: string | null
  deadlineDateOnly?: string | null
  deadlineHasExactTime?: boolean
  employerDeadlineLabel?: string | null
  employerTimezone?: string | null
  assessmentUrl?: string | null
  notes?: string | null
}) {
  ensureUser(userId)
  const db = getDb()
  const settings = getCareerSettings(userId)
  const now = nowIso()

  let computedDeadlineAtUtc = input.deadlineAtUtc || null
  if (!computedDeadlineAtUtc && input.deadlineRuleHours && input.invitationReceivedAtUtc) {
    const base = new Date(input.invitationReceivedAtUtc)
    if (!Number.isNaN(base.getTime())) {
      computedDeadlineAtUtc = new Date(base.getTime() + input.deadlineRuleHours * 60 * 60 * 1000).toISOString()
    }
  }

  const hasExact = Boolean(input.deadlineHasExactTime && computedDeadlineAtUtc)
  const assessmentId = id('carass')
  const customCompanyName = input.companyId ? null : (input.customCompanyName?.trim() || null)

  db.prepare(`
    INSERT INTO career_assessments (
      id, user_id, application_id, company_id, custom_company_name, assessment_type, title, status, invitation_received_at_utc,
      deadline_rule_hours, deadline_at_utc, deadline_date_only, deadline_has_exact_time, employer_deadline_label,
      employer_timezone, assessment_url, notes, completed_at_utc, planner_task_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    assessmentId,
    userId,
    input.applicationId || null,
    input.companyId || null,
    customCompanyName,
    input.assessmentType,
    input.title,
    'Incomplete',
    input.invitationReceivedAtUtc || null,
    input.deadlineRuleHours ?? null,
    computedDeadlineAtUtc,
    input.deadlineDateOnly || null,
    hasExact ? 1 : 0,
    input.employerDeadlineLabel || null,
    input.employerTimezone || null,
    input.assessmentUrl || null,
    input.notes || null,
    null,
    null,
    now,
    now
  )

  const assessment = db.prepare('SELECT * FROM career_assessments WHERE id = ?').get(assessmentId) as any
  const companyName = input.companyId
    ? (db.prepare('SELECT name FROM career_companies WHERE id = ?').get(input.companyId) as any)?.name
    : customCompanyName

  if (
    settings.autoAddDeadlinesToPlanner
    && hasExact
    && assessment.status !== 'Completed'
    && !assessment.planner_task_id
  ) {
    createPlannerTaskForAssessment(userId, assessment, companyName)
  }

  if (input.applicationId) {
    appendApplicationEvent({
      applicationId: input.applicationId,
      userId,
      eventType: 'ASSESSMENT_ADDED',
      title: `Assessment added: ${input.title}`,
      details: input.deadlineRuleHours ? `Complete within ${input.deadlineRuleHours} hours` : null
    })
  }

  return assessmentId
}

export function listAssessments(userId: string) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT
      a.*,
      c.name AS company_name,
      app.title AS application_title
    FROM career_assessments a
    LEFT JOIN career_companies c ON c.id = a.company_id
    LEFT JOIN career_applications app ON app.id = a.application_id
    WHERE a.user_id = ?
    ORDER BY COALESCE(a.deadline_at_utc, a.deadline_date_only, a.created_at) ASC
  `).all(userId) as any[]

  return rows.map((row) => ({
    id: row.id,
    company: row.company_name || row.custom_company_name || null,
    applicationTitle: row.application_title,
    assessmentType: row.assessment_type,
    title: row.title,
    status: row.status,
    invitationReceivedAtUtc: row.invitation_received_at_utc,
    deadlineRuleHours: row.deadline_rule_hours,
    deadlineAtUtc: row.deadline_at_utc,
    deadlineDateOnly: row.deadline_date_only,
    deadlineHasExactTime: Boolean(row.deadline_has_exact_time),
    employerDeadlineLabel: row.employer_deadline_label,
    employerTimezone: row.employer_timezone,
    assessmentUrl: row.assessment_url,
    notes: row.notes,
    completedAtUtc: row.completed_at_utc,
    plannerTaskId: row.planner_task_id
  }))
}

export function updateAssessment(userId: string, assessmentId: string, updates: {
  status?: 'Incomplete' | 'Completed'
  deadlineAtUtc?: string | null
  deadlineDateOnly?: string | null
  deadlineHasExactTime?: boolean
  notes?: string | null
}) {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM career_assessments WHERE id = ? AND user_id = ?').get(assessmentId, userId) as any
  if (!existing) throw new Error('Assessment not found.')

  const nextStatus = updates.status || existing.status
  const nextDeadlineAtUtc = updates.deadlineAtUtc === undefined ? existing.deadline_at_utc : updates.deadlineAtUtc
  const nextDeadlineDateOnly = updates.deadlineDateOnly === undefined ? existing.deadline_date_only : updates.deadlineDateOnly
  const nextHasExact = updates.deadlineHasExactTime === undefined ? Boolean(existing.deadline_has_exact_time) : updates.deadlineHasExactTime
  const nextNotes = updates.notes === undefined ? existing.notes : updates.notes
  const completedAt = nextStatus === 'Completed' ? (existing.completed_at_utc || nowIso()) : null
  const now = nowIso()

  db.prepare(`
    UPDATE career_assessments
    SET status = ?, deadline_at_utc = ?, deadline_date_only = ?, deadline_has_exact_time = ?,
        notes = ?, completed_at_utc = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    nextStatus,
    nextDeadlineAtUtc,
    nextDeadlineDateOnly,
    nextHasExact ? 1 : 0,
    nextNotes,
    completedAt,
    now,
    assessmentId,
    userId
  )

  const refreshed = db.prepare('SELECT * FROM career_assessments WHERE id = ?').get(assessmentId) as any

  if (refreshed.planner_task_id) {
    db.prepare(`
      UPDATE planner_tasks
      SET due_date = ?, planned_date = ?, completed = ?, completed_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      refreshed.deadline_at_utc || null,
      refreshed.deadline_at_utc || null,
      refreshed.status === 'Completed' ? 1 : 0,
      refreshed.status === 'Completed' ? completedAt : null,
      now,
      refreshed.planner_task_id,
      userId
    )
  }
}

export function deleteApplication(userId: string, applicationId: string) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM career_applications WHERE id = ? AND user_id = ?').get(applicationId, userId) as any
  if (!existing) throw new Error('Application not found.')

  db.prepare('DELETE FROM career_application_events WHERE application_id = ? AND user_id = ?').run(applicationId, userId)
  db.prepare('DELETE FROM career_assessments WHERE application_id = ? AND user_id = ?').run(applicationId, userId)
  db.prepare('DELETE FROM career_applications WHERE id = ? AND user_id = ?').run(applicationId, userId)
}

export function syncAssessmentFromPlannerTask(taskId: string) {
  const db = getDb()
  const task = db.prepare('SELECT * FROM planner_tasks WHERE id = ?').get(taskId) as any
  if (!task?.career_assessment_id) return

  const assessment = db.prepare('SELECT * FROM career_assessments WHERE id = ?').get(task.career_assessment_id) as any
  if (!assessment) return

  const now = nowIso()
  const status = Number(task.completed || 0) === 1 ? 'Completed' : 'Incomplete'

  db.prepare(`
    UPDATE career_assessments
    SET status = ?, completed_at_utc = ?, planner_task_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    status,
    status === 'Completed' ? (assessment.completed_at_utc || now) : null,
    taskId,
    now,
    assessment.id
  )
}

function extractCvProfile(raw: string) {
  const text = raw.toLowerCase()
  const profile = {
    degree: /actuarial|finance|statistics|mathematics/.test(text) ? 'Detected' : null,
    programmingLanguages: [
      /\bpython\b/.test(text) ? 'Python' : null,
      /\br\b/.test(text) ? 'R' : null,
      /\bsql\b/.test(text) ? 'SQL' : null
    ].filter(Boolean),
    technicalSkills: [
      /excel/.test(text) ? 'Excel' : null,
      /power bi|tableau/.test(text) ? 'Data Visualisation' : null,
      /vba/.test(text) ? 'VBA' : null
    ].filter(Boolean),
    leadership: /leader|captain|committee|mentor/.test(text),
    communication: /presentation|communicat|stakeholder/.test(text)
  }

  return profile
}

export function listCvDocuments(userId: string) {
  const db = getDb()
  const docs = db.prepare(`
    SELECT d.*
    FROM documents d
    LEFT JOIN courses c ON c.id = d.course_id
    WHERE (LOWER(d.filename) LIKE '%cv%' OR LOWER(COALESCE(d.resource_type, '')) = 'cv')
      AND (COALESCE(c.user_id, 'default') = ? OR c.user_id IS NULL)
    ORDER BY COALESCE(d.updated_at, d.created_at) DESC
  `).all(userId) as any[]

  const linked = db.prepare('SELECT * FROM career_cv_documents WHERE user_id = ?').all(userId) as any[]

  return docs.map((doc) => {
    const mapping = linked.find((item) => item.document_id === doc.id)
    return {
      id: mapping?.id || null,
      documentId: doc.id,
      filename: doc.filename,
      label: mapping?.label || doc.filename,
      isPrimary: Boolean(mapping?.is_primary),
      extractedProfile: mapping?.extracted_profile ? fromJson(mapping.extracted_profile, {}) : null,
      summary: doc.summary || null,
      uploadDate: doc.upload_date || doc.created_at
    }
  })
}

export function setPrimaryCv(userId: string, input: {
  documentId: string
  label?: string
}) {
  ensureUser(userId)
  const db = getDb()
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(input.documentId) as any
  if (!doc) throw new Error('Document not found.')

  const now = nowIso()
  const raw = [doc.filename, doc.summary, doc.metadata].filter(Boolean).join('\n')
  const profile = extractCvProfile(raw)

  db.prepare('UPDATE career_cv_documents SET is_primary = 0, updated_at = ? WHERE user_id = ?').run(now, userId)

  db.prepare(`
    INSERT INTO career_cv_documents (id, user_id, document_id, label, is_primary, extracted_profile, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, document_id) DO UPDATE SET
      label = excluded.label,
      is_primary = excluded.is_primary,
      extracted_profile = excluded.extracted_profile,
      updated_at = excluded.updated_at
  `).run(
    id('cvdoc'),
    userId,
    input.documentId,
    input.label || doc.filename,
    1,
    toJson(profile),
    now,
    now
  )
}

/**
 * Links a freshly uploaded document into career_cv_documents without disturbing
 * an existing primary CV. Auto-promotes to primary only when the user has no
 * primary CV yet (e.g. their first CV upload).
 */
export function registerCvDocument(userId: string, input: {
  documentId: string
  label?: string
}) {
  ensureUser(userId)
  const db = getDb()
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(input.documentId) as any
  if (!doc) throw new Error('Document not found.')

  const now = nowIso()
  const raw = [doc.filename, doc.summary, doc.metadata].filter(Boolean).join('\n')
  const profile = extractCvProfile(raw)

  const existingPrimary = db.prepare('SELECT id FROM career_cv_documents WHERE user_id = ? AND is_primary = 1 LIMIT 1').get(userId) as any
  const makePrimary = !existingPrimary

  db.prepare(`
    INSERT INTO career_cv_documents (id, user_id, document_id, label, is_primary, extracted_profile, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, document_id) DO UPDATE SET
      label = excluded.label,
      extracted_profile = excluded.extracted_profile,
      updated_at = excluded.updated_at
  `).run(
    id('cvdoc'),
    userId,
    input.documentId,
    input.label || doc.filename,
    makePrimary ? 1 : 0,
    toJson(profile),
    now,
    now
  )

  return { isPrimary: makePrimary }
}

function requirementChecks(job: any, profileText: string) {
  const requirements = String(job.requirements || '').split(/\.|\n|,|;/).map((item) => item.trim()).filter(Boolean)
  const haystack = profileText.toLowerCase()

  return requirements.slice(0, 8).map((requirement) => {
    const words = requirement.toLowerCase().split(/\s+/).filter((word) => word.length > 2)
    const hitCount = words.filter((word) => haystack.includes(word)).length
    const ratio = words.length ? hitCount / words.length : 0

    let state = 'Unable to determine'
    let evidence: string | null = null

    if (ratio >= 0.7) {
      state = 'Evidence found'
      evidence = `Evidence overlaps with ${hitCount} key terms from the requirement.`
    } else if (ratio >= 0.35) {
      state = 'Partially demonstrated'
      evidence = 'Some relevant terms are present, but the evidence is incomplete.'
    } else if (words.length > 0) {
      state = 'Not demonstrated in CV'
      evidence = 'This requirement is not clearly demonstrated in the selected CV content.'
    }

    return {
      requirement,
      state,
      evidence
    }
  })
}

export function runCvMatch(userId: string, input: {
  jobId: string
  cvDocumentId?: string | null
}) {
  const db = getDb()
  const job = db.prepare(`${baseJobQuery()} AND j.id = ?`).get(input.jobId) as any
  if (!job) throw new Error('Job not found.')

  let cvRecord: any = null
  if (input.cvDocumentId) {
    cvRecord = db.prepare('SELECT * FROM career_cv_documents WHERE id = ? AND user_id = ?').get(input.cvDocumentId, userId) as any
  }

  if (!cvRecord) {
    cvRecord = db.prepare('SELECT * FROM career_cv_documents WHERE user_id = ? AND is_primary = 1 LIMIT 1').get(userId) as any
  }

  if (!cvRecord) {
    throw new Error('Select a CV first to run requirement matching.')
  }

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(cvRecord.document_id) as any
  const profileText = [doc?.filename, doc?.summary, doc?.metadata, JSON.stringify(fromJson(cvRecord.extracted_profile, {}))]
    .filter(Boolean)
    .join('\n')

  const checks = requirementChecks(job, profileText)

  const now = nowIso()
  const results = {
    company: job.company_name,
    role: job.job_title,
    checks,
    evaluatedAtUtc: now,
    note: 'Matching reflects evidence present in the selected CV content and does not predict hiring outcomes.'
  }

  db.prepare(`
    INSERT INTO career_requirement_matches (id, user_id, job_id, cv_document_id, results_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, job_id, cv_document_id) DO UPDATE SET
      results_json = excluded.results_json,
      updated_at = excluded.updated_at
  `).run(id('cvmatch'), userId, job.id, cvRecord.id, toJson(results), now, now)

  return results
}

export function getCareerPulse(userId: string) {
  const db = getDb()
  const activeApplications = db.prepare(`
    SELECT COUNT(1) as count
    FROM career_applications
    WHERE user_id = ? AND stage NOT IN ('Accepted', 'Rejected', 'Withdrawn', 'Closed')
  `).get(userId) as any

  const outstandingAssessments = db.prepare(`
    SELECT COUNT(1) as count
    FROM career_assessments
    WHERE user_id = ? AND status != 'Completed'
  `).get(userId) as any

  const interviews = db.prepare(`
    SELECT COUNT(1) as count
    FROM career_applications
    WHERE user_id = ? AND stage IN ('Interview', 'Phone Interview', 'Video Interview', 'Final Interview', 'Assessment Centre')
  `).get(userId) as any

  const needsAttention = db.prepare(`
    SELECT title, deadline_at_utc
    FROM career_assessments
    WHERE user_id = ? AND status != 'Completed' AND deadline_at_utc IS NOT NULL
    ORDER BY deadline_at_utc ASC
    LIMIT 3
  `).all(userId) as any[]

  return {
    activeApplications: Number(activeApplications?.count || 0),
    outstandingAssessments: Number(outstandingAssessments?.count || 0),
    interviews: Number(interviews?.count || 0),
    needsAttention: needsAttention.map((item) => ({
      title: item.title,
      deadlineAtUtc: item.deadline_at_utc
    }))
  }
}

export function setCompanyJobMode(companyId: string, mode: 'ACTIVE' | 'ZERO_JOBS' | 'SOURCE_UNAVAILABLE') {
  const db = getDb()
  const now = nowIso()

  if (mode === 'ACTIVE') {
    db.prepare('UPDATE career_jobs SET is_active = 1, last_verified = ?, updated_at = ? WHERE company_id = ?').run(now, now, companyId)
    updateCompanyCheckStatus(companyId, 'HEALTHY', null)
    return
  }

  if (mode === 'ZERO_JOBS') {
    db.prepare('UPDATE career_jobs SET is_active = 0, last_verified = ?, updated_at = ? WHERE company_id = ?').run(now, now, companyId)
    updateCompanyCheckStatus(companyId, 'HEALTHY', null)
    return
  }

  updateCompanyCheckStatus(companyId, 'SOURCE_UNAVAILABLE', 'Source temporarily unavailable during last check.')
}
