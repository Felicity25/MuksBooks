import crypto from 'crypto'
import {
  createUserTask,
  findUserTaskByCareerAssessment,
  setUserTaskCompletion,
  updateUserTask
} from '@/lib/cloud/service'

type SupabaseClient = any

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

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

function normalizeText(value?: string | null) {
  return (value || '').trim().toLowerCase()
}

function parseJsonArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]
  return value.map((item) => String(item || '').trim()).filter(Boolean)
}

function matchesPreference(jobValue: string | null | undefined, selected: string[]) {
  if (!selected.length) return true
  const job = normalizeText(jobValue)
  if (!job) return false
  return selected.some((item) => job.includes(normalizeText(item)))
}

function extractCvProfile(raw: string) {
  const text = raw.toLowerCase()
  return {
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

export async function isCareersCloudReady(client: SupabaseClient) {
  const { error } = await client.from('career_companies').select('id').limit(1)
  return !error
}

export async function listCompaniesSupabase(client: SupabaseClient) {
  const { data, error } = await client
    .from('career_companies')
    .select('id, name, slug, official_careers_url, profile_created')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  const { data: counts, error: countError } = await client
    .from('career_jobs')
    .select('company_id, id')
    .eq('is_active', true)

  if (countError) throw new Error(countError.message)

  const byCompany = new Map<string, number>()
  for (const row of counts || []) {
    const key = String(row.company_id)
    byCompany.set(key, (byCompany.get(key) || 0) + 1)
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    officialCareersUrl: row.official_careers_url,
    profileCreated: Boolean(row.profile_created),
    activeJobCount: byCompany.get(String(row.id)) || 0
  }))
}

export async function listDiscoverJobsSupabase(client: SupabaseClient, filters: {
  q?: string
  roleTypes?: string[]
  disciplines?: string[]
  countries?: string[]
  companies?: string[]
}) {
  const { data, error } = await client
    .from('career_jobs')
    .select(`
      id, company_id, external_job_id, job_title, location, city, country, role_type, discipline,
      description, requirements, opening_date, closing_date, closing_time, application_url,
      source_url, source_type, work_rights_information, international_student_information,
      date_found, last_verified, source_timezone,
      career_companies!inner(id, name, slug, official_careers_url, profile_created)
    `)
    .eq('is_active', true)
    .order('last_verified', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const q = normalizeText(filters.q)
  const roleTypes = (filters.roleTypes || []).map((v) => normalizeText(v))
  const disciplines = (filters.disciplines || []).map((v) => normalizeText(v))
  const countries = (filters.countries || []).map((v) => normalizeText(v))
  const companies = (filters.companies || []).map((v) => normalizeText(v))

  const rows = (data || []).filter((row: any) => {
    const company = row.career_companies
    const searchHaystack = [
      company?.name,
      row.job_title,
      row.description,
      row.requirements
    ].join(' ').toLowerCase()

    if (q && !searchHaystack.includes(q)) return false
    if (roleTypes.length && !roleTypes.includes(normalizeText(row.role_type))) return false
    if (disciplines.length && !disciplines.includes(normalizeText(row.discipline))) return false
    if (countries.length && !countries.includes(normalizeText(row.country))) return false
    if (companies.length && !companies.includes(normalizeText(company?.name))) return false
    return true
  })

  return rows.map((row: any) => {
    const company = row.career_companies
    return {
      id: row.id,
      companyId: row.company_id,
      company: company?.name || null,
      companySlug: company?.slug || null,
      companyProfileAvailable: Boolean(company?.profile_created),
      officialCareersUrl: company?.official_careers_url || null,
      jobTitle: row.job_title,
      externalJobId: row.external_job_id,
      location: row.location,
      city: row.city,
      country: row.country,
      roleType: row.role_type,
      discipline: row.discipline,
      description: row.description,
      requirements: row.requirements,
      openingDate: row.opening_date,
      closingDate: row.closing_date,
      closingTime: row.closing_time,
      applicationUrl: row.application_url,
      sourceUrl: row.source_url,
      sourceType: row.source_type,
      workRightsInformation: row.work_rights_information || 'Not stated',
      internationalStudentInformation: row.international_student_information || 'Not stated',
      dateFound: row.date_found,
      lastVerified: row.last_verified,
      sourceTimezone: row.source_timezone
    }
  })
}

export async function getCompanyDetailsSupabase(client: SupabaseClient, companyId: string, userId?: string) {
  const { data: company, error } = await client
    .from('career_companies')
    .select('id, name, slug, official_careers_url, profile_created')
    .eq('id', companyId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!company) return null

  const { data: jobs, error: jobsError } = await client
    .from('career_jobs')
    .select('id, job_title, location, role_type, discipline, application_url, source_url, last_verified')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('last_verified', { ascending: false, nullsFirst: false })

  if (jobsError) throw new Error(jobsError.message)

  const { data: check, error: checkError } = await client
    .from('career_company_checks')
    .select('status, last_checked_at, last_successful_check_at, error_message')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (checkError) throw new Error(checkError.message)

  let followed = false
  if (userId) {
    const { data: follow, error: followError } = await client
      .from('career_company_follows')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (followError) throw new Error(followError.message)
    followed = Boolean(follow?.id)
  }

  const activeJobCount = (jobs || []).length
  const qualifiesNow = Boolean(company.name && company.official_careers_url && activeJobCount > 0)
  const pageAvailable = Boolean(company.profile_created) || qualifiesNow || followed

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    officialCareersUrl: company.official_careers_url,
    pageAvailable,
    activeJobCount,
    status: check?.status || 'HEALTHY',
    lastCheckedAt: check?.last_checked_at || null,
    lastSuccessfulCheckAt: check?.last_successful_check_at || null,
    sourceError: check?.error_message || null,
    jobs: (jobs || []).map((job: any) => ({
      id: job.id,
      jobTitle: job.job_title,
      location: job.location,
      roleType: job.role_type,
      discipline: job.discipline,
      applicationUrl: job.application_url,
      sourceUrl: job.source_url,
      lastVerified: job.last_verified
    }))
  }
}

export async function getCareerSettingsSupabase(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('career_settings')
    .select('timezone, timezone_confirmed, auto_add_deadlines_to_planner')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (!data) {
    const { error: insertError } = await client.from('career_settings').insert({
      user_id: userId,
      timezone: DEFAULT_TIMEZONE,
      timezone_confirmed: false,
      auto_add_deadlines_to_planner: false
    })
    if (insertError) throw new Error(insertError.message)

    return {
      timezone: DEFAULT_TIMEZONE,
      timezoneConfirmed: false,
      autoAddDeadlinesToPlanner: false
    }
  }

  return {
    timezone: data.timezone || DEFAULT_TIMEZONE,
    timezoneConfirmed: Boolean(data.timezone_confirmed),
    autoAddDeadlinesToPlanner: Boolean(data.auto_add_deadlines_to_planner)
  }
}

export async function updateCareerSettingsSupabase(client: SupabaseClient, userId: string, updates: {
  timezone?: string
  timezoneConfirmed?: boolean
  autoAddDeadlinesToPlanner?: boolean
}) {
  const current = await getCareerSettingsSupabase(client, userId)
  const payload = {
    user_id: userId,
    timezone: updates.timezone || current.timezone,
    timezone_confirmed: updates.timezoneConfirmed ?? current.timezoneConfirmed,
    auto_add_deadlines_to_planner: updates.autoAddDeadlinesToPlanner ?? current.autoAddDeadlinesToPlanner
  }

  const { error } = await client.from('career_settings').upsert(payload, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)

  return {
    timezone: payload.timezone,
    timezoneConfirmed: Boolean(payload.timezone_confirmed),
    autoAddDeadlinesToPlanner: Boolean(payload.auto_add_deadlines_to_planner)
  }
}

export async function followCompanySupabase(client: SupabaseClient, userId: string, input: {
  companyId: string
  roleTypes?: string[]
  disciplines?: string[]
  countries?: string[]
}) {
  const { error } = await client.from('career_company_follows').upsert({
    id: makeId('follow'),
    user_id: userId,
    company_id: input.companyId,
    role_types: parseJsonArray(input.roleTypes),
    disciplines: parseJsonArray(input.disciplines),
    countries: parseJsonArray(input.countries)
  }, { onConflict: 'user_id,company_id' })

  if (error) throw new Error(error.message)
}

export async function unfollowCompanySupabase(client: SupabaseClient, userId: string, companyId: string) {
  const { error } = await client
    .from('career_company_follows')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId)

  if (error) throw new Error(error.message)
}

export async function listFollowingSupabase(client: SupabaseClient, userId: string) {
  const { data: follows, error } = await client
    .from('career_company_follows')
    .select('id, company_id, role_types, disciplines, countries, updated_at, created_at, career_companies!inner(name, slug, official_careers_url)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  const companyIds = (follows || []).map((item: any) => item.company_id)

  const [jobsResponse, checksResponse] = await Promise.all([
    client
      .from('career_jobs')
      .select('id, company_id, job_title, location, country, role_type, discipline, application_url, last_verified')
      .in('company_id', companyIds.length ? companyIds : ['__none__'])
      .eq('is_active', true),
    client
      .from('career_company_checks')
      .select('company_id, status, last_checked_at, last_successful_check_at, error_message')
      .in('company_id', companyIds.length ? companyIds : ['__none__'])
      .order('updated_at', { ascending: false })
  ])

  if (jobsResponse.error) throw new Error(jobsResponse.error.message)
  if (checksResponse.error) throw new Error(checksResponse.error.message)

  const jobsByCompany = new Map<string, any[]>()
  for (const job of jobsResponse.data || []) {
    const key = String(job.company_id)
    const bucket = jobsByCompany.get(key) || []
    bucket.push(job)
    jobsByCompany.set(key, bucket)
  }

  const checkByCompany = new Map<string, any>()
  for (const check of checksResponse.data || []) {
    const key = String(check.company_id)
    if (!checkByCompany.has(key)) checkByCompany.set(key, check)
  }

  return (follows || []).map((row: any) => {
    const company = row.career_companies
    const roleTypes = parseJsonArray(row.role_types)
    const disciplines = parseJsonArray(row.disciplines)
    const countries = parseJsonArray(row.countries)

    const companyJobs = jobsByCompany.get(String(row.company_id)) || []
    const matchingJobs = companyJobs.filter((job) => (
      matchesPreference(job.role_type, roleTypes)
      && matchesPreference(job.discipline, disciplines)
      && matchesPreference(job.country, countries)
    ))

    const check = checkByCompany.get(String(row.company_id))

    let state: 'MATCHING_AVAILABLE' | 'NO_MATCHING' | 'NO_OPENINGS' | 'SOURCE_UNAVAILABLE' = 'NO_OPENINGS'
    let summary = 'No current openings found.'

    if (check?.status === 'SOURCE_UNAVAILABLE') {
      state = 'SOURCE_UNAVAILABLE'
      summary = `We couldn't check ${company.name}'s careers listings right now.`
    } else if (companyJobs.length === 0) {
      state = 'NO_OPENINGS'
      summary = 'No current openings found.'
    } else if (matchingJobs.length === 0) {
      state = 'NO_MATCHING'
      summary = `${companyJobs.length} current ${company.name} opportunities found, but none match your selected preferences.`
    } else {
      state = 'MATCHING_AVAILABLE'
      summary = `${matchingJobs.length} role${matchingJobs.length === 1 ? '' : 's'} matching your preferences.`
    }

    return {
      id: row.id,
      companyId: row.company_id,
      company: company.name,
      companySlug: company.slug,
      officialCareersUrl: company.official_careers_url,
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
        applicationUrl: job.application_url,
        lastVerified: job.last_verified
      }))
    }
  })
}

function buildJobSnapshot(job: any) {
  const company = job.career_companies
  return {
    jobId: job.id,
    companyId: job.company_id,
    company: company?.name || null,
    jobTitle: job.job_title,
    description: job.description,
    requirements: job.requirements,
    location: job.location,
    roleType: job.role_type,
    discipline: job.discipline,
    closingDate: job.closing_date,
    closingTime: job.closing_time,
    applicationUrl: job.application_url,
    sourceUrl: job.source_url,
    sourceType: job.source_type,
    workRightsInformation: job.work_rights_information || 'Not stated',
    internationalStudentInformation: job.international_student_information || 'Not stated',
    lastVerified: job.last_verified
  }
}

export async function saveRoleSupabase(client: SupabaseClient, userId: string, jobId: string) {
  const { data: job, error: jobError } = await client
    .from('career_jobs')
    .select(`
      id, company_id, job_title, description, requirements, location, role_type, discipline,
      closing_date, closing_time, application_url, source_url, source_type,
      work_rights_information, international_student_information, last_verified,
      career_companies!inner(name)
    `)
    .eq('id', jobId)
    .maybeSingle()

  if (jobError) throw new Error(jobError.message)
  if (!job) throw new Error('Job not found.')

  const { error } = await client.from('career_saved_jobs').upsert({
    id: makeId('saved'),
    user_id: userId,
    job_id: jobId,
    job_snapshot: buildJobSnapshot(job)
  }, { onConflict: 'user_id,job_id' })

  if (error) throw new Error(error.message)
}

export async function unsaveRoleSupabase(client: SupabaseClient, userId: string, jobId: string) {
  const { error } = await client
    .from('career_saved_jobs')
    .delete()
    .eq('user_id', userId)
    .eq('job_id', jobId)

  if (error) throw new Error(error.message)
}

export async function listSavedRolesSupabase(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('career_saved_jobs')
    .select('id, job_id, date_saved, job_snapshot')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row: any) => ({
    id: row.id,
    jobId: row.job_id,
    dateSaved: row.date_saved,
    snapshot: row.job_snapshot || {}
  }))
}

export async function createApplicationFromJobSupabase(client: SupabaseClient, userId: string, input: {
  jobId: string
  stage?: CareerStage
  notes?: string
  appliedAtUtc?: string
}) {
  const { data: job, error: jobError } = await client
    .from('career_jobs')
    .select('id, company_id, job_title, description, requirements, location, role_type, discipline, closing_date, closing_time, application_url, source_url, source_type, work_rights_information, international_student_information, last_verified, career_companies!inner(name)')
    .eq('id', input.jobId)
    .maybeSingle()

  if (jobError) throw new Error(jobError.message)
  if (!job) throw new Error('Job not found.')

  const stage = input.stage || 'Applied'
  const now = new Date().toISOString()
  const applicationId = makeId('app')

  const { error } = await client.from('career_applications').insert({
    id: applicationId,
    user_id: userId,
    company_id: job.company_id,
    job_id: job.id,
    job_snapshot: buildJobSnapshot(job),
    title: `${job.career_companies?.name || 'Company'} · ${job.job_title}`,
    stage,
    outstanding_actions: [],
    checklist: ['CV', 'Cover letter', 'Transcript', 'Work rights information'],
    notes: input.notes || null,
    applied_at_utc: input.appliedAtUtc || now
  })

  if (error) throw new Error(error.message)

  const { error: eventError } = await client.from('career_application_events').insert({
    id: makeId('appevt'),
    application_id: applicationId,
    user_id: userId,
    event_type: 'APPLICATION_CREATED',
    title: `Application tracked (${stage})`,
    details: `${job.career_companies?.name || 'Company'} · ${job.job_title}`,
    event_time_utc: input.appliedAtUtc || now
  })

  if (eventError) throw new Error(eventError.message)
  return applicationId
}

export async function updateApplicationSupabase(client: SupabaseClient, userId: string, applicationId: string, updates: {
  stage?: CareerStage
  notes?: string
  outstandingActions?: string[]
  checklist?: string[]
  cvDocumentId?: string | null
}) {
  const { data: existing, error: existingError } = await client
    .from('career_applications')
    .select('id, stage, notes, outstanding_actions, checklist, cv_document_id')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (!existing) throw new Error('Application not found.')

  const payload = {
    stage: updates.stage || existing.stage,
    notes: updates.notes ?? existing.notes,
    outstanding_actions: updates.outstandingActions ?? existing.outstanding_actions,
    checklist: updates.checklist ?? existing.checklist,
    cv_document_id: updates.cvDocumentId === undefined ? existing.cv_document_id : updates.cvDocumentId
  }

  const { error } = await client
    .from('career_applications')
    .update(payload)
    .eq('id', applicationId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  const { error: eventError } = await client.from('career_application_events').insert({
    id: makeId('appevt'),
    application_id: applicationId,
    user_id: userId,
    event_type: 'APPLICATION_UPDATED',
    title: updates.stage ? `Stage moved to ${updates.stage}` : 'Application updated',
    details: updates.stage ? null : 'Details updated',
    event_time_utc: new Date().toISOString()
  })

  if (eventError) throw new Error(eventError.message)
}

export async function listApplicationsSupabase(client: SupabaseClient, userId: string) {
  const { data: apps, error } = await client
    .from('career_applications')
    .select('id, company_id, title, stage, applied_at_utc, notes, outstanding_actions, checklist, job_snapshot, cv_document_id, created_at, updated_at, career_companies(name)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  const appIds = (apps || []).map((app: any) => app.id)
  const { data: events, error: eventsError } = await client
    .from('career_application_events')
    .select('id, application_id, event_type, title, details, event_time_utc, created_at')
    .in('application_id', appIds.length ? appIds : ['__none__'])
    .order('event_time_utc', { ascending: true })
    .order('created_at', { ascending: true })

  if (eventsError) throw new Error(eventsError.message)

  const eventsByApp = new Map<string, any[]>()
  for (const event of events || []) {
    const key = String(event.application_id)
    const bucket = eventsByApp.get(key) || []
    bucket.push(event)
    eventsByApp.set(key, bucket)
  }

  return (apps || []).map((row: any) => ({
    id: row.id,
    company: row.career_companies?.name || null,
    title: row.title,
    stage: row.stage,
    appliedAtUtc: row.applied_at_utc,
    notes: row.notes,
    outstandingActions: parseJsonArray(row.outstanding_actions),
    checklist: parseJsonArray(row.checklist),
    snapshot: row.job_snapshot || {},
    cvDocumentId: row.cv_document_id,
    timeline: (eventsByApp.get(String(row.id)) || []).map((item) => ({
      id: item.id,
      eventType: item.event_type,
      title: item.title,
      details: item.details,
      eventTimeUtc: item.event_time_utc
    }))
  }))
}

async function createPlannerTaskForAssessmentSupabase(_client: SupabaseClient, _userId: string, _assessment: any, _companyName: string | null) {
  const existing = await findUserTaskByCareerAssessment(_userId, _assessment.id)
  if (existing?.id) {
    await updateUserTask({
      userId: _userId,
      taskId: existing.id,
      due_date: _assessment.deadline_at_utc || null,
      planned_date: _assessment.deadline_at_utc || null
    })

    const { error } = await _client
      .from('career_assessments')
      .update({ planner_task_id: existing.id })
      .eq('id', _assessment.id)
      .eq('user_id', _userId)

    if (error) throw new Error(error.message)
    return existing.id as string
  }

  const title = `Complete ${_companyName || 'Company'} ${_assessment.title}`
  const task = await createUserTask({
    userId: _userId,
    career_assessment_id: _assessment.id,
    title,
    description: `Careers · ${_companyName || 'Employer'} recruitment workflow`,
    task_type: 'career',
    priority: 0.95,
    due_date: _assessment.deadline_at_utc || null,
    planned_date: _assessment.deadline_at_utc || null,
    estimated_minutes: 45
  })

  if (!task?.id) throw new Error('Could not create cloud planner task.')

  const { error } = await _client
    .from('career_assessments')
    .update({ planner_task_id: task.id })
    .eq('id', _assessment.id)
    .eq('user_id', _userId)

  if (error) throw new Error(error.message)
  return String(task.id)
}

export async function addAssessmentToPlannerSupabase(client: SupabaseClient, userId: string, assessmentId: string) {
  const { data: assessment, error } = await client
    .from('career_assessments')
    .select('id, title, deadline_at_utc, deadline_has_exact_time, company_id, planner_task_id')
    .eq('id', assessmentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!assessment) throw new Error('Assessment not found.')
  if (!assessment.deadline_has_exact_time || !assessment.deadline_at_utc) {
    throw new Error('Exact deadline time is required before auto-linking this assessment to Planner.')
  }

  const { data: company, error: companyError } = await client
    .from('career_companies')
    .select('name')
    .eq('id', assessment.company_id || '')
    .maybeSingle()

  if (companyError) throw new Error(companyError.message)
  return createPlannerTaskForAssessmentSupabase(client, userId, assessment, company?.name || null)
}

export async function createAssessmentSupabase(client: SupabaseClient, userId: string, input: {
  applicationId?: string | null
  companyId?: string | null
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
  const settings = await getCareerSettingsSupabase(client, userId)

  let computedDeadlineAtUtc = input.deadlineAtUtc || null
  if (!computedDeadlineAtUtc && input.deadlineRuleHours && input.invitationReceivedAtUtc) {
    const base = new Date(input.invitationReceivedAtUtc)
    if (!Number.isNaN(base.getTime())) {
      computedDeadlineAtUtc = new Date(base.getTime() + input.deadlineRuleHours * 60 * 60 * 1000).toISOString()
    }
  }

  const hasExact = Boolean(input.deadlineHasExactTime && computedDeadlineAtUtc)
  const assessmentId = makeId('carass')

  const { error } = await client.from('career_assessments').insert({
    id: assessmentId,
    user_id: userId,
    application_id: input.applicationId || null,
    company_id: input.companyId || null,
    assessment_type: input.assessmentType,
    title: input.title,
    status: 'Incomplete',
    invitation_received_at_utc: input.invitationReceivedAtUtc || null,
    deadline_rule_hours: input.deadlineRuleHours ?? null,
    deadline_at_utc: computedDeadlineAtUtc,
    deadline_date_only: input.deadlineDateOnly || null,
    deadline_has_exact_time: hasExact,
    employer_deadline_label: input.employerDeadlineLabel || null,
    employer_timezone: input.employerTimezone || null,
    assessment_url: input.assessmentUrl || null,
    notes: input.notes || null,
    completed_at_utc: null,
    planner_task_id: null
  })

  if (error) throw new Error(error.message)

  if (settings.autoAddDeadlinesToPlanner && hasExact) {
    const { data: company, error: companyError } = await client
      .from('career_companies')
      .select('name')
      .eq('id', input.companyId || '')
      .maybeSingle()
    if (companyError) throw new Error(companyError.message)

    await createPlannerTaskForAssessmentSupabase(client, userId, { id: assessmentId, deadline_at_utc: computedDeadlineAtUtc }, company?.name || null)
  }

  if (input.applicationId) {
    const { error: eventError } = await client.from('career_application_events').insert({
      id: makeId('appevt'),
      application_id: input.applicationId,
      user_id: userId,
      event_type: 'ASSESSMENT_ADDED',
      title: `Assessment added: ${input.title}`,
      details: input.deadlineRuleHours ? `Complete within ${input.deadlineRuleHours} hours` : null,
      event_time_utc: new Date().toISOString()
    })
    if (eventError) throw new Error(eventError.message)
  }

  return assessmentId
}

export async function updateAssessmentSupabase(client: SupabaseClient, userId: string, assessmentId: string, updates: {
  status?: 'Incomplete' | 'Completed'
  deadlineAtUtc?: string | null
  deadlineDateOnly?: string | null
  deadlineHasExactTime?: boolean
  notes?: string | null
}) {
  const { data: existing, error: existingError } = await client
    .from('career_assessments')
    .select('id, status, deadline_at_utc, deadline_date_only, deadline_has_exact_time, notes, completed_at_utc, planner_task_id')
    .eq('id', assessmentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (!existing) throw new Error('Assessment not found.')

  const nextStatus = updates.status || existing.status
  const completedAt = nextStatus === 'Completed'
    ? (existing.completed_at_utc || new Date().toISOString())
    : null

  const payload = {
    status: nextStatus,
    deadline_at_utc: updates.deadlineAtUtc === undefined ? existing.deadline_at_utc : updates.deadlineAtUtc,
    deadline_date_only: updates.deadlineDateOnly === undefined ? existing.deadline_date_only : updates.deadlineDateOnly,
    deadline_has_exact_time: updates.deadlineHasExactTime === undefined ? existing.deadline_has_exact_time : updates.deadlineHasExactTime,
    notes: updates.notes === undefined ? existing.notes : updates.notes,
    completed_at_utc: completedAt
  }

  const { error } = await client
    .from('career_assessments')
    .update(payload)
    .eq('id', assessmentId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  if (existing.planner_task_id) {
    await updateUserTask({
      userId,
      taskId: existing.planner_task_id,
      due_date: payload.deadline_at_utc,
      planned_date: payload.deadline_at_utc,
      status: nextStatus === 'Completed' ? 'completed' : 'pending'
    })
  }
}

export async function listCvDocumentsSupabase(client: SupabaseClient, userId: string, localDocuments: Array<any>) {
  const { data, error } = await client
    .from('career_cv_documents')
    .select('id, source_document_id, label, filename, summary, uploaded_at, extracted_profile, is_primary, updated_at')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  const cloudBySource = new Map<string, any>()
  for (const row of data || []) {
    cloudBySource.set(String(row.source_document_id), row)
  }

  const merged = localDocuments.map((doc) => {
    const cloud = cloudBySource.get(String(doc.documentId))
    return {
      id: cloud?.id || doc.id || null,
      documentId: doc.documentId,
      filename: cloud?.filename || doc.filename,
      label: cloud?.label || doc.label || doc.filename,
      isPrimary: cloud ? Boolean(cloud.is_primary) : Boolean(doc.isPrimary),
      extractedProfile: cloud?.extracted_profile || doc.extractedProfile || null,
      summary: cloud?.summary || doc.summary || null,
      uploadDate: cloud?.uploaded_at || doc.uploadDate
    }
  })

  for (const row of data || []) {
    if (localDocuments.some((doc) => String(doc.documentId) === String(row.source_document_id))) continue
    merged.push({
      id: row.id,
      documentId: row.source_document_id,
      filename: row.filename || row.label || 'CV',
      label: row.label || row.filename || 'CV',
      isPrimary: Boolean(row.is_primary),
      extractedProfile: row.extracted_profile || null,
      summary: row.summary || null,
      uploadDate: row.uploaded_at || null
    })
  }

  return merged.sort((left, right) => Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary)))
}

export async function setPrimaryCvSupabase(client: SupabaseClient, userId: string, input: {
  documentId: string
  label?: string
  localDocument?: any
}) {
  const source = input.localDocument || null
  const raw = [source?.filename, source?.summary, JSON.stringify(source?.extractedProfile || null)].filter(Boolean).join('\n')
  const profile = raw ? extractCvProfile(raw) : (source?.extractedProfile || null)

  const { error: resetError } = await client
    .from('career_cv_documents')
    .update({ is_primary: false })
    .eq('user_id', userId)

  if (resetError) throw new Error(resetError.message)

  const { error } = await client.from('career_cv_documents').upsert({
    id: makeId('cvdoc'),
    user_id: userId,
    source_document_id: input.documentId,
    label: input.label || source?.label || source?.filename || 'CV',
    filename: source?.filename || input.label || 'CV',
    summary: source?.summary || null,
    uploaded_at: source?.uploadDate || null,
    extracted_profile: profile,
    is_primary: true
  }, { onConflict: 'user_id,source_document_id' })

  if (error) throw new Error(error.message)
}

export async function runCvMatchSupabase(client: SupabaseClient, userId: string, input: {
  jobId: string
  cvDocumentId?: string | null
  localDocuments: Array<any>
}) {
  const { data: job, error: jobError } = await client
    .from('career_jobs')
    .select('id, company_id, job_title, requirements, career_companies!inner(name)')
    .eq('id', input.jobId)
    .maybeSingle()

  if (jobError) throw new Error(jobError.message)
  if (!job) throw new Error('Job not found.')

  let cvRecord: any = null

  if (input.cvDocumentId) {
    const { data, error } = await client
      .from('career_cv_documents')
      .select('id, source_document_id, label, filename, summary, extracted_profile, is_primary')
      .eq('user_id', userId)
      .or(`id.eq.${input.cvDocumentId},source_document_id.eq.${input.cvDocumentId}`)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    cvRecord = data
  }

  if (!cvRecord) {
    const { data, error } = await client
      .from('career_cv_documents')
      .select('id, source_document_id, label, filename, summary, extracted_profile, is_primary')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    cvRecord = data
  }

  if (!cvRecord) {
    const localPrimary = input.localDocuments.find((item) => item.isPrimary) || input.localDocuments[0]
    if (!localPrimary) throw new Error('Select a CV first to run requirement matching.')

    await setPrimaryCvSupabase(client, userId, {
      documentId: localPrimary.documentId,
      label: localPrimary.label || localPrimary.filename,
      localDocument: localPrimary
    })

    const { data, error } = await client
      .from('career_cv_documents')
      .select('id, source_document_id, label, filename, summary, extracted_profile, is_primary')
      .eq('user_id', userId)
      .eq('source_document_id', localPrimary.documentId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    cvRecord = data
  }

  if (!cvRecord) throw new Error('Select a CV first to run requirement matching.')

  const localDoc = input.localDocuments.find((item) => String(item.documentId) === String(cvRecord.source_document_id)) || null
  const profileText = [
    localDoc?.filename,
    localDoc?.summary,
    cvRecord.filename,
    cvRecord.summary,
    JSON.stringify(cvRecord.extracted_profile || null),
    JSON.stringify(localDoc?.extractedProfile || null)
  ].filter(Boolean).join('\n')

  const checks = requirementChecks(job, profileText)
  const results = {
    company: job.career_companies?.name || null,
    role: job.job_title,
    checks,
    evaluatedAtUtc: new Date().toISOString(),
    note: 'Matching reflects evidence present in the selected CV content and does not predict hiring outcomes.'
  }

  const { error } = await client.from('career_requirement_matches').upsert({
    id: makeId('cvmatch'),
    user_id: userId,
    job_id: job.id,
    cv_document_id: cvRecord.id,
    source_document_id: cvRecord.source_document_id,
    results_json: results
  }, { onConflict: 'user_id,job_id,source_document_id' })

  if (error) throw new Error(error.message)
  return results
}

export async function listAssessmentsSupabase(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('career_assessments')
    .select('id, assessment_type, title, status, invitation_received_at_utc, deadline_rule_hours, deadline_at_utc, deadline_date_only, deadline_has_exact_time, employer_deadline_label, employer_timezone, assessment_url, notes, completed_at_utc, planner_task_id, career_companies(name), career_applications(title)')
    .eq('user_id', userId)
    .order('deadline_at_utc', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row: any) => ({
    id: row.id,
    company: row.career_companies?.name || null,
    applicationTitle: row.career_applications?.title || null,
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

export async function getCareerPulseSupabase(client: SupabaseClient, userId: string) {
  const [appsResult, assessmentsResult, attentionResult] = await Promise.all([
    client
      .from('career_applications')
      .select('stage')
      .eq('user_id', userId),
    client
      .from('career_assessments')
      .select('status')
      .eq('user_id', userId),
    client
      .from('career_assessments')
      .select('title, deadline_at_utc')
      .eq('user_id', userId)
      .neq('status', 'Completed')
      .not('deadline_at_utc', 'is', null)
      .order('deadline_at_utc', { ascending: true })
      .limit(3)
  ])

  if (appsResult.error) throw new Error(appsResult.error.message)
  if (assessmentsResult.error) throw new Error(assessmentsResult.error.message)
  if (attentionResult.error) throw new Error(attentionResult.error.message)

  const closedStages = new Set(['Accepted', 'Rejected', 'Withdrawn', 'Closed'])
  const interviewStages = new Set(['Interview', 'Phone Interview', 'Video Interview', 'Final Interview', 'Assessment Centre'])

  const applications = appsResult.data || []
  const assessments = assessmentsResult.data || []

  const activeApplications = applications.filter((item: any) => !closedStages.has(String(item.stage || ''))).length
  const interviews = applications.filter((item: any) => interviewStages.has(String(item.stage || ''))).length
  const outstandingAssessments = assessments.filter((item: any) => String(item.status || '') !== 'Completed').length

  return {
    activeApplications,
    outstandingAssessments,
    interviews,
    needsAttention: (attentionResult.data || []).map((item: any) => ({
      title: item.title,
      deadlineAtUtc: item.deadline_at_utc
    }))
  }
}
