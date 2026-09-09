import type { LearnerProfile } from '../learner/store.ts'
import type {
  ApplicantRoute,
  ApplicantType,
  FundingApplication,
  FundingApplicationStatus,
  FundingDeadline,
  FundingEligibilityResult,
  FundingOpportunity,
  FundingStudyLevel,
  ApplicationDocument,
  ApplicationTask,
  Programme,
  ProgrammeCost
} from './types.ts'

export interface FundingContext {
  learnerProfile?: LearnerProfile | null
  destinationCountry?: string
  applicantType?: ApplicantType
  applicantRoute?: ApplicantRoute
  studyLevel?: FundingStudyLevel
  institutionId?: string
  programme?: Programme
  entryYear?: number
  financialNeedSupplied?: boolean
  eligibleCourseOrPlaceConfirmed?: boolean
  governmentEligibilityConfirmed?: boolean
}

const document = (id: string, type: ApplicationDocument['type'], label: string, required = false): ApplicationDocument => ({ id, type, label, required, status: 'NOT_STARTED' })

export function validHttpsUrl(value?: string) {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export function defaultFundingDocuments(opportunity?: FundingOpportunity): ApplicationDocument[] {
  const documents = [
    document('funding-transcript', 'TRANSCRIPT', 'Academic transcript or school report'),
    document('funding-statement', 'MOTIVATION_LETTER', 'Motivation letter or personal statement'),
    document('funding-citizenship', 'PROOF_CITIZENSHIP', 'Proof of citizenship'),
    document('funding-reference', 'REFERENCE', 'Reference')
  ]
  if (opportunity?.financialNeedRequirements?.length) documents.push(document('funding-income', 'INCOME_DOCUMENTATION', 'Income or financial-need documentation'))
  if (opportunity?.otherEligibility.some((criterion) => /offer/i.test(criterion))) documents.push(document('funding-offer', 'OFFER_LETTER', 'University offer letter'))
  return documents
}

const countryMatches = (values: string[], actual?: string) => !values.length || Boolean(actual && values.some((value) => value.toLowerCase() === actual.toLowerCase()))
const listMatches = (values: string[], actual?: string) => !values.length || Boolean(actual && values.includes(actual))

export function getFundingEligibility(opportunity: FundingOpportunity, context: FundingContext, now = new Date()): FundingEligibilityResult {
  const reasons: string[] = []
  const checks: string[] = []
  const missing: string[] = []
  const profile = context.learnerProfile
  const citizenships = profile?.universityPlanning.citizenships ?? []
  const residence = profile?.universityPlanning.residenceCountry || undefined
  const destination = context.destinationCountry || context.programme?.country

  if (!opportunity.active) return { state: 'NOT_APPLICABLE', reasons: [], checks: ['This funding cycle is not active.'], missing: [] }
  if (opportunity.applicationDeadline && new Date(`${opportunity.applicationDeadline}T23:59:59Z`).getTime() < now.getTime()) {
    return { state: 'DEADLINE_PASSED', reasons: [], checks: ['The published application deadline has passed. Check the provider for a future cycle.'], missing: [] }
  }
  if (opportunity.eligibleDestinationCountries.length && !destination) missing.push('Select a study destination to assess destination-specific funding.')
  else if (!countryMatches(opportunity.eligibleDestinationCountries, destination)) checks.push(`This opportunity does not fund study in ${destination || 'the selected destination'}.`)
  else if (destination) reasons.push(`Study destination ${destination} is within the published scope.`)
  if (opportunity.eligibleInstitutions.length && !context.institutionId) missing.push('Select an institution to assess institution-specific funding.')
  else if (!listMatches(opportunity.eligibleInstitutions, context.institutionId)) checks.push('The selected institution is outside the published scope.')
  else if (context.institutionId && opportunity.eligibleInstitutions.length) reasons.push('Selected institution is listed as eligible.')
  if (opportunity.eligibleProgrammes.length && !context.programme) missing.push('Select a programme to assess programme-specific funding.')
  else if (!listMatches(opportunity.eligibleProgrammes, context.programme?.id)) checks.push('The selected programme is outside the published scope.')
  if (opportunity.eligibleFaculties.length && !context.programme) missing.push('Select a programme to assess faculty-specific funding.')
  else if (!listMatches(opportunity.eligibleFaculties, context.programme?.facultyId)) checks.push('The selected faculty is outside the published scope.')
  if (opportunity.eligibleStudyAreas.length && !context.programme) missing.push('Select a programme to assess study-area funding.')
  else if (opportunity.eligibleStudyAreas.length && !context.programme?.studyAreas.some((area) => opportunity.eligibleStudyAreas.includes(area))) checks.push('The selected study area is outside the published scope.')
  if (opportunity.eligibleStudyLevels.length && (!context.studyLevel || !opportunity.eligibleStudyLevels.includes(context.studyLevel))) {
    if (!context.studyLevel) missing.push('Add your intended study level.')
    else checks.push('Your study level is outside the published scope.')
  }
  if (opportunity.domesticInternationalRules.length && (!context.applicantType || !opportunity.domesticInternationalRules.includes(context.applicantType))) {
    if (!context.applicantType || context.applicantType === 'UNCERTAIN') missing.push('Confirm domestic or international applicant status.')
    else checks.push(`This opportunity is not published for ${context.applicantType.toLowerCase()} applicants.`)
  }
  if (opportunity.applicantRouteRules.length && !context.applicantRoute) missing.push('Confirm your applicant route.')
  else if (opportunity.applicantRouteRules.length && !opportunity.applicantRouteRules.includes(context.applicantRoute!)) checks.push('Your applicant route is outside the published scope.')
  if (opportunity.citizenshipRules.length) {
    if (!citizenships.length) missing.push('Add citizenship to assess nationality-based funding.')
    else if (!opportunity.citizenshipRules.some((country) => citizenships.some((citizenship) => citizenship.toLowerCase() === country.toLowerCase()))) checks.push('Your recorded citizenship does not meet the published rule.')
    else reasons.push('Your recorded citizenship matches the published rule.')
  }
  if (opportunity.residenceRules.length) {
    if (!residence) missing.push('Add country of residence to assess residence-based funding.')
    else if (!countryMatches(opportunity.residenceRules, residence)) checks.push('Your recorded residence does not meet the published rule.')
    else reasons.push('Your recorded residence matches the published rule.')
  }
  if (opportunity.curriculumRules.length && !profile?.curriculum) missing.push('Add your curriculum to assess curriculum-specific funding.')
  else if (opportunity.curriculumRules.length && !opportunity.curriculumRules.includes(profile!.curriculum)) checks.push('Your curriculum is outside the published rule.')
  if (opportunity.requiredContext?.includes('ELIGIBLE_COURSE_OR_PLACE') && !context.eligibleCourseOrPlaceConfirmed) missing.push('Confirm that the provider offers an eligible course or place for this support.')
  if (opportunity.requiredContext?.includes('GOVERNMENT_ELIGIBILITY') && !context.governmentEligibilityConfirmed) missing.push('Confirm your citizenship, visa and residence eligibility with the government provider.')

  for (const requirement of opportunity.academicRequirements) {
    if (requirement.curriculum && profile && requirement.curriculum !== profile.curriculum) continue
    const predicted = profile?.universityPlanning.predictedOverall
    if (requirement.minimumOverall !== undefined && predicted === undefined) missing.push('Add predicted/current grades to assess academic funding.')
    else if (requirement.minimumOverall !== undefined && predicted !== undefined && predicted < requirement.minimumOverall) checks.push(`Recorded predicted overall is below the published minimum of ${requirement.minimumOverall}.`)
    else if (requirement.minimumOverall !== undefined && predicted !== undefined) reasons.push(`Recorded predicted overall appears above the published minimum of ${requirement.minimumOverall}.`)
  }
  if (opportunity.financialNeedRequirements?.length && !context.financialNeedSupplied) missing.push('Financial-need information is optional, but required to assess this criterion.')

  const hardFailure = checks.some((check) => check.includes('outside') || check.includes('does not') || check.includes('below'))
  if (hardFailure) return { state: opportunity.providerType === 'GOVERNMENT' ? 'NOT_APPLICABLE' : 'LIKELY_INELIGIBLE', reasons, checks, missing }
  if (opportunity.confidenceStatus !== 'VERIFIED_OFFICIAL') return { state: 'NEEDS_VERIFICATION', reasons, checks, missing }
  if (missing.length) return { state: 'MISSING_INFORMATION', reasons, checks, missing }
  if (!opportunity.academicRequirements.length && !opportunity.citizenshipRules.length && !opportunity.residenceRules.length && !opportunity.eligibleInstitutions.length && !opportunity.eligibleProgrammes.length) {
    return { state: 'REQUIREMENTS_NOT_STRUCTURED', reasons, checks: ['Review the full published eligibility criteria before applying.'], missing }
  }
  return { state: reasons.length >= 3 ? 'STRONG_POTENTIAL_MATCH' : reasons.length ? 'POTENTIAL_MATCH' : 'POSSIBLE_MATCH', reasons, checks, missing }
}

export function selectProgrammeCost(costs: ProgrammeCost[], context: { institutionId: string; programmeId?: string; academicYear: number; applicantType: ApplicantType; placeType?: ProgrammeCost['placeType'] }) {
  return costs
    .filter((cost) => cost.institutionId === context.institutionId)
    .filter((cost) => !cost.programmeId || cost.programmeId === context.programmeId)
    .filter((cost) => cost.academicYear === context.academicYear && cost.applicantType === context.applicantType)
    .filter((cost) => !context.placeType || !cost.placeType || cost.placeType === context.placeType)
    .sort((left, right) => Number(Boolean(right.programmeId)) - Number(Boolean(left.programmeId)))[0]
}

export function createFundingApplication(opportunity: FundingOpportunity | string, linkedProgrammeId?: string, now = new Date()): FundingApplication {
  const timestamp = now.toISOString()
  const opportunityId = typeof opportunity === 'string' ? opportunity : opportunity.id
  return {
    id: `funding-${opportunityId}-${now.getTime()}`,
    fundingOpportunityId: opportunityId,
    dataOrigin: 'OFFICIAL_VERIFIED',
    linkedProgrammeId,
    status: 'SAVED',
    notes: '',
    documents: defaultFundingDocuments(typeof opportunity === 'string' ? undefined : opportunity),
    tasks: [],
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export function createManualFundingApplication(input: { name: string; provider: string; deadline?: string; applicationUrl?: string; expectedAmount?: number; awardCurrency?: string; notes?: string }, now = new Date()): FundingApplication {
  const timestamp = now.toISOString()
  return {
    id: `custom-funding-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    customOpportunityName: input.name.trim(),
    customProvider: input.provider.trim(),
    dataOrigin: 'USER_ENTERED',
    status: 'INTERESTED',
    deadlineOverride: input.deadline || undefined,
    applicationUrlOverride: validHttpsUrl(input.applicationUrl),
    expectedAmount: input.expectedAmount,
    awardCurrency: input.awardCurrency?.trim().toUpperCase() || undefined,
    notes: input.notes?.trim() || '',
    documents: defaultFundingDocuments(),
    tasks: [],
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export function normalizeFundingApplication(value: Partial<FundingApplication> & Record<string, unknown>): FundingApplication {
  const statuses: FundingApplicationStatus[] = ['INTERESTED', 'SAVED', 'PREPARING', 'READY', 'SUBMITTED', 'AWAITING_DECISION', 'INTERVIEW', 'AWARDED', 'PARTIALLY_AWARDED', 'UNSUCCESSFUL', 'ACCEPTED', 'DECLINED', 'WITHDRAWN']
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString()
  return {
    id: String(value.id || `funding-${Date.now()}`),
    userId: typeof value.userId === 'string' ? value.userId : undefined,
    fundingOpportunityId: typeof value.fundingOpportunityId === 'string' ? value.fundingOpportunityId : undefined,
    customOpportunityName: typeof value.customOpportunityName === 'string' ? value.customOpportunityName : undefined,
    customProvider: typeof value.customProvider === 'string' ? value.customProvider : undefined,
    dataOrigin: value.dataOrigin === 'OFFICIAL_VERIFIED' || (value.dataOrigin !== 'USER_ENTERED' && typeof value.fundingOpportunityId === 'string') ? 'OFFICIAL_VERIFIED' : 'USER_ENTERED',
    linkedUniversityApplicationId: typeof value.linkedUniversityApplicationId === 'string' ? value.linkedUniversityApplicationId : undefined,
    linkedProgrammeId: typeof value.linkedProgrammeId === 'string' ? value.linkedProgrammeId : undefined,
    status: statuses.includes(value.status as FundingApplicationStatus) ? value.status as FundingApplicationStatus : 'SAVED',
    applicationReference: typeof value.applicationReference === 'string' ? value.applicationReference : undefined,
    applicationUrlOverride: typeof value.applicationUrlOverride === 'string' ? validHttpsUrl(value.applicationUrlOverride) : undefined,
    deadlineOverride: typeof value.deadlineOverride === 'string' ? value.deadlineOverride : undefined,
    submittedAt: typeof value.submittedAt === 'string' ? value.submittedAt : undefined,
    decisionAt: typeof value.decisionAt === 'string' ? value.decisionAt : undefined,
    expectedAmount: typeof value.expectedAmount === 'number' ? value.expectedAmount : undefined,
    awardAmount: typeof value.awardAmount === 'number' ? value.awardAmount : undefined,
    awardCurrency: typeof value.awardCurrency === 'string' ? value.awardCurrency : undefined,
    notes: typeof value.notes === 'string' ? value.notes : '',
    documents: Array.isArray(value.documents) ? value.documents.filter((item): item is ApplicationDocument => Boolean(item && typeof item === 'object' && typeof (item as ApplicationDocument).id === 'string' && typeof (item as ApplicationDocument).label === 'string')) : [],
    tasks: Array.isArray(value.tasks) ? value.tasks.filter((item): item is ApplicationTask => Boolean(item && typeof item === 'object' && typeof (item as ApplicationTask).id === 'string' && typeof (item as ApplicationTask).title === 'string')) : [],
    createdAt,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : createdAt
  }
}

export function fundingPlannerPayload(application: FundingApplication, title: string, dueAt: string) {
  return { title, description: 'Scholarship or funding application task', taskType: 'university_application', priority: 'high', plannedDate: dueAt, dueDate: dueAt, estimatedMinutes: 45, generatedBy: 'university-funding' }
}

export function fundingPlanTotals(applications: FundingApplication[], opportunities: FundingOpportunity[], currency: string) {
  const confirmed = applications.filter((application) => ['AWARDED', 'PARTIALLY_AWARDED', 'ACCEPTED'].includes(application.status) && application.awardCurrency === currency).reduce((total, application) => total + (application.awardAmount ?? 0), 0)
  const potential = applications.filter((application) => !['AWARDED', 'PARTIALLY_AWARDED', 'ACCEPTED', 'UNSUCCESSFUL', 'DECLINED', 'WITHDRAWN'].includes(application.status)).reduce((total, application) => {
    const opportunity = opportunities.find((item) => item.id === application.fundingOpportunityId)
    if (application.dataOrigin === 'USER_ENTERED') return application.awardCurrency === currency ? total + (application.expectedAmount ?? 0) : total
    return opportunity?.currency === currency ? total + (application.expectedAmount ?? opportunity.fundingAmount ?? 0) : total
  }, 0)
  return { confirmed, potential }
}

export function fundingPlanGap(input: { tuition?: number; tuitionCurrency?: string; planCurrency: string; confirmed: number; contribution: number }) {
  if (input.tuition === undefined || input.tuitionCurrency !== input.planCurrency) return undefined
  return Math.max(0, input.tuition - input.confirmed - input.contribution)
}

export function fundingDeadlineForOpportunity(opportunity: FundingOpportunity): FundingDeadline | undefined {
  if (!opportunity.applicationDeadline) return undefined
  return { id: `${opportunity.id}-application-deadline`, fundingOpportunityId: opportunity.id, institutionId: opportunity.eligibleInstitutions.length === 1 ? opportunity.eligibleInstitutions[0] : undefined, deadlineType: 'APPLICATION_DEADLINE', dueAt: opportunity.applicationDeadline, description: `${opportunity.name} application deadline`, sourceUrl: opportunity.sourceUrl, fundingCycle: opportunity.fundingCycle, lastCheckedAt: opportunity.lastCheckedAt, lastVerifiedAt: opportunity.lastVerifiedAt, confidenceStatus: opportunity.confidenceStatus }
}

export function reconcileFundingDeadline(previous: FundingDeadline | undefined, incoming: FundingDeadline) {
  if (!previous || previous.dueAt === incoming.dueAt) return { deadline: incoming, changed: false, conflict: false }
  if (previous.confidenceStatus === 'VERIFIED_OFFICIAL' && incoming.confidenceStatus !== 'VERIFIED_OFFICIAL') return { deadline: { ...previous, confidenceStatus: 'CONFLICTING' as const }, changed: false, conflict: true }
  return { deadline: { ...incoming, previousValues: [...(previous.previousValues ?? []), { dueAt: previous.dueAt, detectedAt: incoming.lastCheckedAt, sourceUrl: previous.sourceUrl }] }, changed: true, conflict: false }
}

export function syncFundingDeadlineTask(application: FundingApplication, deadline: FundingDeadline | undefined, now = new Date()) {
  if (!deadline) return { application, changedTaskIds: [] as string[] }
  const changedTaskIds: string[] = []
  const tasks = application.tasks.map((task) => {
    if (task.sourceDeadlineId !== deadline.id || task.dueAt === deadline.dueAt) return task
    changedTaskIds.push(task.id)
    return { ...task, dueAt: deadline.dueAt, updatedAt: now.toISOString() }
  })
  return { application: changedTaskIds.length ? { ...application, tasks, updatedAt: now.toISOString() } : application, changedTaskIds }
}

export function createFundingDeadlineTask(opportunity: FundingOpportunity, deadline: FundingDeadline, now = new Date()): ApplicationTask {
  const timestamp = now.toISOString()
  return { id: `funding-task-${opportunity.id}-${now.getTime()}`, title: `Submit ${opportunity.name} application`, dueAt: deadline.dueAt, completed: false, sourceDeadlineId: deadline.id, createdAt: timestamp, updatedAt: timestamp }
}

export function searchFundingOpportunities(opportunities: FundingOpportunity[], query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return opportunities
  return opportunities
    .map((opportunity) => {
      const direct = `${opportunity.name} ${opportunity.provider} ${opportunity.fundingType}`.toLowerCase()
      const scoped = `${opportunity.eligibleStudyAreas.join(' ')} ${opportunity.eligibleInstitutions.join(' ')} ${opportunity.eligibleProgrammes.join(' ')}`.toLowerCase()
      const broad = `${opportunity.providerCountry} ${opportunity.otherEligibility.join(' ')} ${opportunity.coverage.join(' ')}`.toLowerCase()
      const score = terms.reduce((total, term) => total + (direct.includes(term) ? 12 : 0) + (scoped.includes(term) ? 6 : 0) + (broad.includes(term) ? 2 : 0), 0)
      return { opportunity, score }
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.opportunity.name.localeCompare(right.opportunity.name))
    .map((result) => result.opportunity)
}