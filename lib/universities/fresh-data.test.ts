import assert from 'node:assert/strict'
import { ADMISSIONS_DEADLINES, CURRICULUM_RESULTS_EVENTS, OFFICIAL_UNIVERSITY_SOURCES } from './fresh-data.ts'
import { FreshUniversityDataService } from './fresh-data-service.ts'

assert.ok(OFFICIAL_UNIVERSITY_SOURCES.length >= 100, 'Priority institutions should have refreshable official source records')
assert.ok(ADMISSIONS_DEADLINES.some((item) => item.institutionId === 'oxford' && item.dueAt.startsWith('2026-10-15')), 'Oxford 2027 UCAS deadline should be structured')
assert.ok(ADMISSIONS_DEADLINES.some((item) => item.institutionId === 'manchester' && item.dueAt.startsWith('2027-01-13')), 'Most-course 2027 UCAS deadline should be structured')
assert.equal(CURRICULUM_RESULTS_EVENTS.length, 0, 'Future result dates must not be guessed when the official source does not publish an exact date')

const service = new FreshUniversityDataService()
const original = ADMISSIONS_DEADLINES[0]
const changed = service.applyDeadlineCandidates([original], [{ ...original, dueAt: '2026-10-15T18:00:00+01:00', lastCheckedAt: '2026-09-10T00:00:00Z' }])
assert.equal(changed.changes.length, 1)
assert.equal(changed.records[0].previousValues?.[0].dueAt, original.dueAt)

const weaker = service.applyDeadlineCandidates([original], [{ ...original, dueAt: '2026-10-16T18:00:00+01:00', confidenceStatus: 'AUTO_EXTRACTED_OFFICIAL' }])
assert.equal(weaker.conflicts.length, 1)
assert.equal(weaker.records[0].dueAt, original.dueAt, 'A weaker conflicting candidate must not replace a verified deadline')
assert.equal(service.markFailedSource('ucas-2027-deadlines', '2026-09-10T00:00:00Z').find((item) => item.id === 'ucas-2027-deadlines')?.confidenceStatus, 'STALE')

const source = OFFICIAL_UNIVERSITY_SOURCES.find((item) => item.id === 'ucas-2027-deadlines')!
const refreshed = await service.refreshSource(source, async () => ({
	ok: true,
	status: 200,
	url: source.url,
	headers: { get: () => 'text/html; charset=utf-8' },
	text: async () => '<html><head><title>Official dates</title><link rel="canonical" href="https://www.ucas.com/dates" /></head><body><main>Applications close on the published date.</main></body></html>'
}), '2026-09-10T00:00:00Z')
assert.equal(refreshed.candidate?.pageTitle, 'Official dates')
assert.equal(refreshed.candidate?.canonicalUrl, 'https://www.ucas.com/dates')
assert.equal(refreshed.candidate?.confidenceStatus, 'NEEDS_REVIEW', 'Extracted claims must never become verified automatically')

const failed = await service.refreshSource(source, async () => { throw new Error('network unavailable') }, '2026-09-11T00:00:00Z')
assert.equal(failed.source.confidenceStatus, 'STALE')
assert.equal(failed.source.lastSuccessfulAt, source.lastSuccessfulAt, 'Refresh failure must retain the last successful value')
assert.match(failed.error ?? '', /network unavailable/)

console.log('University fresh-data tests passed')
