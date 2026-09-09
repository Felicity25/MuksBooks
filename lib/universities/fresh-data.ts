import { getCountryCatalogue } from './catalog.ts'
import { ADMISSIONS_POLICIES, ADMISSIONS_TEST_FEES, ADMISSIONS_TEST_SESSIONS } from './admissions-data.ts'
import { PRIORITY_INSTITUTION_SOURCE_PROFILES } from './source-registry.ts'
import { REVIEWED_APPLICATION_ROUTES } from './application-routes.ts'
import type { AdmissionsDeadline, CurriculumResultsEvent, FreshUniversitySource } from './types'

export const UNIVERSITY_DATA_CHECKED_AT = '2026-09-09T02:35:00Z'
const UCAS_SOURCE = 'https://www.ucas.com/applying/applying-to-university/dates-and-deadlines-for-uni-applications'
const IB_RESULTS_SOURCE = 'https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/getting-results/'

const ukInstitutions = getCountryCatalogue('GB')?.institutions ?? []

const readinessSources: FreshUniversitySource[] = [
  ...ADMISSIONS_POLICIES.map((policy) => ({
    id: `${policy.id}-requirements`,
    kind: policy.english ? 'ENGLISH_REQUIREMENTS' as const : 'TEST_REQUIREMENTS' as const,
    institutionId: policy.institutionId,
    url: policy.source.url,
    sourceType: policy.source.sourceType,
    admissionsCycle: policy.admissionsCycle,
    refreshCadence: 'WEEKLY' as const,
    lastCheckedAt: policy.source.lastVerifiedAt,
    lastSuccessfulAt: policy.source.lastVerifiedAt,
    confidenceStatus: policy.confidenceStatus
  })),
  ...ADMISSIONS_TEST_SESSIONS.map((session) => ({
    id: `${session.id}-dates`, kind: 'TEST_DATES' as const, url: session.source.url, sourceType: 'official-test-provider' as const,
    admissionsCycle: session.source.admissionsCycle, refreshCadence: 'DAILY' as const, lastCheckedAt: session.source.lastVerifiedAt,
    lastSuccessfulAt: session.source.lastVerifiedAt, confidenceStatus: 'VERIFIED_OFFICIAL' as const
  })),
  ...ADMISSIONS_TEST_FEES.map((fee) => ({
    id: `${fee.id}-fee`, kind: 'TEST_FEES' as const, url: fee.source.url, sourceType: 'official-test-provider' as const,
    admissionsCycle: fee.source.admissionsCycle, refreshCadence: 'WEEKLY' as const, lastCheckedAt: fee.source.lastVerifiedAt,
    lastSuccessfulAt: fee.source.lastVerifiedAt, confidenceStatus: 'VERIFIED_OFFICIAL' as const
  })),
  { id: 'gamsat-booking', kind: 'TEST_BOOKING', url: 'https://gamsat.acer.org/registration', sourceType: 'official-test-provider', admissionsCycle: '2027', refreshCadence: 'WEEKLY', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastSuccessfulAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL' },
  { id: 'mit-interview-2027', kind: 'INTERVIEW_REQUIREMENTS', institutionId: 'mit', countryCode: 'US', url: 'https://mitadmissions.org/apply/firstyear/interview/', sourceType: 'official-admissions', admissionsCycle: '2026-2027', refreshCadence: 'WEEKLY', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastSuccessfulAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL' },
  { id: 'mit-portfolio-2027', kind: 'PORTFOLIO_REQUIREMENTS', institutionId: 'mit', countryCode: 'US', url: 'https://mitadmissions.org/apply/firstyear/portfolios-additional-material/', sourceType: 'official-admissions', admissionsCycle: '2026-2027', refreshCadence: 'WEEKLY', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastSuccessfulAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL' },
  { id: 'toefl-booking', kind: 'TEST_BOOKING', url: 'https://www.ets.org/toefl/test-takers/ibt/schedule.html', sourceType: 'official-test-provider', refreshCadence: 'MONTHLY', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastSuccessfulAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL' },
  { id: 'pte-booking', kind: 'TEST_BOOKING', url: 'https://www.pearsonpte.com/book-now', sourceType: 'official-test-provider', refreshCadence: 'MONTHLY', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastSuccessfulAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL' }
]

const institutionSources: FreshUniversitySource[] = PRIORITY_INSTITUTION_SOURCE_PROFILES.flatMap((profile) => [
  profile.prospectusUrl ? {
    id: `${profile.institutionId}-prospectus`, kind: 'PROSPECTUS' as const, institutionId: profile.institutionId, countryCode: profile.countryCode,
    url: profile.prospectusUrl, sourceType: 'official-prospectus' as const, sourceAcademicYear: profile.prospectusAcademicYear,
    refreshCadence: 'QUARTERLY' as const, lastCheckedAt: profile.lastProspectusCheckAt, lastSuccessfulAt: profile.lastProspectusCheckAt,
    contentFingerprint: profile.prospectusFingerprint, confidenceStatus: 'NEEDS_REVIEW' as const
  } : undefined,
  profile.programmeFinderUrl ? {
    id: `${profile.institutionId}-programmes`, kind: 'PROGRAMMES' as const, institutionId: profile.institutionId, countryCode: profile.countryCode,
    url: profile.programmeFinderUrl, sourceType: 'official-course-finder' as const, refreshCadence: 'MONTHLY' as const,
    lastCheckedAt: profile.lastWebsiteRefreshAt, lastSuccessfulAt: profile.lastWebsiteRefreshAt, confidenceStatus: 'NEEDS_REVIEW' as const
  } : undefined,
  profile.undergraduateAdmissionsUrl ? {
    id: `${profile.institutionId}-undergraduate-admissions`, kind: 'ADMISSIONS_REQUIREMENTS' as const, institutionId: profile.institutionId, countryCode: profile.countryCode,
    url: profile.undergraduateAdmissionsUrl, sourceType: 'official-admissions' as const, refreshCadence: 'WEEKLY' as const,
    lastCheckedAt: profile.lastWebsiteRefreshAt, lastSuccessfulAt: profile.lastWebsiteRefreshAt, confidenceStatus: 'NEEDS_REVIEW' as const
  } : undefined,
  profile.internationalAdmissionsUrl ? {
    id: `${profile.institutionId}-international-admissions`, kind: 'ADMISSIONS_REQUIREMENTS' as const, institutionId: profile.institutionId, countryCode: profile.countryCode,
    url: profile.internationalAdmissionsUrl, sourceType: 'official-admissions' as const, refreshCadence: 'WEEKLY' as const,
    lastCheckedAt: profile.lastWebsiteRefreshAt, lastSuccessfulAt: profile.lastWebsiteRefreshAt, confidenceStatus: 'NEEDS_REVIEW' as const
  } : undefined,
  profile.applicationPortalUrl ? {
    id: `${profile.institutionId}-application-route`, kind: 'APPLICATION_ROUTES' as const, institutionId: profile.institutionId, countryCode: profile.countryCode,
    url: profile.applicationPortalUrl, sourceType: 'official-application-portal' as const, refreshCadence: 'DAILY' as const,
    lastCheckedAt: profile.lastWebsiteRefreshAt, lastSuccessfulAt: profile.lastWebsiteRefreshAt, confidenceStatus: 'NEEDS_REVIEW' as const
  } : undefined
].filter(Boolean) as FreshUniversitySource[])

const reviewedRouteSources: FreshUniversitySource[] = REVIEWED_APPLICATION_ROUTES.map((route) => ({
  id: `${route.id}-route`, kind: 'APPLICATION_ROUTES', countryCode: route.countryCode, url: route.sourceUrl,
  sourceType: 'official-application-portal', refreshCadence: 'DAILY', lastCheckedAt: route.lastVerifiedAt,
  lastSuccessfulAt: route.lastVerifiedAt, confidenceStatus: 'VERIFIED_OFFICIAL'
}))

export const OFFICIAL_UNIVERSITY_SOURCES: FreshUniversitySource[] = [
  ...institutionSources,
  ...reviewedRouteSources,
  { id: 'ucas-2027-deadlines', kind: 'APPLICATION_DEADLINES', countryCode: 'GB', url: UCAS_SOURCE, sourceType: 'official-application-portal', admissionsCycle: '2027', refreshCadence: 'WEEKLY', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastSuccessfulAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL' },
  { id: 'ib-results', kind: 'RESULT_RELEASE_DATES', url: IB_RESULTS_SOURCE, sourceType: 'official-curriculum', refreshCadence: 'WEEKLY', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastSuccessfulAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'NEEDS_REVIEW' },
  ...readinessSources.filter((source, index, sources) => sources.findIndex((candidate) => candidate.id === source.id) === index)
]

const ucasDeadlines: AdmissionsDeadline[] = ukInstitutions.flatMap((institution) => {
  const common = {
    institutionId: institution.id,
    intakeYear: 2027,
    applicantRoute: 'SCHOOL_LEAVER' as const,
    timezone: 'Europe/London',
    sourceUrl: UCAS_SOURCE,
    sourceType: 'official-application-portal' as const,
    admissionsCycle: '2027',
    lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT,
    lastVerifiedAt: UNIVERSITY_DATA_CHECKED_AT,
    confidenceStatus: 'VERIFIED_OFFICIAL' as const
  }
  return [
    { ...common, id: `${institution.id}-ucas-opens-2027`, deadlineType: 'APPLICATION_OPENS' as const, dueAt: '2026-05-12T00:00:00+01:00', description: 'UCAS applications open for 2027 entry.' },
    { ...common, id: `${institution.id}-ucas-submit-2027`, deadlineType: 'APPLICATION_OPENS' as const, dueAt: '2026-09-01T00:00:00+01:00', description: 'Completed applications can be submitted to UCAS.' },
    { ...common, id: `${institution.id}-ucas-equal-2027`, deadlineType: 'APPLICATION_DEADLINE' as const, dueAt: ['oxford', 'cambridge'].includes(institution.id) ? '2026-10-15T18:00:00+01:00' : '2027-01-13T18:00:00+00:00', description: ['oxford', 'cambridge'].includes(institution.id) ? 'UCAS equal-consideration deadline for Oxford and Cambridge. Most medicine, dentistry and veterinary courses also use this date.' : 'UCAS equal-consideration deadline for most undergraduate courses. Course-specific exceptions may apply.' },
    { ...common, id: `${institution.id}-ucas-final-2027`, deadlineType: 'APPLICATION_DEADLINE' as const, dueAt: '2027-09-23T18:00:00+01:00', description: 'Final UCAS date for 2027 entry applications; earlier course deadlines still apply.' }
  ]
})

const VTAC_SOURCE = 'https://vtac.edu.au/dates'
const vtacInstitutions = ['unimelb', 'monash', 'rmit', 'deakin', 'latrobe', 'swinburne']
const vtacDeadlines: AdmissionsDeadline[] = vtacInstitutions.flatMap((institutionId) => [
  { id: `${institutionId}-vtac-opens-2027`, institutionId, intakeYear: 2027, applicantType: 'DOMESTIC', applicantRoute: 'SCHOOL_LEAVER', deadlineType: 'APPLICATION_OPENS', dueAt: '2026-08-03T09:00:00+10:00', timezone: 'Australia/Melbourne', description: 'VTAC applications open for courses commencing in 2027.', sourceUrl: VTAC_SOURCE, sourceType: 'official-application-portal', admissionsCycle: '2027', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastVerifiedAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL' },
  { id: `${institutionId}-vtac-timely-2027`, institutionId, intakeYear: 2027, applicantType: 'DOMESTIC', applicantRoute: 'SCHOOL_LEAVER', deadlineType: 'APPLICATION_DEADLINE', dueAt: '2026-09-28T17:00:00+10:00', timezone: 'Australia/Melbourne', description: 'VTAC timely course applications close.', sourceUrl: VTAC_SOURCE, sourceType: 'official-application-portal', admissionsCycle: '2027', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastVerifiedAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL' },
  { id: `${institutionId}-vtac-late-2027`, institutionId, intakeYear: 2027, applicantType: 'DOMESTIC', applicantRoute: 'SCHOOL_LEAVER', deadlineType: 'APPLICATION_DEADLINE', dueAt: '2026-10-30T17:00:00+11:00', timezone: 'Australia/Melbourne', description: 'VTAC late course applications close. A late fee may apply.', sourceUrl: VTAC_SOURCE, sourceType: 'official-application-portal', admissionsCycle: '2027', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastVerifiedAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL' },
  { id: `${institutionId}-vtac-very-late-2027`, institutionId, intakeYear: 2027, applicantType: 'DOMESTIC', applicantRoute: 'SCHOOL_LEAVER', deadlineType: 'APPLICATION_DEADLINE', dueAt: '2026-12-04T17:00:00+11:00', timezone: 'Australia/Melbourne', description: 'VTAC very late course applications close. Course availability and additional fees can apply.', sourceUrl: VTAC_SOURCE, sourceType: 'official-application-portal', admissionsCycle: '2027', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastVerifiedAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL' }
])

const usDeadline = (id: string, institutionId: string, deadlineType: AdmissionsDeadline['deadlineType'], dueAt: string, description: string, sourceUrl: string, timezone: string): AdmissionsDeadline => ({
  id, institutionId, intakeYear: 2027, applicantRoute: 'SCHOOL_LEAVER', deadlineType, dueAt, timezone, description, sourceUrl,
  sourceType: 'official-admissions', admissionsCycle: '2026-2027', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT,
  lastVerifiedAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL'
})

const usDeadlines: AdmissionsDeadline[] = [
  usDeadline('mit-ea-2027', 'mit', 'EARLY_APPLICATION', '2026-11-01', 'MIT Early Action application deadline.', 'https://mitadmissions.org/apply/firstyear/deadlines-requirements/', 'America/New_York'),
  usDeadline('mit-ra-2027', 'mit', 'APPLICATION_DEADLINE', '2027-01-04', 'MIT Regular Action application deadline.', 'https://mitadmissions.org/apply/firstyear/deadlines-requirements/', 'America/New_York'),
  usDeadline('harvard-rea-2027', 'harvard', 'EARLY_APPLICATION', '2026-11-01', 'Harvard Restrictive Early Action application deadline.', 'https://college.harvard.edu/admissions/apply/first-year-applicants', 'America/New_York'),
  usDeadline('harvard-rd-2027', 'harvard', 'APPLICATION_DEADLINE', '2027-01-01', 'Harvard Regular Decision application deadline.', 'https://college.harvard.edu/admissions/apply/first-year-applicants', 'America/New_York'),
  usDeadline('berkeley-filing-opens-2027', 'berkeley', 'APPLICATION_OPENS', '2026-10-01', 'UC application filing period opens for Berkeley.', 'https://admissions.berkeley.edu/apply-to-berkeley/dates-deadlines/', 'America/Los_Angeles'),
  usDeadline('berkeley-deadline-2027', 'berkeley', 'APPLICATION_DEADLINE', '2026-11-30', 'UC Berkeley first-year application deadline. Berkeley does not offer early admission or early decision.', 'https://admissions.berkeley.edu/apply-to-berkeley/dates-deadlines/', 'America/Los_Angeles'),
  usDeadline('umich-ea-ed-2027', 'umich', 'EARLY_APPLICATION', '2026-11-01', 'University of Michigan Early Decision and Early Action deadline.', 'https://admissions.umich.edu/apply/first-year-applicants/requirements-deadlines', 'America/Detroit'),
  usDeadline('umich-rd-2027', 'umich', 'APPLICATION_DEADLINE', '2027-02-01', 'University of Michigan Regular Decision deadline for fall entry.', 'https://admissions.umich.edu/apply/first-year-applicants/requirements-deadlines', 'America/Detroit')
]

export const ADMISSIONS_DEADLINES: AdmissionsDeadline[] = [...ucasDeadlines, ...vtacDeadlines, ...usDeadlines]

export const CURRICULUM_RESULTS_EVENTS: CurriculumResultsEvent[] = []
