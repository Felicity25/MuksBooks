import assert from 'node:assert/strict'
import { DEFAULT_LEARNER_PROFILE } from '../learner/store.ts'
import { createFundingApplication, createManualFundingApplication, fundingPlanGap, fundingPlanTotals, getFundingEligibility, reconcileFundingDeadline, searchFundingOpportunities, selectProgrammeCost } from './funding-domain.ts'
import { FUNDING_OPPORTUNITIES } from './funding-data.ts'
import type { FundingApplication, FundingOpportunity, ProgrammeCost } from './types.ts'

const opportunity = (overrides: Partial<FundingOpportunity>): FundingOpportunity => ({
  id: 'scheme', name: 'Scheme', provider: 'Provider', providerType: 'GOVERNMENT', fundingType: 'GOVERNMENT_STUDENT_FINANCE', repaymentType: 'NON_REPAYABLE', providerCountry: 'South Africa', eligibleDestinationCountries: ['South Africa'], eligibleInstitutions: ['uct'], eligibleProgrammes: [], eligibleFaculties: [], eligibleStudyAreas: [], eligibleStudyLevels: ['BACHELOR'], citizenshipRules: ['South Africa'], residenceRules: ['South Africa'], domesticInternationalRules: ['DOMESTIC'], applicantRouteRules: [], curriculumRules: [], academicRequirements: [], otherEligibility: [], amountType: 'VARIABLE', coverage: ['Tuition'], separateApplicationRequired: true, applicationMethod: 'Official portal', officialUrl: 'https://www.nsfas.org.za/content/bursary-scheme.html', applicationUrl: 'https://my.nsfas.org.za/', sourceUrl: 'https://www.nsfas.org.za/content/bursary-scheme.html', sourceType: 'government-funding', sourceTitle: 'NSFAS bursary scheme', fundingCycle: '2027', lastCheckedAt: '2026-09-09', lastVerifiedAt: '2026-09-09', confidenceStatus: 'VERIFIED_OFFICIAL', active: true, ...overrides
})

const southAfricanProfile = { ...DEFAULT_LEARNER_PROFILE, universityPlanning: { ...DEFAULT_LEARNER_PROFILE.universityPlanning, citizenships: ['South Africa'], residenceCountry: 'South Africa' } }
const domestic = getFundingEligibility(opportunity({}), { learnerProfile: southAfricanProfile, destinationCountry: 'South Africa', applicantType: 'DOMESTIC', studyLevel: 'BACHELOR', institutionId: 'uct' })
assert.equal(domestic.state, 'STRONG_POTENTIAL_MATCH')

const abroad = getFundingEligibility(opportunity({}), { learnerProfile: southAfricanProfile, destinationCountry: 'Australia', applicantType: 'INTERNATIONAL', studyLevel: 'BACHELOR', institutionId: 'monash' })
assert.equal(abroad.state, 'NOT_APPLICABLE')
assert.equal(getFundingEligibility(opportunity({ applicantRouteRules: ['SCHOOL_LEAVER'] }), { learnerProfile: southAfricanProfile, applicantType: 'DOMESTIC', studyLevel: 'BACHELOR', institutionId: 'uct' }).state, 'MISSING_INFORMATION')

const australianProfile = { ...DEFAULT_LEARNER_PROFILE, universityPlanning: { ...DEFAULT_LEARNER_PROFILE.universityPlanning, citizenships: ['Australia'], residenceCountry: 'Australia' } }
const hecs = opportunity({ id: 'hecs', providerCountry: 'Australia', eligibleDestinationCountries: ['Australia'], eligibleInstitutions: [], citizenshipRules: ['Australia'], residenceRules: ['Australia'], domesticInternationalRules: ['DOMESTIC'], repaymentType: 'REPAYABLE' })
assert.notEqual(getFundingEligibility(hecs, { learnerProfile: australianProfile, destinationCountry: 'Australia', applicantType: 'DOMESTIC', studyLevel: 'BACHELOR' }).state, 'NOT_APPLICABLE')
assert.equal(getFundingEligibility(hecs, { learnerProfile: southAfricanProfile, destinationCountry: 'Australia', applicantType: 'INTERNATIONAL', studyLevel: 'BACHELOR' }).state, 'NOT_APPLICABLE')
const guardedHecs = opportunity({ ...hecs, requiredContext: ['ELIGIBLE_COURSE_OR_PLACE', 'GOVERNMENT_ELIGIBILITY'] })
assert.equal(getFundingEligibility(guardedHecs, { learnerProfile: australianProfile, destinationCountry: 'Australia', applicantType: 'DOMESTIC', studyLevel: 'BACHELOR' }).state, 'MISSING_INFORMATION')

const costs: ProgrammeCost[] = [
  { id: 'domestic', institutionId: 'monash', academicYear: 2027, applicantType: 'DOMESTIC', placeType: 'CSP', feeType: 'TUITION_ANNUAL', currency: 'AUD', amountBasis: 'Annual student contribution', sourceUrl: 'https://www.studyassist.gov.au/', lastCheckedAt: '2026-09-09', confidenceStatus: 'VERIFIED_OFFICIAL' },
  { id: 'international', institutionId: 'monash', academicYear: 2027, applicantType: 'INTERNATIONAL', feeType: 'TUITION_ANNUAL', amount: 48000, currency: 'AUD', amountBasis: 'Annual', sourceUrl: 'https://www.monash.edu/study/fees-scholarships/fees', lastCheckedAt: '2026-09-09', confidenceStatus: 'VERIFIED_OFFICIAL' }
]
assert.equal(selectProgrammeCost(costs, { institutionId: 'monash', academicYear: 2027, applicantType: 'INTERNATIONAL' })?.id, 'international')
assert.equal(selectProgrammeCost(costs, { institutionId: 'monash', academicYear: 2027, applicantType: 'DOMESTIC', placeType: 'CSP' })?.id, 'domestic')

const tracked = (status: FundingApplication['status'], awardAmount?: number): FundingApplication => ({ id: status, fundingOpportunityId: 'award', dataOrigin: 'OFFICIAL_VERIFIED', status, awardAmount, awardCurrency: 'AUD', notes: '', documents: [], tasks: [], createdAt: '2026-09-09', updatedAt: '2026-09-09' })
const award = opportunity({ id: 'award', currency: 'AUD', fundingAmount: 20000 })
assert.deepEqual(fundingPlanTotals([tracked('SAVED'), tracked('AWARDED', 5000)], [award], 'AUD'), { confirmed: 5000, potential: 20000 })
const manualPotential = createManualFundingApplication({ name: 'Local award', provider: 'School', expectedAmount: 7000, awardCurrency: 'AUD' })
assert.equal(fundingPlanTotals([manualPotential], [], 'AUD').potential, 7000)
assert.equal(fundingPlanGap({ tuition: 50000, tuitionCurrency: 'USD', planCurrency: 'AUD', confirmed: 5000, contribution: 1000 }), undefined)
assert.equal(fundingPlanGap({ tuition: 50000, tuitionCurrency: 'AUD', planCurrency: 'AUD', confirmed: 5000, contribution: 1000 }), 44000)

const engineering = opportunity({ id: 'engineering', name: 'Engineering Scholarship', providerType: 'UNIVERSITY', fundingType: 'FACULTY_SCHOLARSHIP', eligibleStudyAreas: ['Engineering'] })
const arts = opportunity({ id: 'arts', name: 'Arts Award', providerType: 'UNIVERSITY', fundingType: 'FACULTY_SCHOLARSHIP', eligibleStudyAreas: ['Arts'], otherEligibility: ['Provider also offers engineering degrees.'] })
assert.equal(searchFundingOpportunities([arts, engineering], 'engineering scholarship')[0]?.id, 'engineering')

const originalDeadline = { id: 'deadline', fundingOpportunityId: 'award', deadlineType: 'APPLICATION_DEADLINE' as const, dueAt: '2026-10-01', description: 'Apply', sourceUrl: 'https://example.edu/funding', fundingCycle: '2027', lastCheckedAt: '2026-09-01', lastVerifiedAt: '2026-09-01', confidenceStatus: 'VERIFIED_OFFICIAL' as const }
const changedDeadline = reconcileFundingDeadline(originalDeadline, { ...originalDeadline, dueAt: '2026-10-15', lastCheckedAt: '2026-09-09' })
assert.equal(changedDeadline.changed, true)
assert.equal(changedDeadline.deadline.previousValues?.[0]?.dueAt, '2026-10-01')

const needsIncome = opportunity({ financialNeedRequirements: ['Household income evidence'], otherEligibility: ['Must hold an offer'] })
assert.ok(createFundingApplication(needsIncome).documents.some((item) => item.type === 'INCOME_DOCUMENTATION'))
assert.ok(createFundingApplication(needsIncome).documents.some((item) => item.type === 'OFFER_LETTER'))
assert.equal(createManualFundingApplication({ name: 'Local award', provider: 'School', applicationUrl: 'https://school.example/apply' }).applicationUrlOverride, 'https://school.example/apply')
assert.equal(createManualFundingApplication({ name: 'Unsafe award', provider: 'School', applicationUrl: 'javascript:alert(1)' }).applicationUrlOverride, undefined)

assert.equal(FUNDING_OPPORTUNITIES.find((item) => item.id === 'za-funza-lushaka-2026')?.cycleStatus, 'CLOSED', 'Historical cycles must remain explicitly closed')
assert.equal(FUNDING_OPPORTUNITIES.find((item) => item.id === 'utoronto-pearson-2027')?.applicationDeadline, '2026-11-06', 'Current official funding deadlines should remain exact')
assert.deepEqual(FUNDING_OPPORTUNITIES.find((item) => item.id === 'ubc-okanagan-commerce-launch-2027')?.eligibleProgrammes, ['ubc-bachelor-of-commerce'], 'Programme funding should remain programme-scoped')
assert.equal(FUNDING_OPPORTUNITIES.find((item) => item.id === 'au-fee-help')?.domesticInternationalRules.includes('INTERNATIONAL'), false, 'Australian government loans must not be shown as internationally applicable')
assert.equal(FUNDING_OPPORTUNITIES.find((item) => item.id === 'us-pell-grant-2026-27')?.fundingAmountMax, 7395, 'Published grant maxima should be captured without extrapolation')

for (const [query, expectedId] of [
  ['NSFAS', 'za-nsfas'],
  ['HECS', 'au-hecs-help'],
  ['engineering bursary', 'za-isfap-current'],
  ['international scholarship', 'utoronto-pearson-2027'],
  ['Monash scholarship', 'monash-scholarship-portfolio-current'],
  ['UCT funding', 'za-allan-gray-fellowship-2026'],
  ['medicine scholarship', 'za-isfap-current'],
  ['finance bursary', 'za-thuthuka-bursary-current'],
  ['current student scholarship', 'wits-undergraduate-funding']
] as const) {
  assert.ok(searchFundingOpportunities(FUNDING_OPPORTUNITIES, query).some((item) => item.id === expectedId), `${query} should find ${expectedId}`)
}

assert.ok(FUNDING_OPPORTUNITIES.every((item) => item.officialUrl.startsWith('https://') && item.applicationUrl.startsWith('https://')), 'Every funding opportunity should retain exact HTTPS destinations')
assert.ok(FUNDING_OPPORTUNITIES.filter((item) => item.applicationDeadline).every((item) => item.fundingCycle && item.lastVerifiedAt), 'Dated funding must retain its cycle and verification date')

console.log('Funding domain tests passed')