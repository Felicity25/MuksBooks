import assert from 'node:assert/strict'
import { isAcademicUnitBinding } from './document-domain'

assert.equal(isAcademicUnitBinding('career', 'CV'), false)
assert.equal(isAcademicUnitBinding('career', 'ETC3420'), false)
assert.equal(isAcademicUnitBinding('academic', undefined), false)
assert.equal(isAcademicUnitBinding('academic', 'UNCLASSIFIED'), false)
assert.equal(isAcademicUnitBinding('academic', 'CV'), false)
assert.equal(isAcademicUnitBinding('academic', 'etc3420'), true)

console.log('document-domain: all assertions passed')