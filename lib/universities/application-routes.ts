import type { ApplicantType, CountryCode } from './types'

export interface ReviewedInstitutionApplicationRoute {
  id: string
  institutionIds: string[]
  countryCode: CountryCode
  applicantTypes: ApplicantType[]
  method: string
  url: string
  ctaLabel: string
  explanation: string
  sourceUrl: string
  lastVerifiedAt: string
}

const VERIFIED_AT = '2026-09-09T00:00:00Z'

export const REVIEWED_APPLICATION_ROUTES: ReviewedInstitutionApplicationRoute[] = [
  {
    id: 'ucas-undergraduate',
    institutionIds: ['oxford', 'cambridge', 'lse', 'imperial', 'ucl', 'edinburgh', 'cardiff', 'queens-belfast', 'manchester', 'warwick', 'bristol', 'glasgow', 'st-andrews', 'swansea', 'ulster', 'birmingham', 'leeds', 'sheffield', 'nottingham', 'southampton', 'exeter', 'york-uk', 'liverpool', 'newcastle-uk', 'durham', 'bath', 'lancaster', 'aberdeen', 'dundee', 'strathclyde'],
    countryCode: 'GB', applicantTypes: ['DOMESTIC', 'INTERNATIONAL', 'UNCERTAIN'], method: 'UCAS', url: 'https://accounts.ucas.com/account/login', ctaLabel: 'Apply via UCAS',
    explanation: 'Undergraduate applications use UCAS; course-specific exceptions and earlier deadlines can apply.', sourceUrl: 'https://www.ucas.com/applying/applying-to-university', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'vtac-undergraduate', institutionIds: ['unimelb', 'monash', 'rmit', 'deakin', 'latrobe', 'swinburne'], countryCode: 'AU', applicantTypes: ['DOMESTIC'], method: 'VTAC', url: 'https://vtac.edu.au/courses/profile', ctaLabel: 'Apply via VTAC',
    explanation: 'Domestic undergraduate applications for these Victorian institutions use VTAC. International routes can differ.', sourceUrl: 'https://vtac.edu.au/', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'uac-undergraduate', institutionIds: ['unsw', 'usyd', 'uts', 'anu', 'macquarie', 'newcastle-au', 'wollongong', 'western-sydney'], countryCode: 'AU', applicantTypes: ['DOMESTIC'], method: 'UAC', url: 'https://uac.edu.au/', ctaLabel: 'Apply via UAC',
    explanation: 'Domestic undergraduate applications for these NSW/ACT institutions use UAC. International routes can differ.', sourceUrl: 'https://uac.edu.au/', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'qtac-undergraduate', institutionIds: ['uq', 'qut', 'griffith', 'jcu'], countryCode: 'AU', applicantTypes: ['DOMESTIC'], method: 'QTAC', url: 'https://applications.qtac.edu.au/sign-in', ctaLabel: 'Apply via QTAC',
    explanation: 'Domestic undergraduate applications for these Queensland institutions use QTAC. Fixed course closing dates can apply.', sourceUrl: 'https://www.qtac.edu.au/', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'satac-undergraduate', institutionIds: ['adelaide', 'charles-darwin', 'flinders'], countryCode: 'AU', applicantTypes: ['DOMESTIC'], method: 'SATAC', url: 'https://www.satac.edu.au/how-to-apply', ctaLabel: 'Apply via SATAC',
    explanation: 'SATAC processes undergraduate applications for these participating South Australian and Northern Territory institutions.', sourceUrl: 'https://www.satac.edu.au/', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'ouac-undergraduate', institutionIds: ['utoronto', 'waterloo', 'mcmaster', 'queens-ca', 'western-ca', 'uottawa', 'york-ca'], countryCode: 'CA', applicantTypes: ['DOMESTIC', 'INTERNATIONAL', 'UNCERTAIN'], method: 'OUAC', url: 'https://www.ouac.on.ca/apply/dashboard/en_CA/user/login', ctaLabel: 'Apply via OUAC',
    explanation: 'OUAC is the centralized undergraduate application service for Ontario universities.', sourceUrl: 'https://www.ouac.on.ca/', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'uc-undergraduate', institutionIds: ['berkeley', 'ucla', 'ucsd'], countryCode: 'US', applicantTypes: ['DOMESTIC', 'INTERNATIONAL', 'UNCERTAIN'], method: 'UC application', url: 'https://apply.universityofcalifornia.edu/', ctaLabel: 'Open UC application',
    explanation: 'University of California campuses use one undergraduate application.', sourceUrl: 'https://apply.universityofcalifornia.edu/', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'common-app-reviewed', institutionIds: ['stanford', 'harvard', 'umich'], countryCode: 'US', applicantTypes: ['DOMESTIC', 'INTERNATIONAL', 'UNCERTAIN'], method: 'Common App', url: 'https://apply.commonapp.org/createaccount', ctaLabel: 'Open Common App',
    explanation: 'This institution accepts first-year applications through Common App.', sourceUrl: 'https://www.commonapp.org/', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'mit-direct', institutionIds: ['mit'], countryCode: 'US', applicantTypes: ['DOMESTIC', 'INTERNATIONAL', 'UNCERTAIN'], method: 'MIT application', url: 'https://apply.mitadmissions.org/portal/apply', ctaLabel: 'Open MIT application',
    explanation: 'MIT uses its own first-year application portal.', sourceUrl: 'https://mitadmissions.org/apply/firstyear/', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'uct-direct', institutionIds: ['uct'], countryCode: 'ZA', applicantTypes: ['DOMESTIC', 'INTERNATIONAL', 'UNCERTAIN'], method: 'Direct to UCT', url: 'https://publicaccess.uct.ac.za/psc/public/?cmd=login&languageCd=ENG', ctaLabel: 'Open UCT application',
    explanation: 'UCT provides its own online application service.', sourceUrl: 'https://uct.ac.za/students/applications/apply-uct', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'ul-direct', institutionIds: ['ul'], countryCode: 'ZA', applicantTypes: ['DOMESTIC', 'INTERNATIONAL', 'UNCERTAIN'], method: 'Direct to UL', url: 'https://ulc-prod-webserver.ul.ac.za/pls/prodi41/gen.gw1pkg.gw1view', ctaLabel: 'Open UL application',
    explanation: 'The University of Limpopo undergraduate admissions page links to its own online application service.', sourceUrl: 'https://www.ul.ac.za/admissions/undergraduate-studies/', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'tut-direct', institutionIds: ['tut'], countryCode: 'ZA', applicantTypes: ['DOMESTIC', 'INTERNATIONAL', 'UNCERTAIN'], method: 'Direct to TUT', url: 'https://applications-prod.tut.ac.za/', ctaLabel: 'Open TUT application',
    explanation: 'TUT provides its own online application service.', sourceUrl: 'https://www.tut.ac.za/apply', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'wsu-direct', institutionIds: ['wsu'], countryCode: 'ZA', applicantTypes: ['DOMESTIC', 'INTERNATIONAL', 'UNCERTAIN'], method: 'Direct to WSU', url: 'https://applications.wsu.ac.za/', ctaLabel: 'Open WSU application',
    explanation: 'WSU provides its own online application service.', sourceUrl: 'https://www.wsu.ac.za/index.php/study-with-us/application-guide', lastVerifiedAt: VERIFIED_AT
  },
  {
    id: 'ump-direct', institutionIds: ['ump'], countryCode: 'ZA', applicantTypes: ['DOMESTIC', 'INTERNATIONAL', 'UNCERTAIN'], method: 'Direct to UMP', url: 'https://www.ump.ac.za/Study-with-us/Application-Process/Online-Applications.aspx', ctaLabel: 'Open UMP application',
    explanation: 'UMP provides its online application from the official application process page.', sourceUrl: 'https://www.ump.ac.za/Study-with-us/Application-Process', lastVerifiedAt: VERIFIED_AT
  }
]

export function getReviewedApplicationRoute(institutionId: string, applicantType: ApplicantType) {
  return REVIEWED_APPLICATION_ROUTES.find((route) => route.institutionIds.includes(institutionId) && route.applicantTypes.includes(applicantType))
}

export function reviewedApplicationRouteCount() {
  return new Set(REVIEWED_APPLICATION_ROUTES.flatMap((route) => route.institutionIds)).size
}
