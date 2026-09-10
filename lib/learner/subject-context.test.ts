import assert from 'node:assert/strict'
import { learnerSubjectContainer, universityUnitContainer } from '../academic-context.ts'
import { getCurriculum } from './curriculum-registry.ts'
import { buildLearnerResourceContexts, personalisedResourcesForContext, proposeSubjectTopics } from './subject-context.ts'
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

const profile = normalizeLearnerProfile({
  curriculum: 'IB',
  subjects: [
    { id: 'math-aa', name: 'Mathematics: analysis and approaches', curriculumId: 'IB', curriculumSubjectCode: 'mathematics-analysis-approaches', levelId: 'hl', level: 'HL' },
    { id: 'biology', name: 'Biology', curriculumId: 'IB', curriculumSubjectCode: 'biology', levelId: 'hl', level: 'HL' },
    { id: 'robotics', name: 'Computer Science', curriculumId: 'IB', provenance: 'CUSTOM', levelId: 'hl', level: 'HL' }
  ]
})

test('keeps learner subject containers isolated by stable subject ID', () => {
  const contexts = buildLearnerResourceContexts(profile)
  assert.deepEqual(contexts.map((context) => context.container.id), ['math-aa', 'biology', 'robotics'])
  assert.equal(learnerSubjectContainer(profile, profile.subjects[0]).id, 'math-aa')
})

test('does not let unconfirmed topic proposals affect resources', () => {
  const mathematics = getCurriculum('IB').subjects.find((subject) => subject.id === 'mathematics-analysis-approaches')!
  const proposals = proposeSubjectTopics('Our next unit is Calculus and integration.', mathematics)
  assert.ok(proposals.some((proposal) => proposal.officialTopicId === 'calculus'))
  const context = buildLearnerResourceContexts(profile)[0]
  assert.equal(context.confirmedTopics.length, 0)
  const calculus = personalisedResourcesForContext(context).find((entry) => entry.resource.id === 'openstax-calculus-volume-1')
  assert.equal(calculus?.score, 480)
})

test('confirmed Calculus boosts only Mathematics', () => {
  const confirmedProfile = normalizeLearnerProfile({
    ...profile,
    subjects: profile.subjects.map((subject) => subject.id === 'math-aa' ? {
      ...subject,
      confirmedTopics: [{ id: 'topic-1', title: 'Calculus', officialTopicId: 'calculus', sourceDocumentId: 'doc-1', sourceFileName: 'outline.pdf', confirmedAt: '2026-09-10T00:00:00.000Z', provenance: 'LEARNER_UPLOAD' }]
    } : subject)
  })
  const contexts = buildLearnerResourceContexts(confirmedProfile)
  const mathCalculus = personalisedResourcesForContext(contexts[0]).find((entry) => entry.resource.id === 'openstax-calculus-volume-1')
  const biologyCalculus = personalisedResourcesForContext(contexts[1]).find((entry) => entry.resource.id === 'openstax-calculus-volume-1')
  assert.ok((mathCalculus?.score || 0) >= 700)
  assert.equal(biologyCalculus, undefined)
})

test('manual subjects receive general subject matching without becoming interests', () => {
  const context = buildLearnerResourceContexts(profile, ['Finance'])[2]
  const resources = personalisedResourcesForContext(context)
  assert.ok(resources.some((entry) => entry.resource.id === 'khan-academy-computer-science'))
  assert.equal(context.container.label, 'Computer Science')
  assert.deepEqual(context.interests, ['Finance'])
})

test('adapts university units to the shared academic container type', () => {
  assert.deepEqual(universityUnitContainer({ id: 'unit-1', course_code: 'ETC3400', course_name: 'Principles of Econometrics' }), {
    academicMode: 'UNIVERSITY', kind: 'UNIT', id: 'unit-1', code: 'ETC3400', label: 'Principles of Econometrics'
  })
})