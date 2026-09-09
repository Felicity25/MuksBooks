import { getCountryCatalogue } from './catalog.ts'
import type { AdmissionsDeadline, CurriculumResultsEvent, FreshUniversitySource } from './types'

export const UNIVERSITY_DATA_CHECKED_AT = '2026-09-09T02:35:00Z'
const UCAS_SOURCE = 'https://www.ucas.com/applying/applying-to-university/dates-and-deadlines-for-uni-applications'
const IB_RESULTS_SOURCE = 'https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/getting-results/'

const ukInstitutions = getCountryCatalogue('GB')?.institutions ?? []

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
  { id: 'ib-results', kind: 'RESULT_RELEASE_DATES', url: IB_RESULTS_SOURCE, sourceType: 'official-curriculum', refreshCadence: 'WEEKLY', lastCheckedAt: UNIVERSITY_DATA_CHECKED_AT, lastSuccessfulAt: UNIVERSITY_DATA_CHECKED_AT, confidenceStatus: 'NEEDS_REVIEW' }
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
