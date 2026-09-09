import assert from 'node:assert/strict'
import { DEFAULT_LEARNER_PROFILE, getLearnerProfile, normalizeLearnerProfile, saveLearnerProfile } from '../learner/store.ts'

const values = new Map<string, string>()
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } }
})

const legacy = normalizeLearnerProfile({ ...DEFAULT_LEARNER_PROFILE, universityPlanning: { shortlist: [], applications: [] } })
assert.deepEqual(legacy.universityPlanning.englishTests, [])
assert.deepEqual(legacy.universityPlanning.admissionsTests, [])

saveLearnerProfile(normalizeLearnerProfile({
  ...DEFAULT_LEARNER_PROFILE,
  primaryLanguage: 'isiXhosa',
  languageOfInstruction: 'English',
  yearsStudiedInEnglish: 5,
  previousQualifications: ['IB Middle Years Programme'],
  universityPlanning: {
    ...DEFAULT_LEARNER_PROFILE.universityPlanning,
    englishTests: [{ id: 'ielts-1', test: 'IELTS', overall: 7.5, components: { listening: 8, reading: 7.5, speaking: 7, writing: 7 }, testDate: '2026-08-01', source: 'MANUAL', createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z' }],
    admissionsTests: [{ id: 'nbt-aql-1', test: 'NBT_AQL', score: 72, components: { AL: 70, QL: 74 }, testDate: '2026-07-18', resultStatus: 'RESULT_RECEIVED', source: 'MANUAL', createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z' }]
  }
}))

const reloaded = getLearnerProfile()
assert.equal(reloaded.primaryLanguage, 'isiXhosa')
assert.equal(reloaded.languageOfInstruction, 'English')
assert.equal(reloaded.yearsStudiedInEnglish, 5)
assert.deepEqual(reloaded.previousQualifications, ['IB Middle Years Programme'])
assert.equal(reloaded.universityPlanning.englishTests[0].components?.writing, 7)
assert.equal(reloaded.universityPlanning.admissionsTests[0].test, 'NBT_AQL')
assert.equal(reloaded.universityPlanning.admissionsTests[0].resultStatus, 'RESULT_RECEIVED')
assert.equal(reloaded.universityPlanning.admissionsTests[0].source, 'MANUAL')

console.log('Admissions profile tests passed')