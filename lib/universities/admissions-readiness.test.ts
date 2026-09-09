import assert from 'node:assert/strict'
import { DEFAULT_LEARNER_PROFILE, normalizeLearnerProfile, type LearnerProfile } from '../learner/store.ts'
import { ADMISSIONS_POLICIES } from './admissions-data.ts'
import {
  evaluateApplicationDocuments,
  evaluateAdmissionsReadiness,
  evaluateAdmissionsTestRequirement,
  findCurrentTestFee,
  findNextBookableTestSession
} from './admissions-readiness.ts'
import type { AdmissionsTestRequirement } from './types.ts'

function profile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return normalizeLearnerProfile({
    ...DEFAULT_LEARNER_PROFILE,
    curriculum: 'IB',
    universityPlanning: { ...DEFAULT_LEARNER_PROFILE.universityPlanning },
    ...overrides
  })
}

const baseInput = { institutionId: 'ubc', programmeId: 'ubc-engineering', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER' as const }

const ibEnglishPass = evaluateAdmissionsReadiness({
  ...baseInput,
  profile: profile({ subjects: [{ id: 'english', name: 'English A: Language and Literature', level: 'SL', predictedGrade: '6' }] })
})
assert.equal(ibEnglishPass.state, 'UNKNOWN', 'Partial policy coverage must not produce a false all-clear')
assert.equal(ibEnglishPass.checks[0]?.state, 'SATISFIED_APPEARS')

const missingEnglish = evaluateAdmissionsReadiness({ ...baseInput, profile: profile() })
assert.equal(missingEnglish.checks[0]?.state, 'MISSING_INFORMATION')

const englishB = evaluateAdmissionsReadiness({
  ...baseInput,
  profile: profile({ subjects: [{ id: 'english-b', name: 'English B', level: 'HL', predictedGrade: '7' }] })
})
assert.equal(englishB.checks[0]?.state, 'ACTION_NEEDED', 'English B must not satisfy an English A-only exemption')

const aLevelEnglish = evaluateAdmissionsReadiness({
  ...baseInput,
  profile: profile({ curriculum: 'A_LEVEL', subjects: [{ id: 'english', name: 'English Literature', level: 'A2', predictedGrade: 'B' }] })
})
assert.equal(aLevelEnglish.checks[0]?.state, 'SATISFIED_APPEARS')

const incompleteIelts = evaluateAdmissionsReadiness({
  ...baseInput,
  profile: profile({ universityPlanning: { ...DEFAULT_LEARNER_PROFILE.universityPlanning, englishTests: [{ test: 'IELTS', overall: 7, components: { reading: 7, listening: 7 }, testDate: '2026-02-10' }] } })
})
assert.equal(incompleteIelts.checks[0]?.state, 'MISSING_INFORMATION')
assert.match(incompleteIelts.checks[0]?.explanation || '', /speaking, writing/)

const expiredIelts = evaluateAdmissionsReadiness({
  ...baseInput,
  profile: profile({ universityPlanning: { ...DEFAULT_LEARNER_PROFILE.universityPlanning, englishTests: [{ test: 'IELTS', overall: 8, components: { reading: 8, listening: 8, speaking: 8, writing: 8 }, testDate: '2023-12-31' }] } })
})
assert.equal(expiredIelts.checks[0]?.state, 'ACTION_NEEDED')

const mitMissingSat = evaluateAdmissionsReadiness({ institutionId: 'mit', programmeId: 'mit-course-6', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', profile: profile() })
assert.equal(mitMissingSat.checks[0]?.state, 'TEST_REQUIRED')
assert.equal(mitMissingSat.checks.find((check) => check.category === 'INTERVIEW')?.state, 'MISSING_INFORMATION')
assert.equal(mitMissingSat.checks.find((check) => check.category === 'PORTFOLIO')?.state, 'OPTIONAL')

const mitWithAct = evaluateAdmissionsReadiness({ institutionId: 'mit', programmeId: 'mit-course-6', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', profile: profile({ universityPlanning: { ...DEFAULT_LEARNER_PROFILE.universityPlanning, admissionsTests: [{ test: 'ACT', score: 34, testDate: '2026-06-01', resultStatus: 'RESULT_RECEIVED' }] } }) })
assert.equal(mitWithAct.checks[0]?.state, 'SATISFIED_APPEARS')

const columbiaOptional = evaluateAdmissionsReadiness({ institutionId: 'columbia', programmeId: 'columbia-computer-science', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', profile: profile() })
assert.equal(columbiaOptional.checks[0]?.state, 'OPTIONAL')

const oxfordMathsProfile = profile({
  universityPlanning: { ...DEFAULT_LEARNER_PROFILE.universityPlanning, predictedOverall: 39 },
  subjects: [{ id: 'maths-aa', name: 'Mathematics: Analysis and Approaches', level: 'HL', predictedGrade: '7' }]
})
const oxfordWithoutTmua = evaluateAdmissionsReadiness({ institutionId: 'oxford', programmeId: 'oxford-maths', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', profile: oxfordMathsProfile })
assert.equal(oxfordWithoutTmua.checks.find((check) => check.category === 'ACADEMIC')?.state, 'SATISFIED_APPEARS')
assert.equal(oxfordWithoutTmua.checks.find((check) => check.category === 'ADMISSIONS_TEST')?.state, 'TEST_REQUIRED')
assert.equal(oxfordWithoutTmua.checks.find((check) => check.category === 'INTERVIEW')?.state, 'MISSING_INFORMATION')

const oxfordWithTmua = evaluateAdmissionsReadiness({ institutionId: 'oxford', programmeId: 'oxford-maths', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', profile: profile({
  universityPlanning: { ...DEFAULT_LEARNER_PROFILE.universityPlanning, predictedOverall: 39, admissionsTests: [{ test: 'TMUA', resultStatus: 'RESULT_RECEIVED', testDate: '2026-10-14' }] },
  subjects: [{ id: 'maths-aa', name: 'Mathematics: Analysis and Approaches', level: 'HL', predictedGrade: '7' }]
}) })
assert.equal(oxfordWithTmua.checks.find((check) => check.category === 'ADMISSIONS_TEST')?.state, 'SATISFIED_APPEARS')

const trackedApplication = {
  id: 'application-1', programmeId: 'oxford-maths', institutionId: 'oxford', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER' as const, status: 'PREPARING' as const, notes: '', deadlineIds: [], tasks: [], offers: [], timeline: [], createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z',
  documents: [
    { id: 'transcript', type: 'TRANSCRIPT' as const, label: 'School transcript', required: true, status: 'UPLOADED' as const },
    { id: 'reference', type: 'REFERENCE' as const, label: 'Reference', required: true, status: 'NOT_STARTED' as const }
  ]
}
assert.equal(evaluateApplicationDocuments(trackedApplication)?.state, 'ACTION_NEEDED')
assert.match(evaluateApplicationDocuments(trackedApplication)?.explanation ?? '', /1 of 2/)
const applicationReadiness = evaluateAdmissionsReadiness({ institutionId: 'oxford', programmeId: 'oxford-maths', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', profile: oxfordMathsProfile, application: trackedApplication })
assert.equal(applicationReadiness.checks.find((check) => check.category === 'DOCUMENT')?.state, 'ACTION_NEEDED')

const unswDomestic = evaluateAdmissionsReadiness({ institutionId: 'unsw', programmeId: 'unsw-medicine', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', applicantType: 'DOMESTIC', profile: profile() })
assert.equal(unswDomestic.checks.find((check) => check.category === 'ADMISSIONS_TEST')?.state, 'TEST_REQUIRED')
assert.equal(unswDomestic.checks.find((check) => check.category === 'INTERVIEW')?.state, 'MISSING_INFORMATION')
const unswInternational = evaluateAdmissionsReadiness({ institutionId: 'unsw', programmeId: 'unsw-medicine', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', applicantType: 'INTERNATIONAL', profile: profile() })
assert.equal(unswInternational.state, 'UNKNOWN', 'A domestic UCAT ANZ rule must not be applied to an international applicant')
assert.equal(unswInternational.checks.some((check) => check.category === 'ADMISSIONS_TEST'), false)

const uctCommerce = evaluateAdmissionsReadiness({ institutionId: 'uct', programmeId: 'uct-bcom-actuarial', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', profile: profile() })
assert.equal(uctCommerce.checks.filter((check) => check.category === 'ADMISSIONS_TEST').length, 1)
assert.equal(uctCommerce.checks.find((check) => check.category === 'ADMISSIONS_TEST')?.label.includes('AQL'), true)
assert.equal(uctCommerce.coverageByCategory.testRequirement, 'VERIFIED')
assert.equal(uctCommerce.coverageByCategory.testDate, 'NOT_INDEXED', 'A verified requirement must not imply that a current provider date is indexed')
const uctMedicine = evaluateAdmissionsReadiness({ institutionId: 'uct', programmeId: 'uct-mbchb', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', profile: profile() })
assert.deepEqual(uctMedicine.checks.filter((check) => check.category === 'ADMISSIONS_TEST').map((check) => check.state), ['TEST_REQUIRED', 'TEST_REQUIRED'])
const uctMedicineWithAql = evaluateAdmissionsReadiness({ institutionId: 'uct', programmeId: 'uct-mbchb', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', profile: profile({ universityPlanning: { ...DEFAULT_LEARNER_PROFILE.universityPlanning, admissionsTests: [{ test: 'NBT_AQL', resultStatus: 'RESULT_RECEIVED', testDate: '2026-07-01' }] } }) })
assert.equal(uctMedicineWithAql.checks.find((check) => check.id === 'uct-health-aql')?.state, 'SATISFIED_APPEARS')
assert.equal(uctMedicineWithAql.checks.find((check) => check.id === 'uct-health-mat')?.state, 'TEST_REQUIRED', 'AQL must not satisfy the separate NBT MAT requirement')
assert.equal(oxfordWithoutTmua.coverageByCategory.testDate, 'VERIFIED')

const unknownPolicy = evaluateAdmissionsReadiness({ institutionId: 'stanford', programmeId: 'stanford-cs', intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', profile: profile() })
assert.equal(unknownPolicy.state, 'UNKNOWN')
assert.equal(unknownPolicy.checks[0]?.state, 'UNKNOWN')

for (const confidenceStatus of ['STALE', 'CONFLICTING'] as const) {
  const untrustedPolicy = evaluateAdmissionsReadiness({ ...baseInput, profile: profile(), policies: [{ ...ADMISSIONS_POLICIES[0], confidenceStatus }] })
  assert.equal(untrustedPolicy.state, 'UNKNOWN', `${confidenceStatus} policies must not be treated as current truth`)
}

const routeSpecificGamsat: AdmissionsTestRequirement = {
  id: 'graduate-medicine-gamsat',
  label: 'GAMSAT',
  acceptedTests: ['GAMSAT'],
  requiredness: 'REQUIRED',
  applicantRoutes: ['CURRENT_UNIVERSITY_NEW_UNDERGRAD'],
  source: ADMISSIONS_POLICIES[0].source
}
assert.equal(evaluateAdmissionsTestRequirement(routeSpecificGamsat, profile(), 'SCHOOL_LEAVER'), null)
assert.equal(evaluateAdmissionsTestRequirement(routeSpecificGamsat, profile(), 'CURRENT_UNIVERSITY_NEW_UNDERGRAD')?.state, 'TEST_REQUIRED')

const bookedRequired = evaluateAdmissionsTestRequirement(routeSpecificGamsat, profile({ universityPlanning: { ...DEFAULT_LEARNER_PROFILE.universityPlanning, admissionsTests: [{ test: 'GAMSAT', resultStatus: 'BOOKED', testDate: '2027-03-01' }] } }), 'CURRENT_UNIVERSITY_NEW_UNDERGRAD')
assert.equal(bookedRequired?.state, 'ACTION_REQUIRED', 'A booking must not be treated as a completed result')

const recommended = evaluateAdmissionsTestRequirement({ ...routeSpecificGamsat, requiredness: 'RECOMMENDED', applicantRoutes: undefined }, profile(), 'SCHOOL_LEAVER')
assert.equal(recommended?.state, 'TEST_RECOMMENDED')

const instructionPossibility = evaluateAdmissionsReadiness({ ...baseInput, profile: profile({ languageOfInstruction: 'English', yearsStudiedInEnglish: 4 }) })
assert.equal(instructionPossibility.checks[0]?.state, 'POSSIBLE_EXEMPTION', 'Recognized-school conditions must prevent an automatic instruction-language exemption')

const toeflWithoutScale = evaluateAdmissionsReadiness({ ...baseInput, profile: profile({ universityPlanning: { ...DEFAULT_LEARNER_PROFILE.universityPlanning, englishTests: [{ test: 'TOEFL', overall: 100, testDate: '2025-06-01' }] } }) })
assert.equal(toeflWithoutScale.checks[0]?.state, 'MISSING_INFORMATION')

assert.equal(findNextBookableTestSession('SAT', new Date('2026-09-09T00:00:00Z'))?.id, 'sat-2026-10-03', 'A session with a passed registration deadline must not be returned')
assert.equal(findNextBookableTestSession('UCAT_ANZ', new Date('2026-09-09T00:00:00Z')), undefined, 'An expired testing cycle must not be returned as next available')
assert.equal(findNextBookableTestSession('TMUA', new Date('2026-09-09T00:00:00Z'))?.id, 'tmua-oxford-2027-entry')
assert.equal(findCurrentTestFee('UCAT', 'GB', new Date('2026-09-09T00:00:00Z'))?.amount, 70)
assert.equal(findCurrentTestFee('UCAT', 'ZA', new Date('2026-09-09T00:00:00Z'))?.amount, 115)
assert.equal(findCurrentTestFee('UCAT_ANZ', 'AU', new Date('2026-09-09T00:00:00Z')), undefined, 'Expired cycle fees must not be shown as current')

console.log('Admissions readiness tests passed')