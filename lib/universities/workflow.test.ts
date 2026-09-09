import assert from 'node:assert/strict'
import { createApplication, universityStorage } from './storage.ts'
import { getModeAwareHomepageLayout, normalizeUserSettings } from '../user-settings.ts'
import { APPLICATION_STATUSES, addOffer, createAdmissionsTestTasks, createManualUniversityApplication, createUniversityApplication, deadlinesForApplication, describeOfferCondition, describeResultsTiming, formatDeadlineDate, matchResultsEvent, normalizeUniversityApplication, plannerPayloadForTask, reconcileDeadline, resolveApplicationRoute, syncDeadlineTasks, syncTestSessionTasks } from './application-domain.ts'
import { getInstitution, getInstitutionProgrammes, getProgramme } from './catalog.ts'
import type { AdmissionsDeadline, AdmissionsTestSession, CurriculumResultsEvent, UniversityOffer } from './types.ts'

const values = new Map<string, string>()
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } }
})

universityStorage.saveShortlist(['uct-bsc-cs', 'uct-bsc-cs', 'monash-actuarial'])
assert.deepEqual(universityStorage.getShortlist(), ['uct-bsc-cs', 'monash-actuarial'], 'Guest shortlist should persist unique programme IDs')

universityStorage.saveCompare(['a', 'b', 'c', 'd', 'e'])
assert.deepEqual(universityStorage.getCompare(), ['a', 'b', 'c', 'd'], 'Comparison should be capped at four programmes')

const application = createApplication('uct-bsc-cs', 'uct')
universityStorage.saveApplications([application])
const reloaded = universityStorage.getApplications()
assert.equal(reloaded[0].programmeId, 'uct-bsc-cs')
assert.equal(reloaded[0].status, 'INTERESTED')
assert.deepEqual(APPLICATION_STATUSES, ['INTERESTED', 'RESEARCHING', 'PREPARING', 'READY_TO_APPLY', 'APPLICATION_OPEN', 'APPLIED', 'DOCUMENTS_PENDING', 'AWAITING_DECISION', 'INTERVIEW_OR_ASSESSMENT', 'CONDITIONAL_OFFER', 'UNCONDITIONAL_OFFER', 'WAITLISTED', 'REJECTED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'], 'The complete application lifecycle should remain available')

const accountSettings = normalizeUserSettings({ universityShortlist: ['lse-economics'], universityCompare: ['a', 'a', 'b', 'c', 'd', 'e'], universityApplications: [{ ...application, status: 'APPLIED' }] })
assert.deepEqual(accountSettings.universityShortlist, ['lse-economics'])
assert.deepEqual(accountSettings.universityCompare, ['a', 'b', 'c', 'd'])
assert.equal(accountSettings.universityApplications[0].status, 'APPLIED')

const universityLayout = getModeAwareHomepageLayout('UNIVERSITY', [{ id: 'careers', size: 'large' }, { id: 'planner', size: 'medium' }])
assert.deepEqual(universityLayout.map((item) => item.id), ['careers', 'planner'], 'University mode should retain University-only widgets')
const learnerLayout = getModeAwareHomepageLayout('LEARNER', universityLayout)
assert.deepEqual(learnerLayout.map((item) => item.id), ['planner'], 'Learner mode should remove University-only widgets')

const migrated = normalizeUniversityApplication({ id: 'legacy', programmeId: 'uct-bsc-cs', institutionId: 'uct', status: 'Preparing' as never, notes: '', tasks: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' })
assert.equal(migrated.status, 'PREPARING')
assert.equal(migrated.applicantRoute, 'SCHOOL_LEAVER')
assert.ok(migrated.documents.some((item) => item.type === 'TRANSCRIPT'))

const transfer = createUniversityApplication('monash-actuarial', 'monash', new Date('2026-09-09T00:00:00Z'), 'COLLEGE_TO_UNIVERSITY')
assert.ok(transfer.documents.some((item) => item.type === 'TERTIARY_TRANSCRIPT' && item.required))
assert.ok(transfer.documents.some((item) => item.type === 'COURSE_OUTLINES'))

const deadlineBase: AdmissionsDeadline = { id: 'uct-2027', institutionId: 'uct', intakeYear: 2027, deadlineType: 'APPLICATION_DEADLINE', dueAt: '2026-09-30T21:59:00Z', timezone: 'Africa/Johannesburg', description: 'Undergraduate application deadline', sourceUrl: 'https://uct.ac.za/', sourceType: 'official-admissions', admissionsCycle: '2027', lastCheckedAt: '2026-09-01T00:00:00Z', lastVerifiedAt: '2026-09-01T00:00:00Z', confidenceStatus: 'VERIFIED_OFFICIAL' }
const changed = reconcileDeadline(deadlineBase, { ...deadlineBase, dueAt: '2026-10-15T21:59:00Z', lastCheckedAt: '2026-09-09T00:00:00Z' })
assert.equal(changed.changed, true)
assert.equal(changed.deadline.previousValues?.[0].dueAt, deadlineBase.dueAt)
assert.equal(deadlinesForApplication({ ...transfer, institutionId: 'uct', intakeYear: 2027 }, [changed.deadline]).length, 1)
assert.equal(formatDeadlineDate({ dueAt: '2027-01-13T18:00:00+00:00', timezone: 'Europe/London' }), '13 Jan 2027', 'Deadlines must render in their source timezone')
const linkedTaskApplication = { ...transfer, tasks: [{ id: 'deadline-task', title: 'Submit application', dueAt: deadlineBase.dueAt, completed: false, plannerTaskId: 'planner-1', sourceDeadlineId: deadlineBase.id, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' }] }
const synced = syncDeadlineTasks(linkedTaskApplication, [changed.deadline], new Date('2026-09-09T00:00:00Z'))
assert.deepEqual(synced.changedTaskIds, ['deadline-task'])
assert.equal(synced.application.tasks[0].dueAt, '2026-10-15T21:59:00Z')
assert.match(synced.application.timeline.at(-1)?.description ?? '', /University deadline updated/)

const events: CurriculumResultsEvent[] = [
  { id: 'ib-may-2027', curriculum: 'IB', examSession: 'MAY', examYear: 2027, eventType: 'RESULTS_RELEASE', dateTime: '2027-07-06T12:00:00Z', timezone: 'UTC', sourceUrl: 'https://ibo.org/', sourceType: 'official-curriculum', lastCheckedAt: '2026-09-09T00:00:00Z', confidenceStatus: 'NEEDS_REVIEW' },
  { id: 'ib-nov-2027', curriculum: 'IB', examSession: 'NOVEMBER', examYear: 2027, eventType: 'RESULTS_RELEASE', dateTime: '2028-01-02T12:00:00Z', timezone: 'UTC', sourceUrl: 'https://ibo.org/', sourceType: 'official-curriculum', lastCheckedAt: '2026-09-09T00:00:00Z', confidenceStatus: 'NEEDS_REVIEW' }
]
assert.equal(matchResultsEvent('IB', 'NOVEMBER', 2027, events)?.id, 'ib-nov-2027')
assert.equal(matchResultsEvent('IB', 'MAY', 2028, events), undefined, 'Results must match the exact session and year')
assert.match(describeResultsTiming(undefined), /exact release date has not been verified/)
assert.match(describeResultsTiming(events[1], new Date('2027-12-15T12:00:00Z')), /expected soon/)
assert.match(describeResultsTiming(events[1], new Date('2028-01-03T12:00:00Z')), /now available/)
assert.equal(describeOfferCondition({ id: 'ib-38', type: 'OVERALL_SCORE', description: 'IB 38', minimumValue: 38 }, { kind: 'PREDICTED', value: 40 }), 'Your predicted result is currently above this condition. This does not satisfy the offer.')
assert.match(describeOfferCondition({ id: 'ib-38', type: 'OVERALL_SCORE', description: 'IB 38', minimumValue: 38 }, { kind: 'FINAL', value: 39 }), /Await university confirmation/)

const offer: UniversityOffer = { id: 'offer-1', applicationId: transfer.id, offerType: 'CONDITIONAL', receivedAt: '2026-09-09T00:00:00Z', conditions: [], status: 'AWAITING_RESULTS', notes: '' }
assert.equal(addOffer(transfer, offer).status, 'CONDITIONAL_OFFER')
const plannerPayload = plannerPayloadForTask(transfer, { id: 'task-1', title: 'Upload transcript', dueAt: '2026-09-20', completed: false, createdAt: '2026-09-09', updatedAt: '2026-09-09' })
assert.equal(plannerPayload.taskType, 'university_application')

const tmuaSession: AdmissionsTestSession = { id: 'tmua-test', test: 'TMUA', label: 'TMUA window', registrationDeadline: '2026-09-28T18:00:00+01:00', testStartsAt: '2026-10-12T00:00:00+01:00', testEndsAt: '2026-10-16T23:59:00+01:00', status: 'BOOKING_OPEN', bookingUrl: 'https://esat-tmua.ac.uk/register/', source: { title: 'Official TMUA dates', url: 'https://esat-tmua.ac.uk/', sourceType: 'official-test-provider', lastVerifiedAt: '2026-09-09', admissionsCycle: '2027 entry' } }
const testTasks = createAdmissionsTestTasks('TMUA', 'TMUA', tmuaSession, new Date('2026-09-09T10:00:00Z'))
assert.deepEqual(testTasks.map((task) => task.title), ['Register for TMUA', 'Take TMUA', 'Submit TMUA results'])
assert.equal(testTasks[0].dueAt, '2026-09-28T18:00:00+01:00', 'Provider timezone offsets must survive task creation')
assert.equal(testTasks[0].sourceTestMilestone, 'REGISTRATION_DEADLINE')
assert.equal(testTasks[1].sourceTestMilestone, 'TEST_DATE')
assert.equal(testTasks[2].dueAt, undefined, 'A score-submission due date must not be invented')
const testTaskApplication = { ...transfer, tasks: testTasks }
universityStorage.saveApplications([testTaskApplication])
assert.equal(universityStorage.getApplications()[0].tasks[0].sourceTestSessionId, 'tmua-test', 'Test task metadata must survive guest persistence')
const revisedTmua = { ...tmuaSession, registrationDeadline: '2026-09-29T18:00:00+01:00', testStartsAt: '2026-10-13T00:00:00+01:00' }
const testSync = syncTestSessionTasks(testTaskApplication, [revisedTmua], new Date('2026-09-10T00:00:00Z'))
assert.deepEqual(testSync.changedTaskIds, [testTasks[0].id, testTasks[1].id])
assert.equal(testSync.application.tasks[0].dueAt, revisedTmua.registrationDeadline)
assert.equal(testSync.application.tasks[1].dueAt, revisedTmua.testStartsAt)
assert.match(testSync.application.timeline.at(-1)?.description ?? '', /Admissions test date updated/)
assert.match(plannerPayloadForTask(testTaskApplication, testTasks[0]).description, /Test: TMUA/, 'Planner payload must preserve test identity')

const manual = createManualUniversityApplication({ university: 'University X', programme: 'Bachelor Y', country: 'Australia', intakeYear: 2028, applicantType: 'INTERNATIONAL', applicationMethod: 'Direct', applicationPortalUrl: 'https://example.edu/apply', userDeadline: '2027-10-15', notes: 'Portal-specific date' }, new Date('2026-09-09T12:00:00Z'))
universityStorage.saveApplications([manual])
const restoredManual = universityStorage.getApplications()[0]
assert.equal(restoredManual.dataOrigin, 'USER_ENTERED')
assert.equal(restoredManual.customInstitutionName, 'University X')
assert.equal(restoredManual.userDeadline, '2027-10-15')
assert.equal(restoredManual.applicationPortalUrl, 'https://example.edu/apply')

const oxford = getInstitution('oxford')!
const oxfordMaths = getProgramme('oxford-maths')!
const applicantSpecificProgramme = { ...oxfordMaths, domesticApplicationUrl: 'https://www.ucas.com/applying', internationalApplicationUrl: 'https://example.edu/international-apply', applicationUrl: undefined, centralApplicationUrl: 'https://www.ucas.com/applying' }
assert.equal(resolveApplicationRoute(applicantSpecificProgramme, oxford, 'DOMESTIC').method, 'UCAS')
assert.equal(resolveApplicationRoute(applicantSpecificProgramme, oxford, 'DOMESTIC').url, applicantSpecificProgramme.domesticApplicationUrl)
assert.equal(resolveApplicationRoute(applicantSpecificProgramme, oxford, 'INTERNATIONAL').url, applicantSpecificProgramme.internationalApplicationUrl)
assert.equal(resolveApplicationRoute(oxfordMaths, oxford, 'UNCERTAIN').method, 'UCAS')
const uq = getInstitution('uq')!
const uqProgramme = getInstitutionProgrammes('uq')[0]
assert.equal(resolveApplicationRoute(uqProgramme, uq, 'DOMESTIC').method, 'QTAC')
assert.notEqual(resolveApplicationRoute(uqProgramme, uq, 'INTERNATIONAL').method, 'QTAC', 'Domestic central routes must not be shown as international routes')

console.log('University workflow tests passed')
