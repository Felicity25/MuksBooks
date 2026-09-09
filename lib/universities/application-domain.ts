import type {
  AdmissionsDeadline,
  ApplicantRoute,
  ApplicationDocument,
  ApplicationStatus,
  ApplicationTask,
  CurriculumResultsEvent,
  GradeKind,
  OfferCondition,
  UniversityApplication,
  UniversityOffer
} from './types'

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

export function normalizeUniversityApplication(value: Partial<UniversityApplication> & Record<string, unknown>): UniversityApplication {
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString()
  const route = APPLICANT_ROUTES.includes(value.applicantRoute as ApplicantRoute) ? value.applicantRoute as ApplicantRoute : 'SCHOOL_LEAVER'
  return {
    id: String(value.id || `${value.programmeId || 'programme'}-${Date.now()}`),
    userId: typeof value.userId === 'string' ? value.userId : undefined,
    programmeId: String(value.programmeId || ''),
    institutionId: String(value.institutionId || ''),
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
    deadlineIds: Array.isArray(value.deadlineIds) ? value.deadlineIds.map(String) : [],
    documents: Array.isArray(value.documents) ? value.documents : defaultApplicationDocuments(route),
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    offers: Array.isArray(value.offers) ? value.offers : [],
    timeline: Array.isArray(value.timeline) ? value.timeline : [],
    createdAt,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : createdAt
  }
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
    .sort((left, right) => left.dueAt.localeCompare(right.dueAt))
}

export function formatDateInTimezone(value: string, timezone?: string) {
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
    description: `University application: ${application.institutionId} / ${application.programmeId}`,
    taskType: 'university_application',
    priority: 'high',
    plannedDate: task.dueAt,
    dueDate: task.dueAt,
    estimatedMinutes: 45,
    generatedBy: 'university-application'
  }
}
