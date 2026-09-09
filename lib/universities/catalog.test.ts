import assert from 'node:assert/strict'
import { getCountryCatalogue, searchUniversityCatalogue } from './catalog.ts'

const za = getCountryCatalogue('ZA')
assert.ok(za, 'South Africa catalogue should exist')
assert.ok(za.institutions.length >= 10, 'South Africa should include many institutions')
assert.ok(za.programmes.length >= 15, 'South Africa should include programme data')

const uctResults = searchUniversityCatalogue('UCT')
assert.ok(uctResults.some((entry) => entry.institution.name === 'University of Cape Town'), 'UCT should resolve to University of Cape Town')

const witsResults = searchUniversityCatalogue('Wits')
assert.ok(witsResults.some((entry) => entry.institution.name === 'University of the Witwatersrand'), 'Wits should resolve to Wits')

const computerScienceZA = searchUniversityCatalogue('computer science', { country: 'South Africa' })
assert.ok(computerScienceZA.length > 0, 'Computer science results should exist in South Africa')

const melbourneResults = searchUniversityCatalogue('Melbourne', { country: 'Australia' })
assert.ok(melbourneResults.length > 0, 'Melbourne results should exist in Australia')

const oxfordResults = searchUniversityCatalogue('Oxford', { country: 'United Kingdom' })
assert.ok(oxfordResults.length > 0, 'Oxford results should exist in the UK')

const actResults = searchUniversityCatalogue('actuarial', { country: 'Australia' })
assert.ok(actResults.some((entry) => entry.programme.name.toLowerCase().includes('actuarial')), 'Actuarial programmes should be searchable in Australia')

for (const country of ['South Africa', 'Australia', 'United Kingdom', 'Canada', 'United States', 'Singapore', 'Malaysia']) {
	const catalogue = getCountryCatalogue(country)
	assert.ok(catalogue, `${country} catalogue should exist`)
	assert.ok(catalogue.institutions.length > 0, `${country} should include institutions`)
	assert.ok(catalogue.programmes.length > 0, `${country} should include programmes`)
}

for (const country of ['South Africa', 'Australia', 'United Kingdom', 'Canada', 'United States']) {
	const catalogue = getCountryCatalogue(country)!
	assert.ok(catalogue.institutions.length >= 20, `${country} should have at least 20 priority institutions`)
	assert.ok(catalogue.programmes.length >= 250, `${country} should have at least 250 searchable programme records`)
	assert.equal(new Set(catalogue.programmes.map((programme) => programme.id)).size, catalogue.programmes.length, `${country} programme IDs must be unique`)
}

for (const country of ['South Africa', 'Australia', 'United Kingdom', 'Canada', 'United States']) {
	for (const query of ['Computer Science', 'Engineering', 'Medicine', 'Economics', 'Law', 'Psychology', 'Finance', 'Business', 'Science', 'Education']) {
		assert.ok(searchUniversityCatalogue(query, { country }).length > 0, `${country} should include a relevant ${query} result`)
	}
}

assert.ok(searchUniversityCatalogue('NUS').some((entry) => entry.institution.id === 'nus'), 'NUS alias should resolve')
assert.ok(searchUniversityCatalogue('law').slice(0, 2).every((entry) => entry.programme.studyAreas.includes('Law') || entry.programme.normalizedName.includes('law')), 'Law search should prioritise programme-relevant results')
assert.ok(searchUniversityCatalogue('economics', { region: 'England' }).every((entry) => entry.region === 'England'), 'Region filters should constrain results')

for (const query of ['actuarial science', 'medicine', 'law', 'economics', 'computer science', 'engineering', 'psychology', 'finance']) {
	const results = searchUniversityCatalogue(query)
	assert.ok(results.length > 0, `${query} should return programme results`)
	assert.ok(results.slice(0, 3).every((entry) => [entry.programme.name, entry.programme.normalizedName, ...entry.programme.studyAreas, ...entry.programme.tags].join(' ').toLowerCase().includes(query)), `${query} top results should be programme-relevant`)
}

assert.equal(searchUniversityCatalogue('definitely-not-a-real-course-xyz').length, 0, 'Irrelevant searches should return no results')

assert.equal(searchUniversityCatalogue('medicine').some((entry) => entry.programme.normalizedName === 'computer science'), false, 'Medicine must not return Computer Science programmes')
assert.equal(searchUniversityCatalogue('engineering', { country: 'South Africa' }).some((entry) => entry.programme.normalizedName === 'medicine'), false, 'Engineering must not return Medicine programmes')
assert.ok(searchUniversityCatalogue('comp sci').some((entry) => entry.programme.normalizedName === 'computer science'), 'Comp sci synonym should resolve')
assert.ok(searchUniversityCatalogue('econ').some((entry) => entry.programme.normalizedName === 'economics'), 'Econ synonym should resolve')

console.log('University catalogue tests passed')
