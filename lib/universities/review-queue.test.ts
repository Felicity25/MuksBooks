import assert from 'node:assert/strict'
import { buildUniversityReviewQueue, getUniversityReviewDiagnostics } from './review-queue.ts'

const queue = buildUniversityReviewQueue()
const diagnostics = getUniversityReviewDiagnostics()

assert.ok(queue.length > 0, 'Qualified prospectuses should produce a non-empty human review queue')
assert.ok(queue.every((item) => item.confidenceStatus === 'NEEDS_REVIEW'), 'No extracted item may be promoted automatically')
assert.ok(queue.every((item) => item.sourceUrl.startsWith('https://') && item.sourceFingerprint), 'Every candidate must retain official source provenance')
assert.ok(queue.every((item) => item.id.includes(encodeURIComponent(item.sourceFingerprint))), 'Candidate identity must change when the source document changes')
assert.equal(diagnostics.candidates, queue.length)
assert.ok(diagnostics.programmes > 0)

console.log('University review queue tests passed')