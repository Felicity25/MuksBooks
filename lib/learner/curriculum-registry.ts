import type { LearnerCurriculumId } from './store'

export type SupportedCurriculumId = 'IEB' | 'NSC' | 'A_LEVEL' | 'IGCSE' | 'VCE'
export type CurriculumHierarchyKind = 'grade-subject-topic' | 'stage-syllabus-topic' | 'units-area-of-study'
export type CanonicalSubjectArea = 'Mathematics' | 'English' | 'Science' | 'Humanities' | 'Commerce' | 'Technology' | 'Languages' | 'Arts' | 'Health'

export interface CurriculumSource {
  authority: string
  url: string
  title: string
  version?: string
  applicableYears?: string[]
  lastChecked: string
  lastUpdated?: string
}

export interface CurriculumLevel {
  id: string
  label: string
  shortLabel: string
}

export interface CurriculumTopic {
  id: string
  title: string
  subtopics?: string[]
  sourceUrl?: string
}

export interface CurriculumSubject {
  id: string
  title: string
  canonicalArea: CanonicalSubjectArea
  syllabusCode?: string
  availableLevels?: string[]
  topics: CurriculumTopic[]
  sourceUrl?: string
}

export interface CurriculumDefinition {
  id: SupportedCurriculumId
  name: string
  shortName: string
  countryRegion: string
  authority: string
  activeVersion: string
  hierarchyKind: CurriculumHierarchyKind
  terminology: {
    level: string
    subject: string
    topic: string
    subtopic: string
    syllabus: string
    assessment: string
    examination: string
  }
  levels: CurriculumLevel[]
  subjects: CurriculumSubject[]
  assessmentTypes: string[]
  gradingSummary: string
  sources: CurriculumSource[]
}

const checked = '2026-09-10'
const capsUrl = 'https://www.education.gov.za/Curriculum/CurriculumAssessmentPolicyStatements(CAPS).aspx'
const iebUrl = 'https://www.ieb.co.za/assessment/high-schools'
const igcseUrl = 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/'
const aLevelUrl = 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/'
const vceUrl = 'https://www.vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/vce-study-designs'

const southAfricanSubjects: CurriculumSubject[] = [
  { id: 'mathematics', title: 'Mathematics', canonicalArea: 'Mathematics', topics: [], sourceUrl: capsUrl },
  { id: 'mathematical-literacy', title: 'Mathematical Literacy', canonicalArea: 'Mathematics', topics: [], sourceUrl: capsUrl },
  { id: 'english-home-language', title: 'English Home Language', canonicalArea: 'English', topics: [], sourceUrl: capsUrl },
  { id: 'physical-sciences', title: 'Physical Sciences', canonicalArea: 'Science', topics: [], sourceUrl: capsUrl },
  { id: 'life-sciences', title: 'Life Sciences', canonicalArea: 'Science', topics: [], sourceUrl: capsUrl },
  { id: 'accounting', title: 'Accounting', canonicalArea: 'Commerce', topics: [], sourceUrl: capsUrl },
  { id: 'business-studies', title: 'Business Studies', canonicalArea: 'Commerce', topics: [], sourceUrl: capsUrl },
  { id: 'economics', title: 'Economics', canonicalArea: 'Commerce', topics: [], sourceUrl: capsUrl },
  { id: 'geography', title: 'Geography', canonicalArea: 'Humanities', topics: [], sourceUrl: capsUrl },
  { id: 'history', title: 'History', canonicalArea: 'Humanities', topics: [], sourceUrl: capsUrl }
]

const cambridgeCoreSubjects: CurriculumSubject[] = [
  { id: 'mathematics', title: 'Mathematics', canonicalArea: 'Mathematics', topics: [], sourceUrl: igcseUrl },
  { id: 'additional-mathematics', title: 'Additional Mathematics', canonicalArea: 'Mathematics', topics: [], sourceUrl: igcseUrl },
  { id: 'english-first-language', title: 'English - First Language', canonicalArea: 'English', topics: [], sourceUrl: igcseUrl },
  { id: 'biology', title: 'Biology', canonicalArea: 'Science', topics: [], sourceUrl: igcseUrl },
  { id: 'chemistry', title: 'Chemistry', canonicalArea: 'Science', topics: [], sourceUrl: igcseUrl },
  { id: 'physics', title: 'Physics', canonicalArea: 'Science', topics: [], sourceUrl: igcseUrl },
  { id: 'economics', title: 'Economics', canonicalArea: 'Commerce', topics: [], sourceUrl: igcseUrl },
  { id: 'computer-science', title: 'Computer Science', canonicalArea: 'Technology', topics: [], sourceUrl: igcseUrl }
]

const registry: Record<SupportedCurriculumId, CurriculumDefinition> = {
  IEB: {
    id: 'IEB', name: 'IEB National Senior Certificate', shortName: 'IEB', countryRegion: 'South Africa', authority: 'Independent Examinations Board / Umalusi', activeVersion: 'Current IEB NSC', hierarchyKind: 'grade-subject-topic',
    terminology: { level: 'Grade', subject: 'Subject', topic: 'Curriculum topic', subtopic: 'Subtopic', syllabus: 'Subject Assessment Guidelines', assessment: 'School-based assessment', examination: 'IEB NSC examination' },
    levels: ['Grade 10', 'Grade 11', 'Grade 12'].map((label) => ({ id: label.toLowerCase().replace(' ', '-'), label, shortLabel: label.replace('Grade ', 'G') })),
    subjects: southAfricanSubjects.map((subject) => ({ ...subject, sourceUrl: iebUrl })), assessmentTypes: ['School-based assessment', 'Practical assessment', 'Oral assessment', 'Final examination'], gradingSummary: 'Results and promotion follow the accredited National Senior Certificate framework.',
    sources: [{ authority: 'Independent Examinations Board', url: iebUrl, title: 'IEB High Schools and NSC assessment', version: 'Current', applicableYears: ['Grades 10-12'], lastChecked: checked }]
  },
  NSC: {
    id: 'NSC', name: 'South African NSC / CAPS', shortName: 'NSC / CAPS', countryRegion: 'South Africa', authority: 'Department of Basic Education', activeVersion: 'NCS Grades R-12 with current CAPS amendments', hierarchyKind: 'grade-subject-topic',
    terminology: { level: 'Grade', subject: 'Subject', topic: 'CAPS topic', subtopic: 'Subtopic', syllabus: 'CAPS statement', assessment: 'School-based assessment', examination: 'NSC examination' },
    levels: ['Grade 10', 'Grade 11', 'Grade 12'].map((label) => ({ id: label.toLowerCase().replace(' ', '-'), label, shortLabel: label.replace('Grade ', 'G') })),
    subjects: southAfricanSubjects, assessmentTypes: ['School-based assessment', 'Practical assessment task', 'Oral assessment', 'NSC examination'], gradingSummary: 'CAPS and the National Protocol for Assessment govern recording, reporting and promotion.',
    sources: [{ authority: 'South African Department of Basic Education', url: capsUrl, title: 'Curriculum and Assessment Policy Statements', version: 'NCS Grades R-12 and published amendments', applicableYears: ['Grades R-12'], lastChecked: checked }]
  },
  IGCSE: {
    id: 'IGCSE', name: 'Cambridge IGCSE', shortName: 'IGCSE', countryRegion: 'International', authority: 'Cambridge International Education', activeVersion: 'Current published syllabuses', hierarchyKind: 'stage-syllabus-topic',
    terminology: { level: 'Stage', subject: 'Subject', topic: 'Syllabus topic', subtopic: 'Subtopic', syllabus: 'Syllabus', assessment: 'Assessment component', examination: 'Cambridge examination' },
    levels: [{ id: 'year-1', label: 'IGCSE Year 1', shortLabel: 'Year 1' }, { id: 'year-2', label: 'IGCSE Year 2', shortLabel: 'Year 2' }],
    subjects: cambridgeCoreSubjects, assessmentTypes: ['Written assessment', 'Oral assessment', 'Coursework', 'Practical assessment'], gradingSummary: 'Assessment is syllabus-specific and occurs at the end of the course; available grading routes vary by syllabus.',
    sources: [{ authority: 'Cambridge International Education', url: igcseUrl, title: 'Cambridge IGCSE curriculum and qualification', version: 'Current published syllabuses', applicableYears: ['Typically ages 14-16'], lastChecked: checked }]
  },
  A_LEVEL: {
    id: 'A_LEVEL', name: 'Cambridge International AS & A Level', shortName: 'AS / A Level', countryRegion: 'International', authority: 'Cambridge International Education', activeVersion: 'Current published syllabuses', hierarchyKind: 'stage-syllabus-topic',
    terminology: { level: 'Qualification stage', subject: 'Subject', topic: 'Syllabus topic', subtopic: 'Subtopic', syllabus: 'Syllabus', assessment: 'Assessment component', examination: 'Cambridge examination' },
    levels: [{ id: 'as-level', label: 'AS Level', shortLabel: 'AS' }, { id: 'a-level', label: 'A Level', shortLabel: 'A Level' }],
    subjects: cambridgeCoreSubjects.map((subject) => ({ ...subject, sourceUrl: aLevelUrl })), assessmentTypes: ['Written component', 'Practical component', 'Coursework component'], gradingSummary: 'Assessment routes and components are syllabus-specific; some subjects can progress from AS Level to A Level.',
    sources: [{ authority: 'Cambridge International Education', url: aLevelUrl, title: 'Cambridge International AS & A Levels', version: 'Current published syllabuses', applicableYears: ['AS Level', 'A Level'], lastChecked: checked }]
  },
  VCE: {
    id: 'VCE', name: 'Victorian Certificate of Education', shortName: 'VCE', countryRegion: 'Victoria, Australia', authority: 'Victorian Curriculum and Assessment Authority', activeVersion: '2026 study design list', hierarchyKind: 'units-area-of-study',
    terminology: { level: 'Unit sequence', subject: 'Study', topic: 'Area of Study', subtopic: 'Outcome / key knowledge', syllabus: 'Study design', assessment: 'School-based assessment', examination: 'External examination' },
    levels: [{ id: 'units-1-2', label: 'Units 1 & 2', shortLabel: 'Units 1 & 2' }, { id: 'units-3-4', label: 'Units 3 & 4', shortLabel: 'Units 3 & 4' }],
    subjects: [
      { id: 'mathematical-methods', title: 'Mathematical Methods', canonicalArea: 'Mathematics', topics: [], sourceUrl: vceUrl },
      { id: 'general-mathematics', title: 'General Mathematics', canonicalArea: 'Mathematics', topics: [], sourceUrl: vceUrl },
      { id: 'specialist-mathematics', title: 'Specialist Mathematics', canonicalArea: 'Mathematics', topics: [], sourceUrl: vceUrl },
      { id: 'english', title: 'English', canonicalArea: 'English', topics: [], sourceUrl: vceUrl },
      { id: 'biology', title: 'Biology', canonicalArea: 'Science', topics: [], sourceUrl: vceUrl },
      { id: 'chemistry', title: 'Chemistry', canonicalArea: 'Science', topics: [], sourceUrl: vceUrl },
      { id: 'physics', title: 'Physics', canonicalArea: 'Science', topics: [], sourceUrl: vceUrl },
      { id: 'psychology', title: 'Psychology', canonicalArea: 'Science', topics: [], sourceUrl: vceUrl },
      { id: 'economics', title: 'Economics', canonicalArea: 'Commerce', topics: [], sourceUrl: vceUrl },
      { id: 'business-management', title: 'Business Management', canonicalArea: 'Commerce', topics: [], sourceUrl: vceUrl }
    ], assessmentTypes: ['School-assessed coursework', 'School-assessed task', 'External examination', 'General Achievement Test'], gradingSummary: 'Assessment arrangements are study-specific and may combine school-based assessment with external examinations.',
    sources: [{ authority: 'Victorian Curriculum and Assessment Authority', url: vceUrl, title: 'VCE Study Designs', version: '2026 study design list', applicableYears: ['Units 1-4'], lastChecked: checked }]
  }
}

export const SUPPORTED_CURRICULA = Object.values(registry)
export const DEFAULT_CURRICULUM_ID: SupportedCurriculumId = 'VCE'

export function isSupportedCurriculumId(value: unknown): value is SupportedCurriculumId {
  return typeof value === 'string' && value in registry
}

export function getCurriculum(id: LearnerCurriculumId | string | undefined): CurriculumDefinition {
  return isSupportedCurriculumId(id) ? registry[id] : registry[DEFAULT_CURRICULUM_ID]
}

export function getCurriculumSubject(curriculumId: string, subjectIdOrTitle: string): CurriculumSubject | undefined {
  const normalized = subjectIdOrTitle.trim().toLowerCase()
  return getCurriculum(curriculumId).subjects.find((subject) => subject.id === normalized || subject.title.toLowerCase() === normalized)
}

export function resolveViewingCurriculum(savedCurriculum: LearnerCurriculumId, viewingCurriculum: 'MY' | SupportedCurriculumId): SupportedCurriculumId {
  return viewingCurriculum === 'MY' && isSupportedCurriculumId(savedCurriculum) ? savedCurriculum : viewingCurriculum === 'MY' ? DEFAULT_CURRICULUM_ID : viewingCurriculum
}

export function curriculumPath(curriculumId: string, levelId?: string, subjectId?: string, topicId?: string) {
  return ['/resources', curriculumId.toLowerCase(), levelId, subjectId, topicId].filter(Boolean).join('/')
}

export function createLearnerCurriculumContext(input: {
  curriculumId: LearnerCurriculumId
  level: string
  subject?: CurriculumSubject
  topic?: CurriculumTopic
}) {
  const curriculum = getCurriculum(input.curriculumId)
  return {
    learnerMode: 'school' as const,
    curriculum: curriculum.id,
    curriculumName: curriculum.name,
    curriculumVersion: curriculum.activeVersion,
    level: input.level,
    subject: input.subject?.title || '',
    subjectCode: input.subject?.syllabusCode || input.subject?.id || '',
    canonicalSubjectArea: input.subject?.canonicalArea || '',
    topic: input.topic?.title || '',
    authority: curriculum.authority
  }
}
