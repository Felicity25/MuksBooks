import assert from 'node:assert/strict'
import { buildUniversityReviewQueue, getUniversityReviewDiagnostics } from './review-queue.ts'

const queue = buildUniversityReviewQueue()
const diagnostics = getUniversityReviewDiagnostics()

assert.ok(queue.length > 0, 'Qualified prospectuses should produce a non-empty human review queue')
assert.ok(queue.every((item) => item.confidenceStatus === 'NEEDS_REVIEW'), 'No extracted item may be promoted automatically')
assert.ok(queue.every((item) => item.sourceUrl.startsWith('https://') && item.sourceFingerprint), 'Every candidate must retain official source provenance')
assert.ok(queue.every((item) => item.id.includes(encodeURIComponent(item.sourceFingerprint))), 'Candidate identity must change when the source document changes')
assert.ok(queue.every((item) => ['APPROVE', 'REJECT', 'MERGE', 'HOLD'].includes(item.reviewRecommendation)), 'Every candidate should have a deterministic review recommendation')
assert.ok(queue.every((item, index) => index === 0 || queue[index - 1].priorityScore <= item.priorityScore), 'Review queue should be sorted by deterministic priority')
assert.ok(queue.filter((item) => item.duplicateSuspicion === 'EXACT').every((item) => item.reviewRecommendation === 'MERGE'), 'Exact duplicates should be prioritised for merge')
assert.ok(queue.filter((item) => item.sourceKind === 'OFFICIAL_DISCOVERY').every((item) => item.reviewRecommendation === 'APPROVE'), 'Clear official source discoveries should be prioritised for approval')
assert.ok(queue.filter((item) => item.sourceKind === 'OFFICIAL_INDEX').length >= 400, 'Build 4.6 official-index programme candidates should enter the review queue')
assert.equal(diagnostics.candidates, queue.length)
assert.ok(diagnostics.programmes > 0)

console.log('University review queue tests passed')