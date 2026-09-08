import assert from 'node:assert/strict'
import { dateKey, isUntimedTask, localDateTime, shiftDateKey, tasksForDate, UNTIMED_MARKER, validatePlannerDrafts } from './day.ts'

assert.equal(shiftDateKey('2026-09-07', 1), '2026-09-08')
assert.equal(shiftDateKey('2026-03-01', -1), '2026-02-28')
assert.equal(localDateTime('2026-09-10', '07:30', 'Australia/Melbourne'), '2026-09-09T21:30:00.000Z')
assert.equal(dateKey(localDateTime('2026-09-10', null, 'Australia/Melbourne'), 'Australia/Melbourne'), '2026-09-10')
assert.equal(dateKey('2026-09-07T14:30:00.000Z', 'Australia/Melbourne'), '2026-09-08')

const tasks = [
  { id: 'one', title: 'Today', planned_date: '2026-09-07T09:00:00.000Z' },
  { id: 'two', title: 'Tomorrow', planned_date: '2026-09-08T09:00:00.000Z' }
]
assert.deepEqual(tasksForDate(tasks, '2026-09-07', 'UTC').map((task) => task.id), ['one'])
assert.equal(isUntimedTask({ planned_date: '2026-09-07T12:00:00.000Z', description: null }), false)
assert.equal(isUntimedTask({ planned_date: '2026-09-07T12:00:00.000Z', description: UNTIMED_MARKER }), true)

const valid = validatePlannerDrafts({ summary: 'Plan', items: [{ title: 'Study', date: '2026-09-07', startTime: '09:00', estimatedMinutes: 60, taskType: 'study', courseCode: 'etc3400', assessmentId: null, rationale: 'Requested' }] }, '2026-09-07', [])
assert.equal(valid?.items[0].courseCode, 'ETC3400')
assert.equal(valid?.items[0].conflict, null)

const conflict = validatePlannerDrafts({ items: [{ title: 'Study', date: '2026-09-07', startTime: '09:30', estimatedMinutes: 60 }] }, '2026-09-07', [{ startTime: '09:00', estimatedMinutes: 60 }])
assert.match(conflict?.items[0].conflict || '', /Overlaps/)
assert.equal(conflict?.items.filter((item) => !item.conflict).length, 0)
assert.equal(validatePlannerDrafts({ items: [{ title: '', startTime: '09:00' }] }, '2026-09-07', []), null)

console.log('Planner day tests passed.')
