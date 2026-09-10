import assert from 'node:assert/strict'
import { searchUniversityCatalogue } from './catalog.ts'
import { DEFAULT_UNIVERSITY_SEARCH_STATE, parseUniversitySearchState, serializeUniversitySearchState, updateUniversitySearchState } from './search-state.ts'

let state = updateUniversitySearchState(DEFAULT_UNIVERSITY_SEARCH_STATE, { search: 'Actuarial Science' })
let results = searchUniversityCatalogue(state.search, state)
assert.ok(results.length > 0, 'Case A: actuarial science should return results')
assert.ok(results.slice(0, 5).every((result) => /actuari/i.test([result.programme.name, result.programme.normalizedName, ...result.programme.studyAreas].join(' '))), 'Case A: actuarial programmes should rank first')

state = updateUniversitySearchState(state, { country: 'Australia' })
results = searchUniversityCatalogue(state.search, state)
assert.equal(state.search, 'Actuarial Science', 'Case B: adding country must preserve search')
assert.ok(results.length > 0 && results.every((result) => result.country === 'Australia'), 'Case B: only Australian matches should remain')

state = updateUniversitySearchState(state, { region: 'Victoria' })
results = searchUniversityCatalogue(state.search, state)
assert.equal(state.search, 'Actuarial Science', 'Case C: adding region must preserve search')
assert.equal(state.country, 'Australia', 'Case C: adding region must preserve country')
assert.ok(results.length > 0 && results.every((result) => result.region === 'Victoria'), 'Case C: only Victorian matches should remain')

state = updateUniversitySearchState(state, { search: 'Computer Science' })
results = searchUniversityCatalogue(state.search, state)
assert.equal(state.country, 'Australia', 'Case D: changing search must preserve country')
assert.equal(state.region, 'Victoria', 'Case D: changing search must preserve region')
assert.ok(results.length > 0 && results.every((result) => result.country === 'Australia' && result.region === 'Victoria'), 'Case D: both filters must remain applied')

state = updateUniversitySearchState(state, { region: 'All' })
assert.equal(state.search, 'Computer Science', 'Case E: clearing region must preserve search')
assert.equal(state.country, 'Australia', 'Case E: clearing region must preserve country')

const restored = parseUniversitySearchState(serializeUniversitySearchState(state))
assert.deepEqual(restored, state, 'Case F: URL parameters should restore the complete query state')

const noMatches = searchUniversityCatalogue('Medicine', { country: 'Australia', region: 'Victoria', studyArea: 'Law' })
assert.equal(noMatches.length, 0, 'Case H: an impossible combination should remain empty without dropping filters')

console.log('University search state tests passed')