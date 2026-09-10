import assert from 'node:assert/strict'
import { getCountryCatalogue, getInstitution, getInstitutionProgrammes, getProgramme, searchUniversityCatalogue } from './catalog.ts'
import { SCALE_CATALOGUE_DEPTH } from './catalogue-scale-data.ts'

assert.ok(SCALE_CATALOGUE_DEPTH.length >= 400, 'Build 4.6 should retain substantial official-index programme depth')
assert.equal(new Set(SCALE_CATALOGUE_DEPTH.map((programme) => programme.id)).size, SCALE_CATALOGUE_DEPTH.length, 'Build 4.6 programme candidate IDs must remain unique')
assert.ok(SCALE_CATALOGUE_DEPTH.every((programme) => programme.confidenceStatus === 'NEEDS_REVIEW'), 'Official-index candidates must remain review-gated until individual programme evidence is approved')
assert.ok(SCALE_CATALOGUE_DEPTH.every((programme) => programme.sourceUrl.startsWith('https://')), 'Build 4.6 programme candidates must retain official HTTPS sources')
assert.equal(SCALE_CATALOGUE_DEPTH.find((programme) => programme.name === 'Bachelor of Arts and Bachelor of Laws (Honours)')?.degreeType, 'Double degree', 'Build 4.6 must preserve Australian double-degree identity')

assert.equal(getInstitution('melbourne')?.id, 'unimelb', 'Common Melbourne ID should resolve to the canonical institution')
assert.equal(getInstitution('toronto')?.id, 'utoronto', 'Common Toronto ID should resolve to the canonical institution')
assert.ok(getInstitutionProgrammes('melbourne').length > 0, 'Melbourne alias should resolve canonical programmes')
assert.ok(getInstitutionProgrammes('toronto').length > 0, 'Toronto alias should resolve canonical programmes')
assert.ok(getInstitutionProgrammes('ul').filter((programme) => programme.confidenceStatus === 'VERIFIED_OFFICIAL').length >= 17, 'University of Limpopo should expose reviewed programme depth')
assert.equal(getInstitution('ul')?.faculties?.length, 4, 'University of Limpopo should expose its reviewed faculty structure')
assert.deepEqual(getProgramme('ul-llb')?.streams, ['Standard curriculum', 'Extended Curriculum Programme'], 'The LLB extended curriculum should remain a stream')
assert.deepEqual(getProgramme('ul-bsc')?.streams, ['Mathematical Sciences', 'Life Sciences', 'Physical Sciences'], 'BSc variants should remain streams')
assert.equal(getProgramme('ul-mbchb')?.officialProgrammeUrl, 'https://www.ul.ac.za/faculty-of-health-sciences/school-of-medicine/', 'Reviewed medicine should use its exact official destination')
assert.ok(getProgramme('unimelb-bsc')?.majors?.includes('Data Science'), 'Melbourne Data Science should be indexed honestly as a Bachelor of Science major')
assert.ok(getProgramme('monash-commerce-computer-science')?.degreeType === 'Double degree', 'Monash combined degrees should remain distinct programmes')
assert.ok(getProgramme('unsw-engineering-computer-science')?.degreeType === 'Double degree', 'UNSW combined degrees should remain distinct programmes')
assert.ok(searchUniversityCatalogue('Business Analytics').some((entry) => entry.programme.majors?.includes('Business Analytics')), 'Business Analytics majors should participate in search')
assert.ok(searchUniversityCatalogue('Data Science').some((entry) => entry.programme.majors?.includes('Data Science')), 'Data Science majors should participate in search')

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

for (const query of ['actuarial science', 'computer science', 'medicine', 'law', 'engineering', 'finance', 'economics', 'psychology', 'education', 'data science', 'architecture', 'business analytics']) {
	const results = searchUniversityCatalogue(query)
	assert.ok(results.length > 0, `${query} should return programme results`)
	assert.ok(results.slice(0, 3).every((entry) => [entry.programme.name, entry.programme.normalizedName, ...entry.programme.studyAreas, ...entry.programme.tags].join(' ').toLowerCase().includes(query)), `${query} top results should be programme-relevant`)
}

for (const institutionId of ['uct', 'wits', 'uj', 'up', 'stellenbosch', 'monash', 'unimelb', 'unsw', 'usyd', 'uq', 'oxford', 'cambridge', 'ucl', 'manchester', 'edinburgh', 'utoronto', 'ubc', 'mcgill', 'waterloo', 'mit', 'stanford', 'harvard', 'berkeley', 'umich', 'nyu']) {
	const programmes = getInstitutionProgrammes(institutionId)
	assert.ok(programmes.length >= 15, `${institutionId} should have materially deep programme coverage`)
	const canonicalKeys = programmes.map((programme) => `${programme.institutionId}:${programme.normalizedName}:${programme.degreeType === 'Double degree' ? programme.id : 'single'}`)
	assert.equal(new Set(canonicalKeys).size, canonicalKeys.length, `${institutionId} should not duplicate equivalent degree aliases`)
}

assert.equal(searchUniversityCatalogue('definitely-not-a-real-course-xyz').length, 0, 'Irrelevant searches should return no results')

assert.equal(searchUniversityCatalogue('medicine').some((entry) => entry.programme.normalizedName === 'computer science'), false, 'Medicine must not return Computer Science programmes')
assert.equal(searchUniversityCatalogue('engineering', { country: 'South Africa' }).some((entry) => entry.programme.normalizedName === 'medicine'), false, 'Engineering must not return Medicine programmes')
assert.ok(searchUniversityCatalogue('comp sci').some((entry) => entry.programme.normalizedName === 'computer science'), 'Comp sci synonym should resolve')
assert.ok(searchUniversityCatalogue('econ').some((entry) => entry.programme.normalizedName === 'economics'), 'Econ synonym should resolve')
assert.ok(searchUniversityCatalogue('Finance', { country: 'Canada' }).some((entry) => entry.programme.majors?.includes('Finance')), 'Official majors should participate in search without becoming artificial standalone degrees')

console.log('University catalogue tests passed')
