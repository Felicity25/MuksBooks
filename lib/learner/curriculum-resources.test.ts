import assert from 'node:assert/strict'
import { CURRICULUM_RESOURCES, findCurriculumResources, getResourceCoverage, searchCurriculumResources } from './curriculum-resources.ts'
import { SUPPORTED_CURRICULA, getCurriculum, resolveViewingCurriculum } from './curriculum-registry.ts'
import { normalizeLearnerProfile } from './store.ts'

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

test('ranks an exact verified topic mapping above broad official curriculum resources', () => {
  const result = findCurriculumResources({ curriculumId: 'VCE', levelId: 'units-3-4', subjectId: 'mathematical-methods', subjectTitle: 'Mathematical Methods', canonicalArea: 'Mathematics', topicId: 'calculus' })
  assert.equal(result.aligned[0]?.id, 'openstax-calculus-volume-1')
  assert.equal(result.aligned[0]?.trustStatus, 'VERIFIED')
  assert.equal(result.aligned.find((resource) => resource.id === 'vce-study-designs')?.trustStatus, 'OFFICIAL')
})

test('registers seven curriculum IDs and both Cambridge AS/A stages', () => {
  assert.deepEqual(SUPPORTED_CURRICULA.map((curriculum) => curriculum.id).sort(), ['A_LEVEL', 'IB', 'IB_MYP', 'IEB', 'IGCSE', 'NSC', 'VCE'])
  assert.deepEqual(getCurriculum('A_LEVEL').levels.map((level) => level.id), ['as-level', 'a-level'])
  assert.ok(SUPPORTED_CURRICULA.every((curriculum) => curriculum.subjects.length > 0 && curriculum.subjects.every((subject) => subject.topics.length > 0)))
})

test('preserves legacy IB profiles as Diploma Programme profiles', () => {
  const profile = normalizeLearnerProfile({ curriculum: 'IB', curriculumLabel: 'International Baccalaureate' })
  assert.equal(profile.curriculum, 'IB')
  assert.equal(getCurriculum(profile.curriculum).name, 'IB Diploma Programme')
  assert.equal(resolveViewingCurriculum(profile.curriculum, 'MY'), 'IB')
  assert.equal(getCurriculum('IB_MYP').name, 'IB Middle Years Programme')
})

test('keeps official resources on their declared authority domain', () => {
  const trustedDomains = new Set(['education.gov.za', 'ieb.co.za', 'cambridgeinternational.org', 'vcaa.vic.edu.au', 'ibo.org'])
  for (const resource of CURRICULUM_RESOURCES.filter((item) => item.trustStatus === 'OFFICIAL')) {
    assert.equal(new URL(resource.sourceUrl).protocol, 'https:')
    assert.ok(trustedDomains.has(resource.sourceDomain), `${resource.id} has an untrusted official domain`)
    assert.ok(new URL(resource.sourceUrl).hostname.endsWith(resource.sourceDomain))
    assert.ok(resource.verifiedAt)
  }
})

test('does not leak topic-specific resources without an exact topic match', () => {
  const broad = findCurriculumResources({ curriculumId: 'VCE', levelId: 'units-3-4', subjectId: 'mathematical-methods', subjectTitle: 'Mathematical Methods', canonicalArea: 'Mathematics' })
  const unrelated = findCurriculumResources({ curriculumId: 'VCE', levelId: 'units-3-4', subjectId: 'mathematical-methods', subjectTitle: 'Mathematical Methods', canonicalArea: 'Mathematics', topicId: 'algebra' })
  assert.equal(broad.aligned.some((resource) => resource.id === 'openstax-calculus-volume-1'), false)
  assert.equal(unrelated.aligned.some((resource) => resource.id === 'openstax-calculus-volume-1'), false)
})

test('searches by text, curriculum, type and official status', () => {
  const results = searchCurriculumResources({ text: 'mathematics', scope: 'IGCSE', subjectId: 'mathematics', type: 'Curriculum / Syllabus', officialOnly: true })
  assert.equal(results[0]?.id, 'cambridge-igcse-mathematics-0580')
  assert.ok(results.every((resource) => resource.trustStatus === 'OFFICIAL' && resource.type === 'Curriculum / Syllabus'))
})

test('filters All Curricula results by subject and preserves exact ranking', () => {
  const results = searchCurriculumResources({ scope: 'ALL', subjectId: 'mathematics', subjectTitle: 'Mathematics', canonicalArea: 'Mathematics' })
  assert.ok(results.some((resource) => resource.id === 'cambridge-igcse-mathematics-0580'))
  assert.equal(results.some((resource) => resource.id === 'openstax-biology-2e'), false)
  assert.ok(results.findIndex((resource) => resource.id === 'cambridge-igcse-mathematics-0580') < results.findIndex((resource) => resource.id === 'openstax-mathematics'))
})

test('ranks IB Mathematics AA HL integration above broad curriculum resources', () => {
  const results = searchCurriculumResources({ text: 'integration', scope: 'IB', levelId: 'hl', subjectId: 'mathematics-analysis-approaches', subjectTitle: 'Mathematics: analysis and approaches', canonicalArea: 'Mathematics', topicId: 'calculus' })
  assert.equal(results[0]?.id, 'openstax-calculus-volume-1')
})

test('reports curriculum and subject coverage while excluding inactive resources', () => {
  const coverage = getResourceCoverage('IB', 'biology')
  assert.ok(coverage.total >= 2)
  assert.ok(coverage.official >= 1)
  assert.ok(coverage.verified >= 1)
  assert.ok(coverage.byPurpose.official >= 1)
  assert.ok(coverage.topics.length > 0)
  assert.ok(coverage.topics.every((topic) => topic.total >= topic.official))
  assert.equal(searchCurriculumResources().every((resource) => resource.isActive), true)
})
