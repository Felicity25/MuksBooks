import type { LearnerCurriculumId } from '@/lib/learner/store'

export type CountryCode = 'ZA' | 'AU' | 'GB' | 'US' | 'CA' | 'SG' | 'MY' | 'ID' | 'TH' | 'VN' | 'PH'
export type InstitutionType = 'University' | 'University of Technology' | 'College' | 'Institute' | 'Polytechnic' | 'Conservatory' | 'Other Higher Education Institution'
export type CatalogueStatus = 'building' | 'partial' | 'substantial' | 'verified'
export type SourceType = 'official-programme' | 'official-admissions' | 'official-institution' | 'government-register'
export type ApplicantType = 'DOMESTIC' | 'INTERNATIONAL' | 'UNCERTAIN'
export type MatchState = 'STRONG_MATCH' | 'POTENTIAL_MATCH' | 'REACH' | 'PREREQUISITE_GAP' | 'ENGLISH_CHECK' | 'MISSING_INFORMATION' | 'REQUIREMENTS_NOT_STRUCTURED'
export type EnglishTest = 'IELTS' | 'TOEFL' | 'PTE' | 'CAMBRIDGE'

export interface AcademicRequirement {
  curriculum: LearnerCurriculumId
  minimumOverall?: number
  indicativeOverall?: number
  requiredSubjects?: Array<{ name: string; level?: string; minimumGrade?: string }>
  admissionsCycle?: string
  notes?: string
  officialRequirementsUrl: string
  sourceType: SourceType
  lastVerifiedAt: string
}

export interface EnglishRequirement {
  test: EnglishTest
  overall?: number
  minimumComponents?: number
  notes?: string
  officialRequirementsUrl: string
  sourceType: SourceType
  lastVerifiedAt: string
}

export interface Institution {
  id: string
  name: string
  aliases: string[]
  institutionType: InstitutionType
  country: string
  code: CountryCode
  region: string
  city: string
  officialWebsite: string
  admissionsUrl?: string
  internationalAdmissionsUrl?: string
  publicPrivate?: 'public' | 'private' | 'mixed'
  campusLocations?: string[]
  studyAreas: string[]
  shortSummary?: string
  sourceUrl: string
  sourceType?: SourceType
  lastVerifiedAt: string
}

export interface Programme {
  id: string
  institutionId: string
  name: string
  normalizedName: string
  aliases?: string[]
  qualification?: string
  degreeType: string
  qualificationLevel: string
  faculty: string
  department?: string
  studyAreas: string[]
  industryAreas?: string[]
  tags: string[]
  country?: string
  region?: string
  campus?: string
  deliveryMode?: string
  duration?: string
  officialProgrammeUrl: string
  admissionsUrl?: string
  curriculumRequirements: string[]
  requirements?: AcademicRequirement[]
  englishRequirements?: EnglishRequirement[]
  standardisedTests?: string[]
  prerequisiteSubjects: string[]
  entryRequirements: string[]
  applicationMetadata?: string
  applicationInformation?: string
  admissionsCycle?: string
  sourceUrl: string
  sourceType?: SourceType
  lastVerifiedAt: string
}

export interface CountryCatalogue {
  code: CountryCode
  name: string
  region: string
  status: CatalogueStatus
  institutions: Institution[]
  programmes: Programme[]
}

export interface SearchFilters {
  country?: string
  region?: string
  institutionType?: string
  studyArea?: string
  qualification?: string
}

export interface SearchResult {
  institution: Institution
  programme: Programme
  country: string
  region: string
  score: number
}

export interface ApplicantContext {
  citizenships: string[]
  residenceCountry?: string
  schoolCountry?: string
  targetCountry?: string
  likelyApplicantType: ApplicantType
  explanation: string
}

export interface MatchExplanation {
  state: MatchState
  title: string
  reasons: string[]
  checks: string[]
}

export type ApplicationStatus = 'Interested' | 'Researching' | 'Preparing' | 'Applied' | 'Offer' | 'Accepted' | 'Rejected' | 'Withdrawn'

export interface UniversityApplication {
  id: string
  programmeId: string
  institutionId: string
  status: ApplicationStatus
  notes: string
  deadline?: string
  tasks: string[]
  createdAt: string
  updatedAt: string
}
