import type {
  AdmissionsDeadline,
  AdmissionsTestId,
  AdmissionsTestSession,
  ApplicantType,
  ApplicantRoute,
  ApplicationDocument,
  ApplicationStatus,
  ApplicationTask,
  CurriculumResultsEvent,
  GradeKind,
  OfferCondition,
  UniversityApplication,
  UniversityOffer,
  Institution,
  Programme,
  ResolvedApplicationRoute
} from './types'
import { getReviewedApplicationRoute } from './application-routes.ts'

const LEGACY_STATUS: Record<string, ApplicationStatus> = {
  Interested: 'INTERESTED',
  Researching: 'RESEARCHING',
  Preparing: 'PREPARING',
  Applied: 'APPLIED',
  Offer: 'CONDITIONAL_OFFER',
  Accepted: 'ACCEPTED',
  Rejected: 'REJECTED',
  Withdrawn: 'WITHDRAWN'
}

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'INTERESTED', 'RESEARCHING', 'PREPARING', 'READY_TO_APPLY', 'APPLICATION_OPEN',
  'APPLIED', 'DOCUMENTS_PENDING', 'AWAITING_DECISION', 'INTERVIEW_OR_ASSESSMENT',
  'CONDITIONAL_OFFER', 'UNCONDITIONAL_OFFER', 'WAITLISTED', 'REJECTED', 'ACCEPTED',
  'DECLINED', 'WITHDRAWN'
]

export const APPLICANT_ROUTES: ApplicantRoute[] = [
  'SCHOOL_LEAVER', 'GAP_YEAR', 'COLLEGE_TO_UNIVERSITY', 'DIPLOMA_TO_DEGREE',
  'UNIVERSITY_TRANSFER', 'CURRENT_UNIVERSITY_NEW_UNDERGRAD', 'FOUNDATION_PATHWAY', 'OTHER'
]

export function normalizeApplicationStatus(value: unknown): ApplicationStatus {
  const raw = String(value || 'INTERESTED')
  if (APPLICATION_STATUSES.includes(raw as ApplicationStatus)) return raw as ApplicationStatus
  return LEGACY_STATUS[raw] ?? 'INTERESTED'
}

export function defaultApplicationDocuments(route: ApplicantRoute): ApplicationDocument[] {
  const common: ApplicationDocument[] = [
    document('transcript', 'TRANSCRIPT', 'Academic transcript', true),
    document('identity', 'PASSPORT', 'Passport or identity document', true),
    document('statement', 'PERSONAL_STATEMENT', 'Personal statement or motivation letter', false),
    document('reference', 'REFERENCE', 'Academic reference', false)
  ]
  if (['COLLEGE_TO_UNIVERSITY', 'DIPLOMA_TO_DEGREE', 'UNIVERSITY_TRANSFER', 'CURRENT_UNIVERSITY_NEW_UNDERGRAD'].includes(route)) {
    common.push(
      document('tertiary-transcript', 'TERTIARY_TRANSCRIPT', 'Tertiary transcript', true),
      document('course-outlines', 'COURSE_OUTLINES', 'Course outlines for possible credit assessment', false),
      document('transfer-documents', 'TRANSFER_DOCUMENTATION', 'Transfer or advanced-standing documents', false)
    )
  } else {
    common.push(document('predicted-grades', 'PREDICTED_GRADES', 'Predicted grades', false))
  }
  return common
}

function document(id: string, type: ApplicationDocument['type'], label: string, required: boolean): ApplicationDocument {
  return { id, type, label, required, status: 'NOT_STARTED' }
}

export function createUniversityApplication(programmeId: string, institutionId: string, now = new Date(), route: ApplicantRoute = 'SCHOOL_LEAVER'): UniversityApplication {
  const timestamp = now.toISOString()
  return {
    id: `${programmeId}-${now.getTime()}`,
    programmeId,
    institutionId,
    dataOrigin: 'OFFICIAL_VERIFIED',
    intakeYear: now.getUTCFullYear() + 1,
    applicantRoute: route,
    status: 'INTERESTED',
    notes: '',
    deadlineIds: [],
    documents: defaultApplicationDocuments(route),
    tasks: [],
    offers: [],
    timeline: [{ id: `started-${now.getTime()}`, type: 'APPLICATION_CREATED', occurredAt: timestamp, description: 'Application tracking started.' }],
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export interface ManualApplicationInput {
  university: string
  programme: string
  country: string
  intakeYear: number
  intakeTerm?: string
  applicantType: ApplicantType
  applicationMethod?: string
  applicationPortalUrl?: string
  userDeadline?: string
  status?: ApplicationStatus
  applicationReference?: string
  notes?: string
}

export function createManualUniversityApplication(input: ManualApplicationInput, now = new Date()): UniversityApplication {
  const timestamp = now.toISOString()
  const token = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
  return {
    ...createUniversityApplication(`custom-programme-${token}`, `custom-institution-${token}`, now),
    id: `custom-application-${token}`,
    customInstitutionName: input.university.trim(),
    customProgrammeName: input.programme.trim(),
    customCountry: input.country.trim(),
    dataOrigin: 'USER_ENTERED',
    intakeYear: input.intakeYear,
    intakeTerm: input.intakeTerm?.trim() || undefined,
    applicantContext: {
      citizenships: [],
      targetCountry: input.country.trim(),
      likelyApplicantType: input.applicantType,
      explanation: 'Applicant type selected by the learner for this manually entered application.'
    },
    status: input.status ?? 'INTERESTED',
    applicationMethod: input.applicationMethod?.trim() || undefined,
    applicationPortalUrl: input.applicationPortalUrl?.trim() || undefined,
    applicationReference: input.applicationReference?.trim() || undefined,
    userDeadline: input.userDeadline || undefined,
    notes: input.notes?.trim() || '',
    timeline: [{ id: `started-${token}`, type: 'APPLICATION_CREATED', occurredAt: timestamp, description: 'User-entered application tracking started.' }]
  }
}

export function normalizeUniversityApplication(value: Partial<UniversityApplication> & Record<string, unknown>): UniversityApplication {
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString()
  const route = APPLICANT_ROUTES.includes(value.applicantRoute as ApplicantRoute) ? value.applicantRoute as ApplicantRoute : 'SCHOOL_LEAVER'
  return {
    id: String(value.id || `${value.programmeId || 'programme'}-${Date.now()}`),
    userId: typeof value.userId === 'string' ? value.userId : undefined,
    programmeId: String(value.programmeId || ''),
    institutionId: String(value.institutionId || ''),
    customInstitutionName: typeof value.customInstitutionName === 'string' ? value.customInstitutionName : undefined,
    customProgrammeName: typeof value.customProgrammeName === 'string' ? value.customProgrammeName : undefined,
    customCountry: typeof value.customCountry === 'string' ? value.customCountry : undefined,
    dataOrigin: ['OFFICIAL_VERIFIED', 'OFFICIAL_AUTO_EXTRACTED', 'USER_ENTERED'].includes(String(value.dataOrigin)) ? value.dataOrigin as UniversityApplication['dataOrigin'] : undefined,
    intakeYear: Number(value.intakeYear) || new Date().getUTCFullYear() + 1,
    intakeTerm: typeof value.intakeTerm === 'string' ? value.intakeTerm : undefined,
    applicantRoute: route,
    applicantContext: value.applicantContext,
    status: normalizeApplicationStatus(value.status),
    applicationMethod: typeof value.applicationMethod === 'string' ? value.applicationMethod : undefined,
    applicationPortalUrl: typeof value.applicationPortalUrl === 'string' ? value.applicationPortalUrl : undefined,
    applicationReference: typeof value.applicationReference === 'string' ? value.applicationReference : undefined,
    resultsContext: value.resultsContext && typeof value.resultsContext === 'object' ? value.resultsContext : undefined,
    startedAt: typeof value.startedAt === 'string' ? value.startedAt : createdAt,
    submittedAt: typeof value.submittedAt === 'string' ? value.submittedAt : undefined,
    notes: String(value.notes || ''),
    deadline: typeof value.deadline === 'string' ? value.deadline : undefined,
    userDeadline: typeof value.userDeadline === 'string' ? value.userDeadline : undefined,
    userDeadlineNote: typeof value.userDeadlineNote === 'string' ? value.userDeadlineNote : undefined,
    deadlineIds: Array.isArray(value.deadlineIds) ? value.deadlineIds.map(String) : [],
    documents: Array.isArray(value.documents) ? value.documents : defaultApplicationDocuments(route),
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    offers: Array.isArray(value.offers) ? value.offers : [],
    timeline: Array.isArray(value.timeline) ? value.timeline : [],
    createdAt,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : createdAt
  }
}

function routeMethod(url: string) {
  const normalized = url.toLowerCase()
  if (normalized.includes('ucas.com')) return ['UCAS', 'Apply via UCAS'] as const
  if (normalized.includes('vtac.edu.au')) return ['VTAC', 'Apply via VTAC'] as const
  if (normalized.includes('uac.edu.au')) return ['UAC', 'Apply via UAC'] as const
  if (normalized.includes('qtac.edu.au')) return ['QTAC', 'Apply via QTAC'] as const
  if (normalized.includes('satac.edu.au')) return ['SATAC', 'Apply via SATAC'] as const
  if (normalized.includes('tisc.edu.au')) return ['TISC', 'Apply via TISC'] as const
  if (normalized.includes('ouac.on.ca')) return ['OUAC', 'Apply via OUAC'] as const
  if (normalized.includes('commonapp.org')) return ['Common App', 'Open Common App'] as const
  if (normalized.includes('universityofcalifornia.edu')) return ['UC application', 'Open UC application'] as const
  return ['Direct to university', 'Apply directly'] as const
}

export function resolveApplicationRoute(programme: Programme, institution: Institution, applicantType: ApplicantType): ResolvedApplicationRoute {
  const applicantUrl = applicantType === 'DOMESTIC'
    ? programme.domesticApplicationUrl
    : applicantType === 'INTERNATIONAL'
      ? programme.internationalApplicationUrl
      : undefined
  const institutionUrl = applicantType === 'INTERNATIONAL' ? institution.internationalAdmissionsUrl : undefined
  const reviewedRoute = getReviewedApplicationRoute(institution.id, applicantType)
  const candidates = [
    applicantUrl,
    programme.applicationUrl,
    reviewedRoute?.url,
    programme.centralApplicationUrl,
    programme.programmeAdmissionsUrl,
    institution.applicationUrl,
    institutionUrl,
    institution.undergraduateAdmissionsUrl,
    programme.admissionsUrl,
    institution.admissionsUrl
  ]
  const url = candidates.find(Boolean)
  if (!url) return { method: 'Not indexed', ctaLabel: 'Open university website', url: institution.officialWebsite, source: 'OFFICIAL_VERIFIED', explanation: 'No more specific official application destination is indexed yet.' }
  if (reviewedRoute?.url === url) return { method: reviewedRoute.method, ctaLabel: reviewedRoute.ctaLabel, url, source: 'OFFICIAL_VERIFIED', explanation: reviewedRoute.explanation }
  const [method, ctaLabel] = routeMethod(url)
  return { method, ctaLabel, url, source: 'OFFICIAL_VERIFIED', explanation: applicantType === 'UNCERTAIN' ? 'Confirm your applicant type before applying; this is the best currently indexed official route.' : `Selected for the ${applicantType.toLowerCase()} applicant context.` }
}

export function reconcileDeadline(previous: AdmissionsDeadline | undefined, incoming: AdmissionsDeadline) {
  if (!previous) return { deadline: incoming, changed: false, conflict: false }
  if (previous.dueAt === incoming.dueAt) return { deadline: { ...previous, ...incoming, previousValues: previous.previousValues }, changed: false, conflict: false }
  if (previous.confidenceStatus === 'VERIFIED_OFFICIAL' && incoming.confidenceStatus !== 'VERIFIED_OFFICIAL') {
    return { deadline: { ...previous, confidenceStatus: 'CONFLICTING' as const }, changed: false, conflict: true }
  }
  return {
    deadline: {
      ...previous,
      ...incoming,
      previousValues: [...(previous.previousValues ?? []), { dueAt: previous.dueAt, detectedAt: incoming.lastCheckedAt, sourceUrl: previous.sourceUrl }]
    },
    changed: true,
    conflict: false
  }
}

export function deadlinesForApplication(application: UniversityApplication, deadlines: AdmissionsDeadline[]) {
  return deadlines
    .filter((deadline) => deadline.institutionId === application.institutionId)
    .filter((deadline) => !deadline.programmeId || deadline.programmeId === application.programmeId)
    .filter((deadline) => deadline.intakeYear === application.intakeYear)
    .filter((deadline) => !deadline.applicantRoute || deadline.applicantRoute === application.applicantRoute)
    .filter((deadline) => !deadline.applicantType || deadline.applicantType === application.applicantContext?.likelyApplicantType)
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt))
}

export function formatDateInTimezone(value: string, timezone?: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: timezone || 'UTC' })
}

export function formatDeadlineDate(deadline: Pick<AdmissionsDeadline, 'dueAt' | 'timezone'>) {
  return formatDateInTimezone(deadline.dueAt, deadline.timezone)
}

export function syncDeadlineTasks(application: UniversityApplication, deadlines: AdmissionsDeadline[], now = new Date()) {
  const deadlineMap = new Map(deadlines.map((deadline) => [deadline.id, deadline]))
  const changedTaskIds: string[] = []
  const tasks = application.tasks.map((task) => {
    const deadline = task.sourceDeadlineId ? deadlineMap.get(task.sourceDeadlineId) : undefined
    if (!deadline || deadline.dueAt === task.dueAt) return task
    changedTaskIds.push(task.id)
    return { ...task, dueAt: deadline.dueAt, updatedAt: now.toISOString() }
  })
  if (!changedTaskIds.length) return { application, changedTaskIds }
  return {
    application: {
      ...application,
      tasks,
      timeline: [...application.timeline, { id: `deadline-update-${now.getTime()}`, type: 'DEADLINE_UPDATED', occurredAt: now.toISOString(), description: `University deadline updated. ${changedTaskIds.length} linked task${changedTaskIds.length === 1 ? '' : 's'} changed.` }],
      updatedAt: now.toISOString()
    },
    changedTaskIds
  }
}

export function createAdmissionsTestTasks(testId: AdmissionsTestId, testName: string, session: AdmissionsTestSession, now = new Date()): ApplicationTask[] {
  const timestamp = now.toISOString()
  return [
    { id: `test-register-${now.getTime()}`, title: `Register for ${testName}`, dueAt: session.registrationDeadline, completed: false, sourceTestId: testId, sourceTestSessionId: session.id, sourceTestMilestone: 'REGISTRATION_DEADLINE', createdAt: timestamp, updatedAt: timestamp },
    { id: `test-sit-${now.getTime()}`, title: `Take ${testName}`, dueAt: session.testStartsAt, completed: false, sourceTestId: testId, sourceTestSessionId: session.id, sourceTestMilestone: 'TEST_DATE', createdAt: timestamp, updatedAt: timestamp },
    { id: `test-submit-${now.getTime()}`, title: `Submit ${testName} results`, completed: false, sourceTestId: testId, sourceRequirementId: `test-results-${testId}`, createdAt: timestamp, updatedAt: timestamp }
  ]
}

export function syncTestSessionTasks(application: UniversityApplication, sessions: AdmissionsTestSession[], now = new Date()) {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]))
  const changedTaskIds: string[] = []
  const tasks = application.tasks.map((task) => {
    const session = task.sourceTestSessionId ? sessionMap.get(task.sourceTestSessionId) : undefined
    if (!session || !task.sourceTestMilestone) return task
    const dueAt = task.sourceTestMilestone === 'REGISTRATION_DEADLINE' ? session.registrationDeadline : task.sourceTestMilestone === 'TEST_DATE' ? session.testStartsAt : task.dueAt
    if (!dueAt || dueAt === task.dueAt) return task
    changedTaskIds.push(task.id)
    return { ...task, dueAt, updatedAt: now.toISOString() }
  })
  if (!changedTaskIds.length) return { application, changedTaskIds }
  return {
    application: {
      ...application,
      tasks,
      timeline: [...application.timeline, { id: `test-date-update-${now.getTime()}`, type: 'TEST_DATE_UPDATED', occurredAt: now.toISOString(), description: `Admissions test date updated. ${changedTaskIds.length} linked task${changedTaskIds.length === 1 ? '' : 's'} changed.` }],
      updatedAt: now.toISOString()
    },
    changedTaskIds
  }
}

export function matchResultsEvent(curriculum: string, examSession: string, examYear: number, events: CurriculumResultsEvent[]) {
  return events.find((event) => event.curriculum === curriculum && event.examSession === examSession && event.examYear === examYear && event.eventType === 'RESULTS_RELEASE')
}

export function describeResultsTiming(event: CurriculumResultsEvent | undefined, now = new Date()) {
  if (!event) return 'Waiting for final results. An exact release date has not been verified for this session and year.'
  const days = (new Date(event.dateTime).getTime() - now.getTime()) / 86_400_000
  if (days < 0) return "Results are now available. Review your university's instructions."
  if (days <= 30) return `Your ${event.curriculum} results are expected soon.`
  return 'Waiting for final results.'
}

export function describeOfferCondition(condition: OfferCondition, recorded: { kind: GradeKind; value?: number; grade?: string } | undefined) {
  if (!recorded) return 'No matching result has been recorded.'
  const meetsNumeric = condition.minimumValue !== undefined && recorded.value !== undefined && recorded.value >= condition.minimumValue
  const meetsGrade = condition.minimumGrade && recorded.grade && recorded.grade >= condition.minimumGrade
  const appearsToMeet = Boolean(meetsNumeric || meetsGrade)
  if (recorded.kind === 'PREDICTED') return appearsToMeet ? 'Your predicted result is currently above this condition. This does not satisfy the offer.' : 'Your predicted result is currently below this condition.'
  if (recorded.kind === 'TARGET') return 'Target grades are aspirational and are not used to assess offer conditions.'
  if (recorded.kind === 'FINAL') return appearsToMeet ? 'Your recorded final result appears to satisfy this condition. Await university confirmation.' : 'Your recorded final result appears below this condition. Check with the university.'
  return appearsToMeet ? 'Your current result is above this condition, but final results and university confirmation are still required.' : 'Your current result is below this condition.'
}

export function addOffer(application: UniversityApplication, offer: UniversityOffer): UniversityApplication {
  return {
    ...application,
    status: offer.offerType === 'UNCONDITIONAL' ? 'UNCONDITIONAL_OFFER' : offer.offerType === 'WAITLIST' ? 'WAITLISTED' : 'CONDITIONAL_OFFER',
    offers: [...application.offers.filter((item) => item.id !== offer.id), offer],
    timeline: [...application.timeline, { id: `offer-${offer.id}`, type: 'OFFER_RECEIVED', occurredAt: offer.receivedAt, description: `${offer.offerType.replace(/_/g, ' ')} offer recorded.` }],
    updatedAt: offer.receivedAt
  }
}

export function plannerPayloadForTask(application: UniversityApplication, task: ApplicationTask) {
  return {
    title: task.title,
    description: `University application: ${application.institutionId} / ${application.programmeId}${task.sourceTestId ? ` • Test: ${task.sourceTestId}` : ''}`,
    taskType: 'university_application',
    priority: 'high',
    plannedDate: task.dueAt,
    dueDate: task.dueAt,
    estimatedMinutes: 45,
    generatedBy: 'university-application'
  }
}
