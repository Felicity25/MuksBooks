import assert from 'node:assert/strict'
import { DEFAULT_LEARNER_PROFILE, normalizeLearnerProfile, saveLearnerProfile } from './store.ts'

const describe = (name: string, fn: () => void) => {
  console.log(`\n${name}`)
  fn()
}

const it = (name: string, fn: () => void) => {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    console.error(`✗ ${name}`)
    throw error
  }
}

describe('learner store', () => {
  it('normalizes subject records and preserves level data', () => {
  const normalized = normalizeLearnerProfile({
    subjects: [{ id: '1', name: 'Biology', level: 'SL', currentGrade: '5', predictedGrade: '6' }],
    timetable: [{ id: 'a', day: 'Monday', time: '09:00', subject: 'Biology', teacher: 'Dr Smith', room: 'Lab 2' }],
    assessments: [{ id: '2', title: 'Test', subject: 'Biology', type: 'Test', dueDate: '2026-09-12', status: 'upcoming' }],
    projects: [{ id: '3', title: 'EE', type: 'EE', dueDate: '2026-11-01', status: 'Drafting', milestone: 'Plan' }],
    reports: [{ id: '4', title: 'Report', date: '2026-09-01', subject: 'Economics', level: 'HL', grade: 'A', predictedGrade: 'A', teacherComments: 'Good', term: 'Term 1', year: '2026' }],
    applications: [{ id: '5', university: 'Monash', course: 'Actuarial Science', status: 'Interested' }],
    updatedAt: '2026-09-08T00:00:00.000Z'
  })

  assert.equal(normalized.subjects[0].level, 'SL')
  assert.equal(normalized.subjects[0].name, 'Biology')
  assert.equal(normalized.projects[0].type, 'EE')
  assert.equal(normalized.applications[0].status, 'Interested')
})

  it('persists the learner profile to localStorage when available', () => {
    const storage = new Map<string, string>()
    const fakeWindow = {
      localStorage: {
        setItem: (key: string, value: string) => storage.set(key, value),
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key)
      }
    }

    ;(globalThis as any).window = fakeWindow
    const saved = saveLearnerProfile({ ...DEFAULT_LEARNER_PROFILE, updatedAt: '2026-09-08T11:00:00.000Z' })
    assert.equal(saved.updatedAt, '2026-09-08T11:00:00.000Z')
    assert.equal(Array.isArray(saved.subjects), true)
  })
})
