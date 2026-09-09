import assert from 'node:assert/strict'
import { extractProspectusCandidates } from './prospectus-extractor.ts'

const result = extractProspectusCandidates({
  institutionId: 'example',
  sourceUrl: 'https://example.edu/undergraduate-prospectus-2027.pdf',
  documentFingerprint: 'abc123',
  extractedAt: '2026-09-09T00:00:00Z',
  pages: [
    { pageNumber: 1, text: 'Welcome to Example University. Apply online using the application portal.' },
    { pageNumber: 2, text: 'Faculty of Science\nBachelor of Science in Computer Science\nInternational Baccalaureate applicants require Mathematics. IELTS minimum overall score is 6.5.' },
    { pageNumber: 3, text: 'Bachelor of Science in Data Science\nApplications close 30 September 2026. Undergraduate scholarships are available. Scholarship deadline: 15 November. Annual tuition fee information is published online.' },
    { pageNumber: 4, text: 'Faculty of Commerce\nBachelor of Commerce in Finance\nNBT is required for selected applicants.' }
  ]
})

assert.equal(result.confidenceStatus, 'NEEDS_REVIEW')
assert.equal(result.faculties.length, 2)
assert.equal(result.faculties[0].name, 'Science')
assert.equal(result.faculties[0].startPage, 2)
assert.equal(result.faculties[0].endPage, 3)
assert.deepEqual(result.faculties[0].programmes.map((programme) => programme.name), ['Bachelor of Science in Computer Science', 'Bachelor of Science in Data Science'])
assert.ok(result.faculties[0].claims.some((claim) => claim.kind === 'CURRICULUM_REQUIREMENT' && claim.evidence.pageNumber === 2))
assert.ok(result.faculties[0].claims.some((claim) => claim.kind === 'ENGLISH_REQUIREMENT'))
assert.ok(result.faculties[0].claims.some((claim) => claim.kind === 'APPLICATION_DEADLINE' && claim.evidence.pageNumber === 3))
assert.ok(result.faculties[0].claims.some((claim) => claim.kind === 'SCHOLARSHIP'))
assert.ok(result.faculties[0].claims.some((claim) => claim.kind === 'SCHOLARSHIP_DEADLINE'))
assert.ok(result.faculties[0].claims.some((claim) => claim.kind === 'TUITION_FEE'))
assert.equal(result.faculties[1].name, 'Commerce')
assert.ok(result.faculties[1].claims.some((claim) => claim.kind === 'ADMISSIONS_TEST' && claim.evidence.pageNumber === 4))
assert.equal(result.unassignedClaims[0].kind, 'APPLICATION_ROUTE')

console.log('University prospectus extractor tests passed')
