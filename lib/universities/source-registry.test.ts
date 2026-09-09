import assert from 'node:assert/strict'
import { reviewedApplicationRouteCount } from './application-routes.ts'
import { getInstitutionSourceMetrics, PRIORITY_INSTITUTION_SOURCE_PROFILES } from './source-registry.ts'

const metrics = getInstitutionSourceMetrics()

assert.equal(metrics.institutions, 126, 'Every indexed priority-country institution should have a source profile')
assert.equal(metrics.currentProspectuses, 4, 'Only qualified current general undergraduate prospectuses should be counted')
assert.equal(metrics.liveWebsitePrimary, 93, 'Rejected prospectus documents should fall back to live website coverage')
assert.equal(metrics.accessBlocked, 25, 'Automated access blocks should remain distinct from weak source coverage')
assert.equal(metrics.weak, 4, 'Weak source profiles should remain visible for follow-up')
assert.equal(metrics.programmeFinders, 86, 'Verified programme-finder coverage should match the latest official-domain crawl')
assert.equal(metrics.exactApplicationLinks, 11, 'Crawler application-link candidates should remain distinct from reviewed routes')
assert.equal(metrics.fundingPages, 44, 'Official funding pages should be retained for review and refresh')
assert.equal(metrics.scholarshipPages, 2, 'Specifically classified scholarship pages should remain visible without implying exhaustive coverage')
assert.equal(metrics.feePages, 17, 'Official fee pages should be retained for review and refresh')
assert.equal(reviewedApplicationRouteCount(), 70, 'Reviewed application routes should cover 70 unique institutions')
assert.ok(PRIORITY_INSTITUTION_SOURCE_PROFILES.every((profile) => profile.reviewStatus === 'NEEDS_REVIEW'), 'Discovered sources must remain review-gated')
assert.ok(PRIORITY_INSTITUTION_SOURCE_PROFILES.filter((profile) => profile.prospectusUrl).every((profile) => profile.prospectusFingerprint), 'Qualified prospectuses should retain their content fingerprints')

console.log('University source-registry tests passed')