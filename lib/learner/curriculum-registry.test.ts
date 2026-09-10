import assert from 'node:assert/strict'
import { getCurriculum, getCurriculumSubject, resolveViewingCurriculum, SUPPORTED_CURRICULA } from './curriculum-registry.ts'

const test = (name: string, fn: () => void) => {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    console.error(`✗ ${name}`)
    throw error
  }
}

test('registers the five initial curricula from one data-driven registry', () => {
  assert.deepEqual(SUPPORTED_CURRICULA.map((item) => item.id).sort(), ['A_LEVEL', 'IEB', 'IGCSE', 'NSC', 'VCE'])
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

test('viewing curriculum can override and return to the saved profile curriculum', () => {
  assert.equal(resolveViewingCurriculum('VCE', 'IGCSE'), 'IGCSE')
  assert.equal(resolveViewingCurriculum('VCE', 'MY'), 'VCE')
})
