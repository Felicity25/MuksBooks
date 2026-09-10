import assert from 'node:assert/strict'
import { CURRICULUM_SUBJECT_COUNTS, getAvailableSubjectLevels, getCommonCurriculumSubjects, getCurriculum, getCurriculumSubject, resolveViewingCurriculum, searchCurriculumSubjects, SUPPORTED_CURRICULA } from './curriculum-registry.ts'

const test = (name: string, fn: () => void) => {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    console.error(`✗ ${name}`)
    throw error
  }
}

test('registers all supported curricula from one data-driven registry', () => {
  assert.deepEqual(SUPPORTED_CURRICULA.map((item) => item.id).sort(), ['A_LEVEL', 'IB', 'IB_MYP', 'IEB', 'IGCSE', 'NSC', 'VCE'])
  assert.ok(SUPPORTED_CURRICULA.every((item) => item.sources.length > 0 && item.subjects.length > 0))
})

test('preserves curriculum-specific hierarchy and terminology', () => {
  assert.equal(getCurriculum('VCE').hierarchyKind, 'units-area-of-study')
  assert.equal(getCurriculum('VCE').terminology.topic, 'Area of Study')
  assert.deepEqual(getCurriculum('A_LEVEL').levels.map((level) => level.label), ['AS Level', 'A Level'])
  assert.equal(getCurriculum('NSC').terminology.syllabus, 'CAPS statement')
})

test('keeps official subject names while exposing canonical discovery categories', () => {
  const methods = getCurriculumSubject('VCE', 'mathematical-methods')
  assert.equal(methods?.title, 'Mathematical Methods')
  assert.equal(methods?.canonicalArea, 'Mathematics')
})

test('provides substantial catalogues with unique subject IDs', () => {
  const minimumCounts = { IEB: 30, NSC: 30, IGCSE: 25, A_LEVEL: 25, VCE: 35, IB_MYP: 8, IB: 30 }
  for (const curriculum of SUPPORTED_CURRICULA) {
    assert.ok(CURRICULUM_SUBJECT_COUNTS[curriculum.id] >= minimumCounts[curriculum.id], `${curriculum.id} catalogue is too small`)
    assert.equal(new Set(curriculum.subjects.map((subject) => subject.id)).size, curriculum.subjects.length, `${curriculum.id} subject IDs must be unique`)
    assert.ok(getCommonCurriculumSubjects(curriculum.id).length > 0)
  }
})

test('only exposes valid levels for each subject', () => {
  for (const curriculum of SUPPORTED_CURRICULA) {
    const validLevelIds = new Set(curriculum.levels.map((level) => level.id))
    for (const subject of curriculum.subjects) {
      assert.ok((subject.availableLevels || []).every((levelId) => validLevelIds.has(levelId)), `${curriculum.id}/${subject.id} has an invalid level`)
    }
  }
  assert.deepEqual(getAvailableSubjectLevels('IB', 'language-ab-initio').map((level) => level.id), ['sl'])
  assert.deepEqual(getAvailableSubjectLevels('IB', 'theory-of-knowledge'), [])
})

test('searches official names, groups, identifiers, and syllabus codes', () => {
  assert.ok(searchCurriculumSubjects('IB', 'group 5').some((subject) => subject.id === 'mathematics-analysis-approaches'))
  assert.equal(searchCurriculumSubjects('IGCSE', '0580')[0]?.id, 'mathematics')
  assert.ok(searchCurriculumSubjects('VCE', 'legal').some((subject) => subject.title === 'Legal Studies'))
})

test('viewing curriculum can override and return to the saved profile curriculum', () => {
  assert.equal(resolveViewingCurriculum('VCE', 'IGCSE'), 'IGCSE')
  assert.equal(resolveViewingCurriculum('VCE', 'MY'), 'VCE')
})
