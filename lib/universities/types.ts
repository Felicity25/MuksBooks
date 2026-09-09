import type { LearnerCurriculumId } from '@/lib/learner/store'

export type CountryCode = 'ZA' | 'AU' | 'GB' | 'US' | 'CA' | 'SG' | 'MY' | 'ID' | 'TH' | 'VN' | 'PH'
export type InstitutionType = 'University' | 'University of Technology' | 'College' | 'Institute' | 'Polytechnic' | 'Conservatory' | 'Other Higher Education Institution'
export type CatalogueStatus = 'building' | 'partial' | 'substantial' | 'verified'
export type SourceType = 'official-programme' | 'official-course-finder' | 'official-prospectus' | 'official-admissions' | 'official-institution' | 'official-application-portal' | 'official-curriculum' | 'official-test-provider' | 'government-register'
export type ConfidenceStatus = 'VERIFIED_OFFICIAL' | 'AUTO_EXTRACTED_OFFICIAL' | 'NEEDS_REVIEW' | 'STALE' | 'CONFLICTING' | 'UNKNOWN'
export type CoverageLevel = 'none' | 'building' | 'partial' | 'substantial' | 'near-complete'
export type ApplicantType = 'DOMESTIC' | 'INTERNATIONAL' | 'UNCERTAIN'
export type DataOrigin = 'OFFICIAL_VERIFIED' | 'OFFICIAL_AUTO_EXTRACTED' | 'USER_ENTERED'
export type MatchState = 'STRONG_MATCH' | 'POTENTIAL_MATCH' | 'REACH' | 'PREREQUISITE_GAP' | 'ENGLISH_CHECK' | 'MISSING_INFORMATION' | 'REQUIREMENTS_NOT_STRUCTURED'
export type EnglishTest = 'IELTS' | 'TOEFL' | 'PTE' | 'CAMBRIDGE'
export type AdmissionsTestId = 'SAT' | 'ACT' | 'NBT_AQL' | 'NBT_MAT' | 'UCAT' | 'UCAT_ANZ' | 'GAMSAT' | 'LNAT' | 'TMUA' | 'ESAT' | 'ISAT'
export type AdmissionsTestRequirementStatus = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' | 'TEST_OPTIONAL' | 'POSSIBLE_EXEMPTION' | 'NOT_REQUIRED' | 'UNKNOWN'
export type AdmissionsRequirementState = 'SATISFIED_APPEARS' | 'LIKELY_SATISFIED' | 'ACTION_NEEDED' | 'ACTION_REQUIRED' | 'TEST_REQUIRED' | 'TEST_RECOMMENDED' | 'POSSIBLE_EXEMPTION' | 'MISSING_INFORMATION' | 'OPTIONAL' | 'NOT_REQUIRED' | 'NOT_APPLICABLE' | 'NEEDS_VERIFICATION' | 'CONFLICTING_INFORMATION' | 'UNKNOWN'
export type AdmissionsReadinessState = 'READY_APPEARS' | 'ACTION_NEEDED' | 'MISSING_INFORMATION' | 'UNKNOWN'
export type AdmissionsRequirementCategory = 'ACADEMIC' | 'ENGLISH' | 'PREREQUISITE' | 'ADMISSIONS_TEST' | 'INTERVIEW' | 'PORTFOLIO' | 'DOCUMENT' | 'OTHER'

export interface OfficialAdmissionsSource {
  url: string
  sourceType: SourceType
  title: string
  lastVerifiedAt: string
  admissionsCycle?: string
}

export interface EnglishSubjectExemptionRule {
  curriculum: LearnerCurriculumId
  subjectNames: string[]
  levels?: string[]
  minimumNumericGrade?: number
  acceptedLetterGrades?: string[]
  source: OfficialAdmissionsSource
}

export interface EnglishInstructionRule {
  language: string
  minimumYears: number
  eligibleCountries?: string[]
  recognizedSchoolRequired?: boolean
  source: OfficialAdmissionsSource
}

export interface EnglishScoreRule {
  test: EnglishTest
  minimumOverall: number
  minimumComponents?: Record<string, number>
  validOnOrAfter?: string
  validOnOrBefore?: string
  scoreScale?: string
  source: OfficialAdmissionsSource
}

export interface StructuredEnglishRequirement {
  id: string
  label: string
  exemptions: EnglishSubjectExemptionRule[]
  languageOfInstructionRules?: EnglishInstructionRule[]
  acceptedTests: EnglishScoreRule[]
  source: OfficialAdmissionsSource
}

export interface AdmissionsTestRequirement {
  id: string
  label: string
  acceptedTests: AdmissionsTestId[]
  requiredness: AdmissionsTestRequirementStatus
  applicantRoutes?: ApplicantRoute[]
  notes?: string
  source: OfficialAdmissionsSource
}

export interface AdditionalAdmissionsRequirement {
  id: string
  category: Exclude<AdmissionsRequirementCategory, 'ACADEMIC' | 'ENGLISH' | 'PREREQUISITE' | 'ADMISSIONS_TEST'>
  label: string
  requiredness: 'REQUIRED' | 'OPTIONAL' | 'CONDITIONAL'
  applicantRoutes?: ApplicantRoute[]
  notes?: string
  action?: string
  source: OfficialAdmissionsSource
}

export interface AdmissionsPolicy {
  id: string
  institutionId: string
  programmeIds?: string[]
  intakeYears: number[]
  admissionsCycle: string
  applicantRoutes?: ApplicantRoute[]
  applicantTypes?: ApplicantType[]
  english?: StructuredEnglishRequirement
  admissionsTests?: AdmissionsTestRequirement[]
  additionalRequirements?: AdditionalAdmissionsRequirement[]
  source: OfficialAdmissionsSource
  confidenceStatus: Extract<ConfidenceStatus, 'VERIFIED_OFFICIAL' | 'STALE' | 'CONFLICTING'>
  coverageLevel: 'PARTIAL' | 'COMPLETE'
  changeHistory?: FreshDataChange[]
}

export interface AdmissionsReadinessCheck {
  id: string
  category: AdmissionsRequirementCategory
  label: string
  state: AdmissionsRequirementState
  explanation: string
  actions: string[]
  source?: OfficialAdmissionsSource
  evidence?: string[]
}

export interface AdmissionsReadinessResult {
  state: AdmissionsReadinessState
  institutionId: string
  programmeId: string
  intakeYear: number
  admissionsCycle?: string
  checks: AdmissionsReadinessCheck[]
  nextActions: string[]
  coverage: ConfidenceStatus
  coverageByCategory: {
    academic: 'VERIFIED' | 'NOT_INDEXED'
    english: 'VERIFIED' | 'NOT_INDEXED'
    testRequirement: 'VERIFIED' | 'NOT_INDEXED'
    testDate: 'VERIFIED' | 'NOT_INDEXED'
    admissionsReadiness: 'VERIFIED' | 'PARTIAL' | 'NOT_INDEXED'
  }
}

export interface AdmissionsTestFee {
  id: string
  test: AdmissionsTestId
  amount: number
  currency: string
  regionLabel: string
  countryCodes?: CountryCode[]
  validFrom: string
  validUntil: string
  source: OfficialAdmissionsSource
  changeHistory?: FreshDataChange[]
}

export interface AdmissionsTestSession {
  id: string
  test: AdmissionsTestId
  label: string
  countryCodes?: CountryCode[]
  region?: string
  registrationOpensAt?: string
  bookingOpensAt?: string
  registrationDeadline: string
  lateRegistrationDeadline?: string
  testStartsAt: string
  testEndsAt: string
  scoreReleaseAt?: string
  deliveryModes?: Array<'TEST_CENTRE' | 'ONLINE' | 'HOME'>
  status: 'UPCOMING' | 'BOOKING_OPEN' | 'BOOKING_CLOSED' | 'COMPLETED'
  bookingUrl: string
  source: OfficialAdmissionsSource
  changeHistory?: FreshDataChange[]
}

export interface FreshDataChange {
  detectedAt: string
  previousValue: string
  currentValue: string
  sourceUrl: string
}

export interface AdmissionsTestDefinition {
  id: AdmissionsTestId | EnglishTest
  name: string
  provider: string
  officialUrl: string
  bookingUrl: string
  bookingNote?: string
  summary?: string
  components?: string[]
  preparationUrl?: string
  supportedCountries?: CountryCode[]
  testType: 'ENGLISH_LANGUAGE' | 'UNDERGRADUATE_ADMISSIONS' | 'MEDICAL_ADMISSIONS' | 'LAW_ADMISSIONS' | 'QUANTITATIVE_ADMISSIONS' | 'OTHER'
  scoreScale?: string
  sourceUrl: string
  lastCheckedAt: string
  lastVerifiedAt?: string
  scoreValidityMonths?: number
}

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

export interface Faculty {
  id: string
  institutionId: string
  name: string
  aliases?: string[]
  officialUrl: string
  sourceUrl: string
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
  prospectusAcademicYear?: string
  facultyUrls?: Array<{ id: string; name: string; url: string }>
  applicationPortalUrl?: string
  lastProspectusCheckAt?: string
  lastWebsiteRefreshAt?: string
  prospectusFingerprint?: string
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
  faculties?: Faculty[]
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
  facultyId?: string
  department?: string
  majors?: string[]
  specialisations?: string[]
  streams?: string[]
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
  programmeAdmissionsUrl?: string
  domesticApplicationUrl?: string
  internationalApplicationUrl?: string
  centralApplicationUrl?: string
  facultyUrl?: string
  requirementsUrl?: string
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
  sourceTestId?: AdmissionsTestId
  sourceRequirementId?: string
  sourceTestSessionId?: string
  sourceTestMilestone?: 'REGISTRATION_DEADLINE' | 'TEST_DATE' | 'SCORE_SUBMISSION_DEADLINE'
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
  customInstitutionName?: string
  customProgrammeName?: string
  customCountry?: string
  dataOrigin?: DataOrigin
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
  userDeadline?: string
  userDeadlineNote?: string
  deadlineIds: string[]
  documents: ApplicationDocument[]
  tasks: ApplicationTask[]
  offers: UniversityOffer[]
  timeline: Array<{ id: string; type: string; occurredAt: string; description: string }>
  createdAt: string
  updatedAt: string
}

export interface ResolvedApplicationRoute {
  method: string
  url?: string
  ctaLabel: string
  source: DataOrigin
  explanation: string
}

export type FreshUniversityDataKind = 'PROSPECTUS' | 'PROGRAMMES' | 'APPLICATION_ROUTES' | 'APPLICATION_DEADLINES' | 'RESULT_RELEASE_DATES' | 'ADMISSIONS_REQUIREMENTS' | 'ENGLISH_REQUIREMENTS' | 'TEST_REQUIREMENTS' | 'TEST_DATES' | 'TEST_FEES' | 'TEST_BOOKING' | 'INTERVIEW_REQUIREMENTS' | 'PORTFOLIO_REQUIREMENTS' | 'ENGLISH_REQUIREMENT' | 'ENGLISH_EXEMPTION' | 'ADMISSIONS_TEST_REQUIREMENT' | 'TEST_MINIMUM_SCORE' | 'TEST_REGISTRATION_DATE' | 'TEST_DATE' | 'TEST_WINDOW' | 'TEST_FEE' | 'TEST_BOOKING_URL' | 'TEST_SCORE_SUBMISSION_DEADLINE' | 'INTERVIEW_REQUIREMENT' | 'PORTFOLIO_REQUIREMENT' | 'SCHOLARSHIPS' | 'SCHOLARSHIP_DEADLINES' | 'FEES'

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
  contentFingerprint?: string
  confidenceStatus: ConfidenceStatus
}
