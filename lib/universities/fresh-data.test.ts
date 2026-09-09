import assert from 'node:assert/strict'
import { ADMISSIONS_POLICIES, ADMISSIONS_TEST_FEES, ADMISSIONS_TEST_SESSIONS } from './admissions-data.ts'
import { ADMISSIONS_DEADLINES, CURRICULUM_RESULTS_EVENTS, OFFICIAL_UNIVERSITY_SOURCES } from './fresh-data.ts'
import { FRESH_SOURCE_PRIORITY, FreshUniversityDataService, sourceRefreshDue } from './fresh-data-service.ts'
import { REVIEWED_CATALOGUE_DEPTH } from './catalogue-depth-data.ts'
import { FUNDING_OPPORTUNITIES, PROGRAMME_COSTS } from './funding-data.ts'

assert.ok(OFFICIAL_UNIVERSITY_SOURCES.length >= 100, 'Priority institutions should have refreshable official source records')
assert.ok(OFFICIAL_UNIVERSITY_SOURCES.some((item) => item.kind === 'ENGLISH_REQUIREMENTS' && item.institutionId === 'ubc'), 'Verified English policies should participate in refresh monitoring')
assert.ok(OFFICIAL_UNIVERSITY_SOURCES.some((item) => item.kind === 'TEST_DATES'), 'Official test dates should participate in refresh monitoring')
assert.ok(OFFICIAL_UNIVERSITY_SOURCES.some((item) => item.kind === 'TEST_FEES'), 'Official test fees should participate in refresh monitoring')
assert.ok(OFFICIAL_UNIVERSITY_SOURCES.some((item) => item.kind === 'PROSPECTUS' && item.contentFingerprint), 'Current prospectuses should be fingerprinted and monitored quarterly')
assert.ok(OFFICIAL_UNIVERSITY_SOURCES.some((item) => item.kind === 'APPLICATION_ROUTES' && item.refreshCadence === 'DAILY'), 'Application destinations should refresh more frequently than prospectuses')
assert.ok(REVIEWED_CATALOGUE_DEPTH.every((programme) => OFFICIAL_UNIVERSITY_SOURCES.some((source) => source.kind === 'PROGRAMMES' && source.institutionId === programme.institutionId && source.url === programme.sourceUrl)), 'Every reviewed catalogue-depth source should participate in refresh monitoring')
assert.ok(FUNDING_OPPORTUNITIES.every((opportunity) => OFFICIAL_UNIVERSITY_SOURCES.some((source) => source.id === `${opportunity.id}-funding` && source.url === opportunity.sourceUrl)), 'Every canonical funding source should participate in refresh monitoring')
assert.ok(PROGRAMME_COSTS.every((cost) => OFFICIAL_UNIVERSITY_SOURCES.some((source) => source.id === `${cost.id}-fees` && source.url === cost.sourceUrl)), 'Every canonical fee source should participate in refresh monitoring')
assert.ok(ADMISSIONS_DEADLINES.some((item) => item.institutionId === 'oxford' && item.dueAt.startsWith('2026-10-15')), 'Oxford 2027 UCAS deadline should be structured')
assert.ok(ADMISSIONS_DEADLINES.some((item) => item.institutionId === 'manchester' && item.dueAt.startsWith('2027-01-13')), 'Most-course 2027 UCAS deadline should be structured')
assert.ok(ADMISSIONS_DEADLINES.some((item) => item.institutionId === 'unimelb' && item.applicantType === 'DOMESTIC' && item.dueAt.startsWith('2026-09-28')), 'VTAC timely deadline should be domestic and structured')
assert.ok(ADMISSIONS_DEADLINES.some((item) => item.id === 'unimelb-vtac-opens-2027' && item.dueAt === '2026-08-03T09:00:00+10:00' && item.sourceUrl === 'https://vtac.edu.au/dates'), 'VTAC opening should retain its published time and exact source')
assert.ok(ADMISSIONS_DEADLINES.some((item) => item.institutionId === 'mit' && item.id === 'mit-ra-2027' && item.dueAt.startsWith('2027-01-04')), 'MIT Regular Action deadline should be structured')
assert.ok(ADMISSIONS_DEADLINES.some((item) => item.institutionId === 'berkeley' && item.dueAt.startsWith('2026-11-30')), 'UC Berkeley deadline should be structured')
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
	text: async () => '<html><head><title>Official dates</title><link rel="canonical" href="https://www.ucas.com/dates" /></head><body><main>Applications are required by 15 October 2026. The fee is £70. An interview and portfolio may be required. <a href="https://apply.example.edu/register">Register</a></main></body></html>'
}), '2026-09-10T00:00:00Z')
assert.equal(refreshed.candidate?.pageTitle, 'Official dates')
assert.equal(refreshed.candidate?.canonicalUrl, 'https://www.ucas.com/dates')
assert.equal(refreshed.candidate?.confidenceStatus, 'NEEDS_REVIEW', 'Extracted claims must never become verified automatically')
assert.deepEqual(refreshed.candidate?.signals.dates, ['15 October 2026'])
assert.deepEqual(refreshed.candidate?.signals.fees, ['£70'])
assert.deepEqual(refreshed.candidate?.signals.requirementTerms, ['required', 'interview', 'portfolio'])
assert.deepEqual(refreshed.candidate?.signals.bookingUrls, ['https://apply.example.edu/register'])
assert.ok(refreshed.candidate?.signals.claims.some((claim) => claim.requirementType === 'APPLICATION_FEE' && claim.value === '£70'))
assert.ok(refreshed.candidate?.signals.claims.some((claim) => claim.requirementType === 'INTERVIEW_REQUIREMENT'))
assert.ok(refreshed.candidate?.signals.claims.every((claim) => claim.confidenceStatus === 'NEEDS_REVIEW'))

const structuredCandidate = service.extractCandidate(source, '<html><body><p>SAT is test-optional for 2027 entry.</p><p>The IELTS minimum overall score is 6.5.</p><p>SAT registration deadline is 15 September 2026.</p><a href="https://satsuite.collegeboard.org/register">Book SAT</a></body></html>', '2026-09-10T00:00:00Z')
assert.equal(structuredCandidate.signals.claims.find((claim) => claim.requirementType === 'ADMISSIONS_TEST_REQUIREMENT')?.status, 'TEST_OPTIONAL')
assert.ok(structuredCandidate.signals.claims.some((claim) => claim.requirementType === 'ENGLISH_REQUIREMENT' && claim.test === 'IELTS'))
assert.ok(structuredCandidate.signals.claims.some((claim) => claim.requirementType === 'TEST_REGISTRATION_DATE' && claim.value === '15 September 2026'))
assert.ok(structuredCandidate.signals.claims.some((claim) => claim.requirementType === 'TEST_BOOKING_URL'))

const fundingSource = { ...source, id: 'funding', kind: 'SCHOLARSHIPS' as const, sourceType: 'official-scholarship' as const }
const fundingCandidate = service.extractCandidate(fundingSource, '<html><body><p>Applicants are eligible based on financial need. Applications close 15 October 2026. Awards of $5,000 are available.</p><a href="https://example.edu/funding/apply">Apply for funding</a></body></html>', '2026-09-10T00:00:00Z')
assert.ok(fundingCandidate.signals.claims.some((claim) => claim.requirementType === 'FUNDING_ELIGIBILITY'))
assert.ok(fundingCandidate.signals.claims.some((claim) => claim.requirementType === 'SCHOLARSHIP_DEADLINES'))
assert.ok(fundingCandidate.signals.claims.some((claim) => claim.requirementType === 'FUNDING_AMOUNT'))
assert.ok(fundingCandidate.signals.claims.some((claim) => claim.requirementType === 'FUNDING_APPLICATION_URL'))
assert.ok(FRESH_SOURCE_PRIORITY['official-test-provider'] < FRESH_SOURCE_PRIORITY['official-admissions'])
assert.equal(sourceRefreshDue({ ...source, refreshCadence: 'QUARTERLY', lastCheckedAt: '2026-06-12T00:00:00Z' }, new Date('2026-09-10T00:00:00Z')), true)
assert.equal(sourceRefreshDue({ ...source, refreshCadence: 'QUARTERLY', lastCheckedAt: '2026-08-01T00:00:00Z' }, new Date('2026-09-10T00:00:00Z')), false)

const pdfBytes = new TextEncoder().encode('%PDF-1.7 official undergraduate guide').buffer
const pdfSource = { ...source, id: 'example-prospectus', kind: 'PROSPECTUS' as const, sourceType: 'official-prospectus' as const, url: 'https://example.edu/prospectus.pdf', refreshCadence: 'QUARTERLY' as const, contentFingerprint: undefined }
const firstPdf = await service.refreshSource(pdfSource, async () => ({ ok: true, status: 200, url: pdfSource.url, headers: { get: () => 'application/pdf' }, text: async () => '', arrayBuffer: async () => pdfBytes }), '2026-09-10T00:00:00Z')
assert.equal(firstPdf.candidate?.confidenceStatus, 'NEEDS_REVIEW')
assert.ok(firstPdf.source.contentFingerprint)
const unchangedPdf = await service.refreshSource({ ...pdfSource, contentFingerprint: firstPdf.source.contentFingerprint }, async () => ({ ok: true, status: 200, url: pdfSource.url, headers: { get: () => 'application/pdf' }, text: async () => '', arrayBuffer: async () => pdfBytes }), '2026-12-10T00:00:00Z')
assert.equal(unchangedPdf.unchanged, true, 'An unchanged prospectus must not produce a second review candidate')
assert.equal(unchangedPdf.candidate, undefined)

const originalPolicy = ADMISSIONS_POLICIES.find((policy) => policy.id === 'ubc-undergraduate-2027')!
const weakerPolicy = { ...originalPolicy, coverageLevel: 'COMPLETE' as const, source: { ...originalPolicy.source, sourceType: 'government-register' as const } }
const policyConflict = service.applyReviewedPolicyCandidates([originalPolicy], [weakerPolicy], '2026-09-10T00:00:00Z')
assert.deepEqual(policyConflict.conflicts, [originalPolicy.id])
assert.equal(policyConflict.records[0].coverageLevel, 'PARTIAL', 'A weaker conflicting policy must not replace reviewed admissions truth')

const originalSession = ADMISSIONS_TEST_SESSIONS.find((session) => session.id === 'tmua-oxford-2027-entry')!
const changedSession = { ...originalSession, registrationDeadline: '2026-09-29T18:00:00+01:00' }
const sessionChange = service.applyReviewedTestSessionCandidates([originalSession], [changedSession], '2026-09-10T00:00:00Z')
assert.equal(sessionChange.changes.length, 1)
assert.equal(sessionChange.records[0].changeHistory?.length, 1)
assert.equal(sessionChange.records[0].registrationDeadline, changedSession.registrationDeadline)

const originalFee = ADMISSIONS_TEST_FEES.find((fee) => fee.id === 'sat-us-2026')!
const feeChange = service.applyReviewedTestFeeCandidates([originalFee], [{ ...originalFee, amount: 70 }], '2026-09-10T00:00:00Z')
assert.equal(feeChange.changes.length, 1)
assert.equal(feeChange.records[0].changeHistory?.[0].sourceUrl, originalFee.source.url)
assert.equal(feeChange.records[0].amount, 70)

const failed = await service.refreshSource(source, async () => { throw new Error('network unavailable') }, '2026-09-11T00:00:00Z')
assert.equal(failed.source.confidenceStatus, 'STALE')
assert.equal(failed.source.lastSuccessfulAt, source.lastSuccessfulAt, 'Refresh failure must retain the last successful value')
assert.match(failed.error ?? '', /network unavailable/)

console.log('University fresh-data tests passed')
