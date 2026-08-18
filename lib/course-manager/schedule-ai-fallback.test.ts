import assert from 'node:assert/strict'
import { validateAiSchedule } from './schedule-ai-fallback'

assert.equal(validateAiSchedule({ entries: [{ weekNumber: -1, topic: 'Invalid' }] }), null)
assert.equal(validateAiSchedule({ entries: [{ weekNumber: 1, topic: '', additionalTopics: [], activities: [], assessmentReferences: [] }] }), null)
const valid = validateAiSchedule({ entries: [{ weekNumber: 0, topic: 'Foundations', additionalTopics: [], activities: ['Lab'], assessmentReferences: [], isBreak: false }], assessments: [{ title: 'Exam', weighting: 60 }] })
assert.equal(valid?.entries[0].weekNumber, 0)
assert.equal(valid?.assessments[0].weighting, 60)

console.log('schedule-ai-fallback: all assertions passed')