import assert from 'node:assert/strict'
import { DEFAULT_LEARNER_PROFILE, type LearnerProfile } from '../learner/store.ts'
import { getProgramme } from './catalog.ts'
import { matchProgramme, resolveApplicantContext } from './matching.ts'
import type { Programme } from './types.ts'

const profile: LearnerProfile = {
  ...DEFAULT_LEARNER_PROFILE,
  onboardingCompleted: true,
  curriculum: 'IB',
  school: { name: 'Example School', country: 'Australia' },
  subjects: [
    { id: 'math', name: 'Mathematics: Analysis and Approaches', level: 'HL', predictedGrade: '7', targetGrade: '7' },
    { id: 'econ', name: 'Economics', level: 'HL', predictedGrade: '6', targetGrade: '7' }
  ],
  universityPlanning: {
    citizenships: ['South Africa'],
    residenceCountry: 'Australia',
    preferredCountries: ['Australia', 'United Kingdom', 'South Africa'],
    studyAreas: ['Finance', 'Technology'],
    priorities: ['Course fit'],
    predictedOverall: 40,
    englishTests: [{ test: 'IELTS', overall: 7 }],
    admissionsTests: []
  }
}

const programme: Programme = {
  id: 'test-economics', institutionId: 'test', name: 'BSc Economics', normalizedName: 'economics', degreeType: 'Bachelor', qualificationLevel: 'Undergraduate', faculty: 'Economics', studyAreas: ['Economics', 'Finance'], tags: ['economics'], officialProgrammeUrl: 'https://example.edu/course', curriculumRequirements: [], prerequisiteSubjects: ['Mathematics'], entryRequirements: [], sourceUrl: 'https://example.edu/course', lastVerifiedAt: '2026-09-09', requirements: [{ curriculum: 'IB', minimumOverall: 38, requiredSubjects: [{ name: 'Mathematics', level: 'HL', minimumGrade: '6' }], officialRequirementsUrl: 'https://example.edu/course', sourceType: 'official-programme', lastVerifiedAt: '2026-09-09' }], englishRequirements: [{ test: 'IELTS', overall: 6.5, minimumComponents: 6, officialRequirementsUrl: 'https://example.edu/english', sourceType: 'official-admissions', lastVerifiedAt: '2026-09-09' }]
}

const strong = matchProgramme(programme, profile, profile.universityPlanning)
assert.equal(strong.state, 'POTENTIAL_MATCH')
assert.ok(strong.reasons.some((reason) => reason.includes('Predicted overall')))
assert.ok(strong.checks.some((check) => check.includes('component scores')), 'Missing English components must not be treated as fully met')

const targetOnly = { ...profile, universityPlanning: { ...profile.universityPlanning, predictedOverall: undefined }, subjects: profile.subjects.map((subject) => ({ ...subject, predictedGrade: '', currentGrade: '', targetGrade: '7' })) }
const targetOnlyMatch = matchProgramme(programme, targetOnly, targetOnly.universityPlanning)
assert.equal(targetOnlyMatch.state, 'MISSING_INFORMATION', 'Target grades must not be treated as predicted or achieved')

const missingMath = { ...profile, subjects: profile.subjects.filter((subject) => !subject.name.startsWith('Mathematics')) }
assert.equal(matchProgramme(programme, missingMath, missingMath.universityPlanning).state, 'PREREQUISITE_GAP')

assert.equal(resolveApplicantContext(profile, profile.universityPlanning, 'South Africa').likelyApplicantType, 'DOMESTIC')
assert.equal(resolveApplicantContext(profile, profile.universityPlanning, 'Australia').likelyApplicantType, 'INTERNATIONAL')
assert.equal(resolveApplicantContext(profile, { ...profile.universityPlanning, citizenships: [] }, 'United Kingdom').likelyApplicantType, 'UNCERTAIN')
assert.equal(matchProgramme(programme, null, profile.universityPlanning).state, 'MISSING_INFORMATION')

const lseEconomics = getProgramme('lse-economics')
assert.ok(lseEconomics, 'LSE Economics should exist in the canonical catalogue')
const lseMatch = matchProgramme(lseEconomics, profile, profile.universityPlanning)
assert.equal(lseMatch.state, 'POTENTIAL_MATCH')
assert.ok(lseMatch.reasons.some((reason) => reason.includes('39')), 'Published IB threshold should be explained')
assert.ok(lseEconomics.standardisedTests?.includes('TMUA (mandatory for applicants)'))

console.log('University matching tests passed')
