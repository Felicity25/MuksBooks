import { getCountryCatalogue } from './catalog.ts'
import { ADMISSIONS_POLICIES, ADMISSIONS_TEST_FEES, ADMISSIONS_TEST_SESSIONS } from './admissions-data.ts'
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

export const OFFICIAL_UNIVERSITY_SOURCES: FreshUniversitySource[] = [
  ...(['ZA', 'AU', 'GB', 'CA', 'US'] as const).flatMap((code) => (getCountryCatalogue(code)?.institutions ?? []).map((institution) => ({
    id: `${institution.id}-programmes`, kind: 'PROGRAMMES' as const, institutionId: institution.id, countryCode: code,
    url: institution.programmeFinderUrl || institution.admissionsUrl || institution.officialWebsite,
    sourceType: institution.programmeFinderUrl ? 'official-course-finder' as const : 'official-institution' as const,
    sourceAcademicYear: '2027', admissionsCycle: '2027', refreshCadence: 'MONTHLY' as const,
    lastCheckedAt: institution.lastCheckedAt, lastSuccessfulAt: institution.lastCheckedAt,
    confidenceStatus: institution.programmeFinderUrl ? 'AUTO_EXTRACTED_OFFICIAL' as const : 'NEEDS_REVIEW' as const
  }))),
  { id: 'ucas-2027-deadlines', kind: 'APPLICATION_DEADLINES', countryCode: 'GB', url: UCAS_SOURCE, sourceType: 'official-application-portal', admissionsCycle: '2027', refreshCadence: 'WEEKLY', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastSuccessfulAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'VERIFIED_OFFICIAL' },
  { id: 'ib-results', kind: 'RESULT_RELEASE_DATES', url: IB_RESULTS_SOURCE, sourceType: 'official-curriculum', refreshCadence: 'WEEKLY', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastSuccessfulAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'NEEDS_REVIEW' },
  ...readinessSources.filter((source, index, sources) => sources.findIndex((candidate) => candidate.id === source.id) === index)
]

export const ADMISSIONS_DEADLINES: AdmissionsDeadline[] = ukInstitutions.flatMap((institution) => {
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

export const CURRICULUM_RESULTS_EVENTS: CurriculumResultsEvent[] = []
