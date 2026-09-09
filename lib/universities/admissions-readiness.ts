import type { LearnerEnglishTest, LearnerProfile } from '../learner/store.ts'
import { ADMISSIONS_POLICIES, ADMISSIONS_TEST_FEES, ADMISSIONS_TEST_SESSIONS } from './admissions-data.ts'
import { getProgramme } from './catalog.ts'
import type {
  AcademicRequirement,
  AdmissionsPolicy,
  AdmissionsReadinessCheck,
  AdmissionsReadinessResult,
  AdmissionsTestFee,
  AdmissionsTestRequirement,
  AdmissionsTestSession,
  ApplicantRoute,
  ApplicantType,
  CountryCode,
  EnglishScoreRule,
  StructuredEnglishRequirement,
  UniversityApplication
} from './types.ts'

interface ReadinessInput {
  profile: LearnerProfile | null
  institutionId: string
  programmeId: string
  intakeYear: number
  applicantRoute: ApplicantRoute
  applicantType?: ApplicantType
  application?: UniversityApplication
  policies?: AdmissionsPolicy[]
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function numericGrade(value?: string): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function subjectGrade(subject: LearnerProfile['subjects'][number]): string | undefined {
  return subject.predictedGrade || subject.currentGrade || undefined
}

function gradeMeetsMinimum(value: string, minimum: string): boolean {
  const numericValue = numericGrade(value)
  const numericMinimum = numericGrade(minimum)
  if (numericValue !== undefined && numericMinimum !== undefined) return numericValue >= numericMinimum
  const ranks = ['F', 'E', 'D', 'C', 'B', 'A', 'A*']
  return ranks.indexOf(value.toUpperCase()) >= ranks.indexOf(minimum.toUpperCase()) && ranks.indexOf(minimum.toUpperCase()) >= 0
}

export function evaluateAcademicRequirement(requirement: AcademicRequirement, profile: LearnerProfile | null): AdmissionsReadinessCheck {
  const source = { title: 'Official academic entry requirements', url: requirement.officialRequirementsUrl, sourceType: requirement.sourceType, lastVerifiedAt: requirement.lastVerifiedAt, admissionsCycle: requirement.admissionsCycle }
  if (!profile) return { id: `academic-${requirement.curriculum}`, category: 'ACADEMIC', label: 'Academic entry requirements', state: 'MISSING_INFORMATION', explanation: 'Add your subjects and predicted results to compare with the published academic requirement.', actions: ['Complete your academic profile.'], source }

  const evidence: string[] = []
  const actions: string[] = []
  let missingInformation = false
  if (requirement.minimumOverall !== undefined) {
    if (profile.universityPlanning.predictedOverall === undefined) missingInformation = true
    else if (profile.universityPlanning.predictedOverall < requirement.minimumOverall) actions.push(`Raise or review the predicted overall against the published minimum of ${requirement.minimumOverall}.`)
    else evidence.push(`Predicted overall ${profile.universityPlanning.predictedOverall} against published minimum ${requirement.minimumOverall}`)
  }
  for (const required of requirement.requiredSubjects || []) {
    const subject = profile.subjects.find((candidate) => normalize(candidate.name).includes(normalize(required.name)) || normalize(required.name).includes(normalize(candidate.name)))
    if (!subject) {
      if (profile.subjects.length) actions.push(`Check the required subject: ${required.name}${required.level ? ` at ${required.level}` : ''}.`)
      else missingInformation = true
      continue
    }
    if (required.level && normalize(subject.level || '') !== normalize(required.level)) {
      actions.push(`${required.name} is recorded at ${subject.level || 'an unknown level'}; the published requirement specifies ${required.level}.`)
      continue
    }
    const grade = subjectGrade(subject)
    if (required.minimumGrade && !grade) missingInformation = true
    else if (required.minimumGrade && grade && !gradeMeetsMinimum(grade, required.minimumGrade)) actions.push(`${required.name} grade ${grade} is below the published minimum ${required.minimumGrade}.`)
    else evidence.push(`${subject.name}${subject.level ? ` ${subject.level}` : ''}${grade ? ` ${grade}` : ''}`)
  }
  if (actions.length) return { id: `academic-${requirement.curriculum}`, category: 'ACADEMIC', label: 'Academic entry requirements', state: 'ACTION_NEEDED', explanation: 'At least one recorded academic result or subject does not currently meet the published requirement.', actions, source, evidence }
  if (missingInformation) return { id: `academic-${requirement.curriculum}`, category: 'ACADEMIC', label: 'Academic entry requirements', state: 'MISSING_INFORMATION', explanation: 'The published academic requirement is structured, but your profile is missing results needed for comparison.', actions: ['Add the missing predicted overall, subject level, or grade.'], source, evidence }
  return { id: `academic-${requirement.curriculum}`, category: 'ACADEMIC', label: 'Academic entry requirements', state: 'SATISFIED_APPEARS', explanation: 'Recorded academic evidence appears to meet the structured published minimums.', actions: [], source, evidence }
}

function componentScore(test: LearnerEnglishTest, component: string): number | undefined {
  const match = Object.entries(test.components || {}).find(([name]) => normalize(name) === normalize(component))
  return match?.[1]
}

function testRuleState(test: LearnerEnglishTest, rule: EnglishScoreRule): AdmissionsReadinessCheck | null {
  if (test.test !== rule.test) return null
  if (rule.scoreScale && test.scoreScale !== rule.scoreScale) return null
  const source = rule.source
  if (rule.validOnOrAfter && test.testDate && test.testDate < rule.validOnOrAfter) {
    return { id: `english-${rule.test}`, category: 'ENGLISH', label: `${rule.test} English requirement`, state: 'ACTION_NEEDED', explanation: `The recorded ${rule.test} result is older than the accepted date for this admissions cycle.`, actions: [`Add a ${rule.test} result dated ${rule.validOnOrAfter} or later.`], source }
  }
  if (rule.validOnOrBefore && test.testDate && test.testDate > rule.validOnOrBefore) {
    return { id: `english-${rule.test}`, category: 'ENGLISH', label: `${rule.test} English requirement`, state: 'ACTION_NEEDED', explanation: `The recorded ${rule.test} result uses a score scale that is not valid for its test date.`, actions: ['Check the score scale and test date against the official result.'], source }
  }
  if (typeof test.overall !== 'number') {
    return { id: `english-${rule.test}`, category: 'ENGLISH', label: `${rule.test} English requirement`, state: 'MISSING_INFORMATION', explanation: `A ${rule.test} result is recorded without an overall score.`, actions: ['Add the official overall score.'], source }
  }
  if (test.overall < rule.minimumOverall) {
    return { id: `english-${rule.test}`, category: 'ENGLISH', label: `${rule.test} English requirement`, state: 'ACTION_NEEDED', explanation: `Recorded overall ${test.overall}; published minimum ${rule.minimumOverall}.`, actions: [`Plan another ${rule.test} sitting or review another accepted route.`], source, evidence: [`${rule.test} overall ${test.overall}`] }
  }
  const missingComponents = Object.keys(rule.minimumComponents || {}).filter((component) => componentScore(test, component) === undefined)
  if (missingComponents.length) {
    return { id: `english-${rule.test}`, category: 'ENGLISH', label: `${rule.test} English requirement`, state: 'MISSING_INFORMATION', explanation: `The overall score meets the published minimum, but ${missingComponents.join(', ')} component scores are missing.`, actions: ['Add all official component scores.'], source, evidence: [`${rule.test} overall ${test.overall}`] }
  }
  const lowComponents = Object.entries(rule.minimumComponents || {}).filter(([component, minimum]) => (componentScore(test, component) || 0) < minimum)
  if (lowComponents.length) {
    return { id: `english-${rule.test}`, category: 'ENGLISH', label: `${rule.test} English requirement`, state: 'ACTION_NEEDED', explanation: `The overall score meets the minimum, but ${lowComponents.map(([component, minimum]) => `${component} is below ${minimum}`).join(' and ')}.`, actions: [`Plan another ${rule.test} sitting or review another accepted route.`], source }
  }
  return { id: `english-${rule.test}`, category: 'ENGLISH', label: `${rule.test} English requirement`, state: 'SATISFIED_APPEARS', explanation: `The recorded ${rule.test} scores appear to meet the published minimums.`, actions: [], source, evidence: [`${rule.test} overall ${test.overall}`] }
}

export function evaluateEnglishRequirement(requirement: StructuredEnglishRequirement, profile: LearnerProfile | null): AdmissionsReadinessCheck {
  if (!profile) {
    return { id: requirement.id, category: 'ENGLISH', label: requirement.label, state: 'MISSING_INFORMATION', explanation: 'Add your curriculum, English subject, and any English test results to check this requirement.', actions: ['Complete your academic profile.'], source: requirement.source }
  }

  const exemptions = requirement.exemptions.filter((rule) => rule.curriculum === profile.curriculum)
  const eligibleSubjects = exemptions.flatMap((rule) => profile.subjects.flatMap((subject) => rule.subjectNames.some((name) => normalize(subject.name) === normalize(name)) && (!rule.levels?.length || rule.levels.some((level) => normalize(level) === normalize(subject.level || '')))
    ? [{ rule, subject }]
    : []))

  for (const { rule, subject } of eligibleSubjects) {
    const grade = subjectGrade(subject)
    if (!grade) {
      return { id: requirement.id, category: 'ENGLISH', label: requirement.label, state: 'MISSING_INFORMATION', explanation: `${subject.name} ${subject.level || ''} is eligible, but its grade is missing.`, actions: ['Add the current or predicted English grade.'], source: rule.source }
    }
    const meetsNumeric = rule.minimumNumericGrade !== undefined && numericGrade(grade) !== undefined && numericGrade(grade)! >= rule.minimumNumericGrade
    const meetsLetter = rule.acceptedLetterGrades?.some((accepted) => normalize(accepted) === normalize(grade)) || false
    if (meetsNumeric || meetsLetter) {
      return { id: requirement.id, category: 'ENGLISH', label: requirement.label, state: 'SATISFIED_APPEARS', explanation: `${subject.name} ${subject.level || ''} grade ${grade} appears to meet the published English route.`, actions: [], source: rule.source, evidence: [`${subject.name} ${subject.level || ''} ${grade}`.trim()] }
    }
  }

  const instructionRule = requirement.languageOfInstructionRules?.find((rule) => normalize(rule.language) === normalize(profile.languageOfInstruction || '') && (profile.yearsStudiedInEnglish || 0) >= rule.minimumYears)
  if (instructionRule) {
    if (instructionRule.recognizedSchoolRequired) return { id: requirement.id, category: 'ENGLISH', label: requirement.label, state: 'POSSIBLE_EXEMPTION', explanation: `Your recorded language of instruction and ${profile.yearsStudiedInEnglish} years of study may match a published route, but the university must confirm that your school is recognized.`, actions: ['Confirm school eligibility on the official English policy.'], source: instructionRule.source }
    return { id: requirement.id, category: 'ENGLISH', label: requirement.label, state: 'SATISFIED_APPEARS', explanation: 'Your recorded language and years of instruction appear to match the published route.', actions: [], source: instructionRule.source }
  }

  const missingScoreScale = profile.universityPlanning.englishTests.find((test) => !test.scoreScale && requirement.acceptedTests.some((rule) => rule.test === test.test && rule.scoreScale))
  if (missingScoreScale) return { id: requirement.id, category: 'ENGLISH', label: requirement.label, state: 'MISSING_INFORMATION', explanation: `The ${missingScoreScale.test} score scale is needed to compare this result with the correct published rule.`, actions: ['Add the score scale shown on the official result.'], source: requirement.source }

  const testChecks = requirement.acceptedTests.flatMap((rule) => profile.universityPlanning.englishTests.map((test) => testRuleState(test, rule)).filter((check): check is AdmissionsReadinessCheck => Boolean(check)))
  const passingTest = testChecks.find((check) => check.state === 'SATISFIED_APPEARS')
  if (passingTest) return { ...passingTest, id: requirement.id, label: requirement.label }
  const incompleteTest = testChecks.find((check) => check.state === 'MISSING_INFORMATION')
  if (incompleteTest) return { ...incompleteTest, id: requirement.id, label: requirement.label }
  const failingTest = testChecks.find((check) => check.state === 'ACTION_NEEDED')
  if (failingTest) return { ...failingTest, id: requirement.id, label: requirement.label }

  const hasAnyEnglishSubject = profile.subjects.some((subject) => normalize(subject.name).includes('english'))
  if (!hasAnyEnglishSubject && exemptions.length) {
    return { id: requirement.id, category: 'ENGLISH', label: requirement.label, state: 'MISSING_INFORMATION', explanation: 'No English subject or accepted English test result is recorded.', actions: ['Add your English subject and grade, or an accepted test result.'], source: requirement.source }
  }
  return { id: requirement.id, category: 'ENGLISH', label: requirement.label, state: 'ACTION_NEEDED', explanation: 'The recorded English subject does not match a published exemption and no accepted test result is available.', actions: ['Review an accepted English test or another published route.'], source: requirement.source }
}

export function evaluateAdmissionsTestRequirement(requirement: AdmissionsTestRequirement, profile: LearnerProfile | null, applicantRoute: ApplicantRoute): AdmissionsReadinessCheck | null {
  if (requirement.applicantRoutes?.length && !requirement.applicantRoutes.includes(applicantRoute)) return null
  const recorded = profile?.universityPlanning.admissionsTests.find((test) => requirement.acceptedTests.includes(test.test))
  if (requirement.requiredness === 'NOT_REQUIRED') return { id: requirement.id, category: 'ADMISSIONS_TEST', label: requirement.label, state: 'NOT_REQUIRED', explanation: 'The published policy states this test is not required for the selected cycle and route.', actions: [], source: requirement.source }
  if (requirement.requiredness === 'UNKNOWN') return { id: requirement.id, category: 'ADMISSIONS_TEST', label: requirement.label, state: 'UNKNOWN', explanation: 'The current test policy has not been verified for this exact cycle and route.', actions: ['Verify the test policy on the official admissions page.'], source: requirement.source }
  if (requirement.requiredness === 'POSSIBLE_EXEMPTION') return { id: requirement.id, category: 'ADMISSIONS_TEST', label: requirement.label, state: 'POSSIBLE_EXEMPTION', explanation: requirement.notes || 'A published exemption may apply, but more evidence is required.', actions: ['Confirm the exemption against the official policy.'], source: requirement.source }
  if (requirement.requiredness === 'OPTIONAL' || requirement.requiredness === 'TEST_OPTIONAL') {
    return { id: requirement.id, category: 'ADMISSIONS_TEST', label: requirement.label, state: 'OPTIONAL', explanation: requirement.requiredness === 'TEST_OPTIONAL' ? 'SAT/ACT is currently optional for this admissions cycle. You may still choose to submit a result.' : 'This admissions test is optional for the selected cycle and route.', actions: [], source: requirement.source, evidence: recorded ? [`${recorded.test} recorded`] : undefined }
  }
  if (requirement.requiredness === 'RECOMMENDED' && !recorded) return { id: requirement.id, category: 'ADMISSIONS_TEST', label: requirement.label, state: 'TEST_RECOMMENDED', explanation: 'The official policy recommends this test but does not list it as required.', actions: [`Consider ${requirement.acceptedTests.join(' or ')}.`], source: requirement.source }
  if (!recorded) {
    return { id: requirement.id, category: 'ADMISSIONS_TEST', label: requirement.label, state: 'TEST_REQUIRED', explanation: `${requirement.acceptedTests.join(' or ')} is required for this admissions cycle and route, and no sitting or result is recorded.`, actions: [`Book or add ${requirement.acceptedTests.join(' or ')}.`], source: requirement.source }
  }
  const evidence = recorded.resultStatus === 'BOOKED' ? `${recorded.test} booked` : recorded.score !== undefined ? `${recorded.test} score ${recorded.score}` : `${recorded.test} recorded`
  if (recorded.resultStatus === 'BOOKED' || recorded.resultStatus === 'AWAITING_RESULT') return { id: requirement.id, category: 'ADMISSIONS_TEST', label: requirement.label, state: 'ACTION_REQUIRED', explanation: `${evidence}. A completed result is still needed for this application.`, actions: [`Sit ${recorded.test} and add the result when available.`], source: requirement.source, evidence: [evidence] }
  return { id: requirement.id, category: 'ADMISSIONS_TEST', label: requirement.label, state: 'SATISFIED_APPEARS', explanation: `${evidence}. Confirm the institution receives the required result by its deadline.`, actions: [], source: requirement.source, evidence: [evidence] }
}

export function evaluateApplicationDocuments(application: UniversityApplication): AdmissionsReadinessCheck | null {
  const required = application.documents.filter((document) => document.required)
  if (!required.length) return null
  const readyStatuses = new Set(['READY', 'UPLOADED', 'SUBMITTED', 'NOT_REQUIRED'])
  const ready = required.filter((document) => readyStatuses.has(document.status))
  const incomplete = required.filter((document) => !readyStatuses.has(document.status))
  if (!incomplete.length) return { id: 'application-documents', category: 'DOCUMENT', label: 'Application documents', state: 'SATISFIED_APPEARS', explanation: `${ready.length} of ${required.length} required documents are recorded as ready, uploaded, or submitted.`, actions: [], evidence: ready.map((document) => document.label) }
  return { id: 'application-documents', category: 'DOCUMENT', label: 'Application documents', state: 'ACTION_NEEDED', explanation: `${ready.length} of ${required.length} required documents are ready.`, actions: incomplete.map((document) => `Prepare ${document.label}.`), evidence: ready.map((document) => document.label) }
}

export function findAdmissionsPolicy(input: Omit<ReadinessInput, 'profile' | 'policies'>, policies: AdmissionsPolicy[] = ADMISSIONS_POLICIES): AdmissionsPolicy | undefined {
  return policies.find((policy) => policy.institutionId === input.institutionId
    && policy.intakeYears.includes(input.intakeYear)
    && (!policy.programmeIds?.length || policy.programmeIds.includes(input.programmeId))
    && (!policy.applicantRoutes?.length || policy.applicantRoutes.includes(input.applicantRoute))
    && (!policy.applicantTypes?.length || (input.applicantType !== undefined && policy.applicantTypes.includes(input.applicantType))))
}

export function evaluateAdmissionsReadiness(input: ReadinessInput): AdmissionsReadinessResult {
  const policy = findAdmissionsPolicy(input, input.policies)
  const programme = getProgramme(input.programmeId)
  const academicRequirement = programme?.requirements?.find((requirement) => requirement.curriculum === input.profile?.curriculum && (!requirement.admissionsCycle || requirement.admissionsCycle.includes(String(input.intakeYear))))
  const policyTests = policy?.admissionsTests?.flatMap((requirement) => requirement.acceptedTests) || []
  const coverageByCategory: AdmissionsReadinessResult['coverageByCategory'] = {
    academic: academicRequirement ? 'VERIFIED' : 'NOT_INDEXED',
    english: policy?.english ? 'VERIFIED' : 'NOT_INDEXED',
    testRequirement: policy?.admissionsTests?.length ? 'VERIFIED' : 'NOT_INDEXED',
    testDate: policyTests.some((test) => ADMISSIONS_TEST_SESSIONS.some((session) => session.test === test)) ? 'VERIFIED' : 'NOT_INDEXED',
    admissionsReadiness: !policy ? 'NOT_INDEXED' : policy.coverageLevel === 'COMPLETE' ? 'VERIFIED' : 'PARTIAL'
  }
  if (policy && policy.confidenceStatus !== 'VERIFIED_OFFICIAL') {
    const check: AdmissionsReadinessCheck = { id: 'coverage', category: 'OTHER', label: 'Admissions requirements coverage', state: 'UNKNOWN', explanation: `The matching policy is ${policy.confidenceStatus.toLowerCase().replace('_', ' ')} and is not being treated as current truth.`, actions: ['Verify the requirement on the official source.'], source: policy.source }
    return { state: 'UNKNOWN', institutionId: input.institutionId, programmeId: input.programmeId, intakeYear: input.intakeYear, admissionsCycle: policy.admissionsCycle, checks: [check], nextActions: check.actions, coverage: policy.confidenceStatus, coverageByCategory }
  }

  const checks: AdmissionsReadinessCheck[] = []
  if (academicRequirement) checks.push(evaluateAcademicRequirement(academicRequirement, input.profile))
  if (policy?.english) checks.push(evaluateEnglishRequirement(policy.english, input.profile))
  for (const requirement of policy?.admissionsTests || []) {
    const check = evaluateAdmissionsTestRequirement(requirement, input.profile, input.applicantRoute)
    if (check) checks.push(check)
  }
  for (const requirement of policy?.additionalRequirements || []) {
    if (requirement.applicantRoutes?.length && !requirement.applicantRoutes.includes(input.applicantRoute)) continue
    checks.push({ id: requirement.id, category: requirement.category, label: requirement.label, state: requirement.requiredness === 'OPTIONAL' ? 'OPTIONAL' : 'MISSING_INFORMATION', explanation: requirement.notes || (requirement.requiredness === 'OPTIONAL' ? 'This item is optional for the selected route.' : 'MuksBooks needs confirmation that this requirement is complete.'), actions: requirement.requiredness === 'OPTIONAL' ? [] : [requirement.action || `Confirm ${requirement.label.toLowerCase()}.`], source: requirement.source })
  }
  if (input.application) {
    const documentCheck = evaluateApplicationDocuments(input.application)
    if (documentCheck) checks.push(documentCheck)
  }

  if (!policy || policy.coverageLevel !== 'COMPLETE') checks.push({ id: 'coverage', category: 'OTHER', label: 'Remaining policy coverage', state: 'UNKNOWN', explanation: 'Some programme-, route-, or cycle-specific requirements are not yet structured in MuksBooks. Unknown does not mean not required.', actions: ['Review the official programme and admissions pages before applying.'], source: policy?.source })

  const state = checks.some((check) => ['ACTION_NEEDED', 'ACTION_REQUIRED', 'TEST_REQUIRED'].includes(check.state))
    ? 'ACTION_NEEDED'
    : checks.some((check) => check.state === 'MISSING_INFORMATION')
      ? 'MISSING_INFORMATION'
      : checks.some((check) => check.state === 'UNKNOWN')
        ? 'UNKNOWN'
          : 'READY_APPEARS'
        return { state, institutionId: input.institutionId, programmeId: input.programmeId, intakeYear: input.intakeYear, admissionsCycle: policy?.admissionsCycle, checks, nextActions: checks.flatMap((check) => check.actions), coverage: policy?.confidenceStatus || 'UNKNOWN', coverageByCategory }
}

export function findNextBookableTestSession(test: AdmissionsTestSession['test'], asOf: Date, sessions: AdmissionsTestSession[] = ADMISSIONS_TEST_SESSIONS): AdmissionsTestSession | undefined {
  const now = asOf.getTime()
  return sessions
    .filter((session) => session.test === test && new Date(session.registrationDeadline).getTime() >= now && new Date(session.testEndsAt).getTime() >= now)
    .sort((left, right) => new Date(left.testStartsAt).getTime() - new Date(right.testStartsAt).getTime())[0]
}

export function findCurrentTestFee(test: AdmissionsTestFee['test'], countryCode: CountryCode, asOf: Date, fees: AdmissionsTestFee[] = ADMISSIONS_TEST_FEES): AdmissionsTestFee | undefined {
  const date = asOf.toISOString().slice(0, 10)
  const current = fees.filter((fee) => fee.test === test && fee.validFrom <= date && fee.validUntil >= date)
  return current.find((fee) => fee.countryCodes?.includes(countryCode)) || current.find((fee) => !fee.countryCodes?.length)
}