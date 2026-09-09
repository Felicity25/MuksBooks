import type { LearnerCurriculumId } from '@/lib/learner/store'

export type CountryCode = 'ZA' | 'AU' | 'GB' | 'US' | 'CA' | 'SG' | 'MY' | 'ID' | 'TH' | 'VN' | 'PH'
export type InstitutionType = 'University' | 'University of Technology' | 'College' | 'Institute' | 'Polytechnic' | 'Conservatory' | 'Other Higher Education Institution'
export type CatalogueStatus = 'building' | 'partial' | 'substantial' | 'verified'
export type SourceType = 'official-programme' | 'official-course-finder' | 'official-prospectus' | 'official-admissions' | 'official-institution' | 'official-application-portal' | 'official-curriculum' | 'government-register'
export type ConfidenceStatus = 'VERIFIED_OFFICIAL' | 'AUTO_EXTRACTED_OFFICIAL' | 'NEEDS_REVIEW' | 'STALE' | 'CONFLICTING' | 'UNKNOWN'
export type CoverageLevel = 'none' | 'building' | 'partial' | 'substantial' | 'near-complete'
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
  undergraduateAdmissionsUrl?: string
  internationalAdmissionsUrl?: string
  programmeFinderUrl?: string
  prospectusUrl?: string
  applicationUrl?: string
  publicPrivate?: 'public' | 'private' | 'mixed'
  campusLocations?: string[]
  studyAreas: string[]
  shortSummary?: string
  sourceUrl: string
  sourceType?: SourceType
  sourceAcademicYear?: string
  admissionsCycle?: string
  lastCheckedAt?: string
  lastVerifiedAt: string
  programmeCoverageStatus?: CoverageLevel
  admissionsCoverageStatus?: CoverageLevel
  lastIndexedAt?: string
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
  intakeYears?: number[]
  intakeTerms?: string[]
  officialProgrammeUrl: string
  admissionsUrl?: string
  applicationUrl?: string
  curriculumRequirements: string[]
  requirements?: AcademicRequirement[]
  englishRequirements?: EnglishRequirement[]
  standardisedTests?: string[]
  prerequisiteSubjects: string[]
  entryRequirements: string[]
  applicationMetadata?: string
  applicationInformation?: string
  fees?: Array<{ amount: number; currency: string; basis: string; applicantType?: ApplicantType }>
  active?: boolean
  previousNames?: string[]
  sourceAcademicYear?: string
  admissionsCycle?: string
  sourceUrl: string
  sourceType?: SourceType
  confidenceStatus?: ConfidenceStatus
  lastCheckedAt?: string
  lastVerifiedAt: string
}

export interface CoverageSummary {
  institutionCoverage: CoverageLevel
  programmeCoverage: CoverageLevel
  admissionsCoverage: CoverageLevel
  sourceFreshness: CoverageLevel
  overall: CoverageLevel
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

export type ApplicantRoute = 'SCHOOL_LEAVER' | 'GAP_YEAR' | 'COLLEGE_TO_UNIVERSITY' | 'DIPLOMA_TO_DEGREE' | 'UNIVERSITY_TRANSFER' | 'CURRENT_UNIVERSITY_NEW_UNDERGRAD' | 'FOUNDATION_PATHWAY' | 'OTHER'
export type ApplicationStatus = 'INTERESTED' | 'RESEARCHING' | 'PREPARING' | 'READY_TO_APPLY' | 'APPLICATION_OPEN' | 'APPLIED' | 'DOCUMENTS_PENDING' | 'AWAITING_DECISION' | 'INTERVIEW_OR_ASSESSMENT' | 'CONDITIONAL_OFFER' | 'UNCONDITIONAL_OFFER' | 'WAITLISTED' | 'REJECTED' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'
export type DeadlineType = 'APPLICATION_OPENS' | 'APPLICATION_DEADLINE' | 'EARLY_APPLICATION' | 'PRIORITY_DEADLINE' | 'DOCUMENT_DEADLINE' | 'TRANSCRIPT_DEADLINE' | 'PREDICTED_GRADES_DEADLINE' | 'TEST_SCORE_DEADLINE' | 'PORTFOLIO_DEADLINE' | 'INTERVIEW_DATE' | 'RESULTS_SUBMISSION_DEADLINE' | 'OFFER_RESPONSE_DEADLINE' | 'DEPOSIT_DEADLINE' | 'ENROLMENT_DEADLINE' | 'SCHOLARSHIP_APPLICATION_DEADLINE' | 'SCHOLARSHIP_DOCUMENT_DEADLINE' | 'SCHOLARSHIP_RESULT_DATE' | 'TEST_REGISTRATION_DEADLINE' | 'TEST_DATE'
export type ApplicationDocumentType = 'TRANSCRIPT' | 'SCHOOL_REPORT' | 'PREDICTED_GRADES' | 'FINAL_RESULTS' | 'PERSONAL_STATEMENT' | 'MOTIVATION_LETTER' | 'CV' | 'REFERENCE' | 'RECOMMENDATION' | 'PASSPORT' | 'ID' | 'ENGLISH_TEST' | 'ADMISSION_TEST' | 'PORTFOLIO' | 'INTERVIEW' | 'QUALIFICATION_CERTIFICATE' | 'TERTIARY_TRANSCRIPT' | 'COURSE_OUTLINES' | 'TRANSFER_DOCUMENTATION' | 'OTHER'
export type OfferType = 'CONDITIONAL' | 'UNCONDITIONAL' | 'WAITLIST' | 'PATHWAY' | 'DEFERRED_ENTRY' | 'OTHER'
export type OfferStatus = 'RECEIVED' | 'REVIEWING' | 'AWAITING_RESULTS' | 'RESPONDED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN'
export type OfferConditionType = 'OVERALL_SCORE' | 'SUBJECT_SCORE' | 'FINAL_TRANSCRIPT' | 'ENGLISH_TEST' | 'ADMISSION_TEST' | 'PORTFOLIO' | 'QUALIFICATION_COMPLETION' | 'DEPOSIT' | 'OTHER'
export type GradeKind = 'CURRENT' | 'PREDICTED' | 'FINAL' | 'TARGET'

export interface AdmissionsDeadline {
  id: string
  institutionId: string
  programmeId?: string
  intakeYear: number
  intakeTerm?: string
  applicantType?: ApplicantType
  applicantRoute?: ApplicantRoute
  deadlineType: DeadlineType
  opensAt?: string
  dueAt: string
  timezone?: string
  description: string
  sourceUrl: string
  sourceType: SourceType
  admissionsCycle: string
  lastCheckedAt: string
  lastVerifiedAt?: string
  confidenceStatus: ConfidenceStatus
  previousValues?: Array<{ dueAt: string; detectedAt: string; sourceUrl: string }>
}

export interface CurriculumResultsEvent {
  id: string
  curriculum: LearnerCurriculumId | 'A_LEVEL' | 'VCE' | 'HSC' | 'QCE' | 'NSC' | 'IEB' | 'AP'
  examSession: string
  examYear: number
  eventType: 'RESULTS_RELEASE' | 'REMARK_DEADLINE' | 'CERTIFICATE_RELEASE'
  dateTime: string
  timezone: string
  sourceUrl: string
  sourceType: SourceType
  lastCheckedAt: string
  lastVerifiedAt?: string
  confidenceStatus: ConfidenceStatus
}

export interface ApplicationDocument {
  id: string
  type: ApplicationDocumentType
  label: string
  required: boolean
  status: 'NOT_STARTED' | 'REQUESTED' | 'READY' | 'UPLOADED' | 'SUBMITTED' | 'NOT_REQUIRED'
  uploadId?: string
  notes?: string
}

export interface ApplicationTask {
  id: string
  title: string
  dueAt?: string
  completed: boolean
  plannerTaskId?: string
  sourceDeadlineId?: string
  createdAt: string
  updatedAt: string
}

export interface OfferCondition {
  id: string
  type: OfferConditionType
  description: string
  curriculum?: string
  subject?: string
  minimumValue?: number
  minimumGrade?: string
  gradeKindRequired?: Exclude<GradeKind, 'TARGET'>
}

export interface UniversityOffer {
  id: string
  applicationId: string
  offerType: OfferType
  receivedAt: string
  responseDeadline?: string
  conditions: OfferCondition[]
  depositAmount?: number
  depositCurrency?: string
  depositDeadline?: string
  offerDocumentUploadId?: string
  status: OfferStatus
  notes: string
}

export interface UniversityApplication {
  id: string
  userId?: string
  programmeId: string
  institutionId: string
  intakeYear: number
  intakeTerm?: string
  applicantRoute: ApplicantRoute
  applicantContext?: ApplicantContext
  status: ApplicationStatus
  applicationMethod?: string
  applicationPortalUrl?: string
  applicationReference?: string
  resultsContext?: {
    curriculum: CurriculumResultsEvent['curriculum']
    examSession: string
    examYear: number
  }
  startedAt?: string
  submittedAt?: string
  notes: string
  deadline?: string
  deadlineIds: string[]
  documents: ApplicationDocument[]
  tasks: ApplicationTask[]
  offers: UniversityOffer[]
  timeline: Array<{ id: string; type: string; occurredAt: string; description: string }>
  createdAt: string
  updatedAt: string
}

export type FreshUniversityDataKind = 'PROGRAMMES' | 'APPLICATION_DEADLINES' | 'RESULT_RELEASE_DATES' | 'ADMISSIONS_REQUIREMENTS' | 'TEST_REQUIREMENTS' | 'TEST_DATES' | 'SCHOLARSHIPS' | 'SCHOLARSHIP_DEADLINES' | 'FEES'

export interface FreshUniversitySource {
  id: string
  kind: FreshUniversityDataKind
  institutionId?: string
  countryCode?: CountryCode
  url: string
  sourceType: SourceType
  sourceAcademicYear?: string
  admissionsCycle?: string
  refreshCadence: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
  lastCheckedAt?: string
  lastSuccessfulAt?: string
  confidenceStatus: ConfidenceStatus
}
