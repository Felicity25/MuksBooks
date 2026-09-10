import assert from 'node:assert/strict'
import { findCurriculumResources } from './curriculum-resources.ts'

const test = (name: string, fn: () => void) => {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    console.error(`✗ ${name}`)
    throw error
  }
}

test('prioritises curriculum-aligned resources and keeps general resources separate', () => {
  const result = findCurriculumResources({ curriculumId: 'VCE', levelId: 'units-3-4', subjectId: 'mathematical-methods', subjectTitle: 'Mathematical Methods', canonicalArea: 'Mathematics' })
  assert.ok(result.aligned.some((resource) => resource.id === 'vce-study-designs'))
  assert.ok(result.aligned.some((resource) => resource.id === 'vce-exam-material'))
  assert.ok(result.additional.some((resource) => resource.id === 'openstax-mathematics'))
  assert.equal(result.aligned.some((resource) => resource.id === 'openstax-mathematics'), false)
})

test('does not leak resources aligned to a different curriculum', () => {
  const result = findCurriculumResources({ curriculumId: 'IGCSE', levelId: 'year-2', subjectId: 'mathematics', subjectTitle: 'Mathematics', canonicalArea: 'Mathematics' })
  assert.ok(result.aligned.some((resource) => resource.id === 'cambridge-igcse-subjects'))
  assert.equal(result.aligned.some((resource) => resource.id.startsWith('vce-')), false)
})
