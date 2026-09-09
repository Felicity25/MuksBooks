import assert from 'node:assert/strict'
import { reviewedApplicationRouteCount } from './application-routes.ts'
import { getInstitutionSourceMetrics, PRIORITY_INSTITUTION_SOURCE_PROFILES } from './source-registry.ts'

const metrics = getInstitutionSourceMetrics()

assert.equal(metrics.institutions, 126, 'Every indexed priority-country institution should have a source profile')
assert.equal(metrics.currentProspectuses, 4, 'Only qualified current general undergraduate prospectuses should be counted')
assert.equal(metrics.liveWebsitePrimary, 94, 'Rejected prospectus documents should fall back to live website coverage')
assert.equal(metrics.accessBlocked, 23, 'Automated access blocks should remain distinct from weak source coverage')
assert.equal(metrics.weak, 5, 'Weak source profiles should remain visible for follow-up')
assert.equal(metrics.programmeFinders, 87, 'Verified programme-finder coverage should not silently shrink')
assert.equal(metrics.exactApplicationLinks, 12, 'Crawler application-link candidates should remain distinct from reviewed routes')
assert.equal(reviewedApplicationRouteCount(), 70, 'Reviewed application routes should cover 70 unique institutions')
assert.ok(PRIORITY_INSTITUTION_SOURCE_PROFILES.every((profile) => profile.reviewStatus === 'NEEDS_REVIEW'), 'Discovered sources must remain review-gated')
assert.ok(PRIORITY_INSTITUTION_SOURCE_PROFILES.filter((profile) => profile.prospectusUrl).every((profile) => profile.prospectusFingerprint), 'Qualified prospectuses should retain their content fingerprints')

console.log('University source-registry tests passed')