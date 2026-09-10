import assert from 'node:assert/strict'
import { DEFAULT_LEARNER_PROFILE, mergeLearnerSubjects, normalizeLearnerProfile, saveLearnerProfile, type LearnerSubject } from './store.ts'

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
  it('starts empty for a fresh learner rather than seeding IB demo data', () => {
    const normalized = normalizeLearnerProfile({})

    assert.deepEqual(normalized.subjects, [])
    assert.deepEqual(normalized.timetable, [])
    assert.deepEqual(normalized.projects, [])
    assert.equal(normalized.onboardingCompleted, false)
  })

  it('normalizes subject records and preserves level data', () => {
    const normalized = normalizeLearnerProfile({
      preferredName: 'Test Learner',
      school: { name: 'Test School', country: 'South Africa', stateRegion: 'Gauteng' },
      curriculum: 'IB',
      yearLevel: 'Year 12',
      expectedGraduationYear: '2027',
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
    assert.equal(normalized.subjects[0].provenance, 'CUSTOM')
    assert.equal(normalized.subjects[0].curriculumId, 'IB')
    assert.equal(normalized.subjects[0].active, true)
    assert.equal(normalized.projects[0].type, 'EE')
    assert.equal(normalized.applications[0].status, 'Interested')
    assert.equal(normalized.school?.name, 'Test School')
  })

  it('normalizes legacy catalogue and custom subjects without losing metadata', () => {
    const normalized = normalizeLearnerProfile({
      curriculum: 'IB',
      subjects: [
        { id: 'bio', name: 'Biology', curriculumSubjectCode: 'biology', level: 'HL', teacher: 'Ms Patel' },
        { id: 'robotics', name: 'Robotics', notes: 'School elective' }
      ]
    })

    assert.deepEqual(normalized.subjects.map((subject) => subject.provenance), ['CATALOGUE', 'CUSTOM'])
    assert.equal(normalized.subjects[0].teacher, 'Ms Patel')
    assert.equal(normalized.subjects[1].notes, 'School elective')
  })

  it('merges catalogue selections while preserving custom subjects and existing metadata', () => {
    const existing = normalizeLearnerProfile({ curriculum: 'IB', subjects: [
      { id: 'bio-record', name: 'Biology', curriculumSubjectCode: 'biology', level: 'HL', teacher: 'Ms Patel' },
      { id: 'robotics', name: 'Robotics', description: 'School elective' }
    ] }).subjects
    const selected: LearnerSubject[] = [{
      id: 'ib-biology', name: 'Biology', provenance: 'CATALOGUE', curriculumId: 'IB', curriculumSubjectCode: 'biology', levelId: 'sl', level: 'SL', active: true
    }, existing[1]]
    const merged = mergeLearnerSubjects(existing, selected, 'IB')

    assert.equal(merged.find((subject) => subject.id === 'bio-record')?.teacher, 'Ms Patel')
    assert.equal(merged.find((subject) => subject.id === 'bio-record')?.levelId, 'sl')
    assert.equal(merged.find((subject) => subject.id === 'robotics')?.description, 'School elective')
    assert.equal(merged.find((subject) => subject.id === 'robotics')?.active, true)
  })

  it('keeps deselected subjects as inactive history', () => {
    const existing = normalizeLearnerProfile({ curriculum: 'IB', subjects: [{ id: 'robotics', name: 'Robotics' }] }).subjects
    const merged = mergeLearnerSubjects(existing, [], 'IB')

    assert.equal(merged[0].active, false)
    assert.equal(merged[0].name, 'Robotics')
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
    const saved = saveLearnerProfile(normalizeLearnerProfile({
      ...DEFAULT_LEARNER_PROFILE,
      preferredName: 'Test Learner',
      subjects: [{ id: 'robotics', name: 'Robotics', description: 'School elective' }],
      updatedAt: '2026-09-08T11:00:00.000Z'
    }))
    assert.equal(saved.updatedAt, '2026-09-08T11:00:00.000Z')
    const persisted = JSON.parse(storage.get('muksbooks:learner-profile:v1') || '{}')
    assert.equal(persisted.subjects[0].provenance, 'CUSTOM')
    assert.equal(persisted.subjects[0].description, 'School elective')
    assert.equal(persisted.subjects[0].active, true)
  })
})
