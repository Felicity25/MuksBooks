import assert from 'node:assert/strict'
import { COUNTRY_OPTIONS, getCountryCatalogue } from './catalog.ts'
import { getAllInstitutionCoverageDiagnostics, getInstitutionCoverageDiagnostic } from './coverage-diagnostics.ts'

const diagnostics = getAllInstitutionCoverageDiagnostics()
const institutionCount = COUNTRY_OPTIONS.slice(1).reduce((total, country) => total + (getCountryCatalogue(country)?.institutions.length ?? 0), 0)
assert.equal(diagnostics.length, institutionCount, 'Every indexed institution should have a coverage diagnostic')
assert.equal(new Set(diagnostics.map((diagnostic) => diagnostic.institutionId)).size, diagnostics.length, 'Coverage diagnostics must be unique by institution')
assert.equal(getInstitutionCoverageDiagnostic('uct')?.programmeCoverage, 'STRONG')
assert.equal(getInstitutionCoverageDiagnostic('monash')?.combinedDegreeCoverage, 'STRONG')
assert.equal(getInstitutionCoverageDiagnostic('unimelb')?.majorCoverage, 'STRONG')
assert.ok(diagnostics.some((diagnostic) => diagnostic.ingestionPriority === 'HIGH'), 'Shallow institutions should be auto-prioritised')
assert.ok(diagnostics.every((diagnostic) => !Object.values(diagnostic).includes(undefined)), 'Diagnostics should not expose undefined coverage fields')

console.log('University coverage diagnostics tests passed')