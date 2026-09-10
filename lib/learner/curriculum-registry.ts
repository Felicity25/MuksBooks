import type { LearnerCurriculumId } from './store'

export type SupportedCurriculumId = 'IEB' | 'NSC' | 'A_LEVEL' | 'IGCSE' | 'VCE' | 'IB_MYP' | 'IB'
export type CurriculumHierarchyKind = 'grade-subject-topic' | 'stage-syllabus-topic' | 'units-area-of-study' | 'programme-subject-topic'
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
const ibMypUrl = 'https://www.ibo.org/programmes/middle-years-programme/curriculum/'
const ibDpUrl = 'https://www.ibo.org/programmes/diploma-programme/curriculum/'

const topic = (id: string, title: string, subtopics: string[] = []): CurriculumTopic => ({ id, title, subtopics })
const mathsTopics = [topic('algebra', 'Algebra', ['Equations', 'Sequences']), topic('functions', 'Functions', ['Graphs', 'Transformations']), topic('geometry-trigonometry', 'Geometry and trigonometry'), topic('statistics-probability', 'Statistics and probability'), topic('calculus', 'Calculus', ['Differentiation', 'Integration'])]
const languageTopics = [topic('reading', 'Reading and interpretation'), topic('writing', 'Writing and composition'), topic('oral', 'Speaking and listening')]
const economicsTopics = [topic('microeconomics', 'Microeconomics'), topic('macroeconomics', 'Macroeconomics'), topic('global-economy', 'The global economy')]
const topicsFor = (subjectId: string, area: CanonicalSubjectArea): CurriculumTopic[] => {
  if (area === 'Mathematics') return subjectId === 'mathematical-literacy' ? [topic('finance', 'Finance'), topic('measurement', 'Measurement'), topic('data-handling', 'Data handling'), topic('probability', 'Probability')] : mathsTopics
  if (area === 'English' || area === 'Languages') return languageTopics
  if (subjectId === 'economics') return economicsTopics
  if (area === 'Science') return [topic('scientific-practice', 'Scientific practice'), topic('matter', 'Matter and materials'), topic('energy', 'Energy and change'), topic('systems', 'Systems and interactions')]
  if (area === 'Commerce') return [topic('foundations', 'Foundations'), topic('operations', 'Operations'), topic('finance', 'Finance'), topic('strategy', 'Strategy and evaluation')]
  if (area === 'Technology') return [topic('systems', 'Computer systems'), topic('data', 'Data representation'), topic('algorithms-programming', 'Algorithms and programming')]
  return [topic('evidence-inquiry', 'Evidence and inquiry'), topic('change-continuity', 'Change and continuity'), topic('analysis-evaluation', 'Analysis and evaluation')]
}
const withTopics = (subjects: CurriculumSubject[]) => subjects.map((item) => ({ ...item, topics: item.topics.length ? item.topics : topicsFor(item.id, item.canonicalArea) }))

const southAfricanSubjects: CurriculumSubject[] = withTopics([
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
])

const cambridgeSubject = (programme: 'igcse' | 'a-level', id: string, title: string, canonicalArea: CanonicalSubjectArea, syllabusCode: string, slug: string): CurriculumSubject => ({ id, title, canonicalArea, syllabusCode, topics: topicsFor(id, canonicalArea), sourceUrl: `https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-${programme === 'igcse' ? 'igcse' : 'international-as-and-a-level'}-${slug}-${syllabusCode}/` })
const cambridgeIgcseSubjects = [
  cambridgeSubject('igcse', 'mathematics', 'Mathematics', 'Mathematics', '0580', 'mathematics'), cambridgeSubject('igcse', 'additional-mathematics', 'Additional Mathematics', 'Mathematics', '0606', 'additional-mathematics'), cambridgeSubject('igcse', 'english-first-language', 'First Language English', 'English', '0500', 'first-language-english'), cambridgeSubject('igcse', 'biology', 'Biology', 'Science', '0610', 'biology'), cambridgeSubject('igcse', 'chemistry', 'Chemistry', 'Science', '0620', 'chemistry'), cambridgeSubject('igcse', 'physics', 'Physics', 'Science', '0625', 'physics'), cambridgeSubject('igcse', 'economics', 'Economics', 'Commerce', '0455', 'economics'), cambridgeSubject('igcse', 'computer-science', 'Computer Science', 'Technology', '0478', 'computer-science')
]
const cambridgeALevelSubjects = [
  cambridgeSubject('a-level', 'mathematics', 'Mathematics', 'Mathematics', '9709', 'mathematics'), cambridgeSubject('a-level', 'english-language', 'English Language', 'English', '9093', 'english-language'), cambridgeSubject('a-level', 'biology', 'Biology', 'Science', '9700', 'biology'), cambridgeSubject('a-level', 'chemistry', 'Chemistry', 'Science', '9701', 'chemistry'), cambridgeSubject('a-level', 'physics', 'Physics', 'Science', '9702', 'physics'), cambridgeSubject('a-level', 'economics', 'Economics', 'Commerce', '9708', 'economics'), cambridgeSubject('a-level', 'computer-science', 'Computer Science', 'Technology', '9618', 'computer-science'), cambridgeSubject('a-level', 'psychology', 'Psychology', 'Science', '9990', 'psychology')
]
const ibMypSubjects: CurriculumSubject[] = withTopics([
  { id: 'language-literature', title: 'Language and literature', canonicalArea: 'English', topics: [], sourceUrl: ibMypUrl }, { id: 'language-acquisition', title: 'Language acquisition', canonicalArea: 'Languages', topics: [], sourceUrl: ibMypUrl }, { id: 'individuals-societies', title: 'Individuals and societies', canonicalArea: 'Humanities', topics: [], sourceUrl: ibMypUrl }, { id: 'sciences', title: 'Sciences', canonicalArea: 'Science', topics: [], sourceUrl: ibMypUrl }, { id: 'mathematics', title: 'Mathematics', canonicalArea: 'Mathematics', topics: mathsTopics.filter((item) => item.id !== 'calculus'), sourceUrl: ibMypUrl }, { id: 'arts', title: 'Arts', canonicalArea: 'Arts', topics: [topic('creating', 'Creating'), topic('presenting', 'Presenting'), topic('responding', 'Responding')], sourceUrl: ibMypUrl }, { id: 'physical-health-education', title: 'Physical and health education', canonicalArea: 'Health', topics: [topic('physical-fitness', 'Physical fitness'), topic('movement', 'Movement'), topic('health-wellbeing', 'Health and wellbeing')], sourceUrl: ibMypUrl }, { id: 'design', title: 'Design', canonicalArea: 'Technology', topics: [topic('inquiry-analysis', 'Inquiring and analysing'), topic('developing-ideas', 'Developing ideas'), topic('creating-solution', 'Creating the solution'), topic('evaluating', 'Evaluating')], sourceUrl: ibMypUrl }
])
const ibDpSubjects: CurriculumSubject[] = withTopics([
  { id: 'mathematics-analysis-approaches', title: 'Mathematics: analysis and approaches', canonicalArea: 'Mathematics', availableLevels: ['sl', 'hl'], topics: mathsTopics, sourceUrl: `${ibDpUrl}mathematics/` }, { id: 'mathematics-applications-interpretation', title: 'Mathematics: applications and interpretation', canonicalArea: 'Mathematics', availableLevels: ['sl', 'hl'], topics: mathsTopics, sourceUrl: `${ibDpUrl}mathematics/` }, { id: 'english-a-language-literature', title: 'Language A: language and literature', canonicalArea: 'English', availableLevels: ['sl', 'hl'], topics: languageTopics, sourceUrl: `${ibDpUrl}language-and-literature/` }, { id: 'biology', title: 'Biology', canonicalArea: 'Science', availableLevels: ['sl', 'hl'], topics: [topic('unity-diversity', 'Unity and diversity'), topic('form-function', 'Form and function'), topic('interaction-interdependence', 'Interaction and interdependence'), topic('continuity-change', 'Continuity and change')], sourceUrl: `${ibDpUrl}science/` }, { id: 'chemistry', title: 'Chemistry', canonicalArea: 'Science', availableLevels: ['sl', 'hl'], topics: [topic('structure', 'Structure'), topic('reactivity', 'Reactivity'), topic('practical-work', 'Practical work and inquiry')], sourceUrl: `${ibDpUrl}science/` }, { id: 'physics', title: 'Physics', canonicalArea: 'Science', availableLevels: ['sl', 'hl'], topics: [topic('space-time-motion', 'Space, time and motion'), topic('particulate-matter', 'The particulate nature of matter'), topic('wave-behaviour', 'Wave behaviour'), topic('fields', 'Fields'), topic('nuclear-quantum', 'Nuclear and quantum physics')], sourceUrl: `${ibDpUrl}science/` }, { id: 'economics', title: 'Economics', canonicalArea: 'Commerce', availableLevels: ['sl', 'hl'], topics: economicsTopics, sourceUrl: `${ibDpUrl}individuals-and-societies/` }, { id: 'history', title: 'History', canonicalArea: 'Humanities', availableLevels: ['sl', 'hl'], topics: [], sourceUrl: `${ibDpUrl}individuals-and-societies/` }, { id: 'computer-science', title: 'Computer science', canonicalArea: 'Technology', availableLevels: ['sl', 'hl'], topics: [], sourceUrl: `${ibDpUrl}science/` }
])

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
    subjects: cambridgeIgcseSubjects, assessmentTypes: ['Written assessment', 'Oral assessment', 'Coursework', 'Practical assessment'], gradingSummary: 'Assessment is syllabus-specific and occurs at the end of the course; available grading routes vary by syllabus.',
    sources: [{ authority: 'Cambridge International Education', url: igcseUrl, title: 'Cambridge IGCSE curriculum and qualification', version: 'Current published syllabuses', applicableYears: ['Typically ages 14-16'], lastChecked: checked }]
  },
  A_LEVEL: {
    id: 'A_LEVEL', name: 'Cambridge International AS & A Level', shortName: 'AS / A Level', countryRegion: 'International', authority: 'Cambridge International Education', activeVersion: 'Current published syllabuses', hierarchyKind: 'stage-syllabus-topic',
    terminology: { level: 'Qualification stage', subject: 'Subject', topic: 'Syllabus topic', subtopic: 'Subtopic', syllabus: 'Syllabus', assessment: 'Assessment component', examination: 'Cambridge examination' },
    levels: [{ id: 'as-level', label: 'AS Level', shortLabel: 'AS' }, { id: 'a-level', label: 'A Level', shortLabel: 'A Level' }],
    subjects: cambridgeALevelSubjects, assessmentTypes: ['Written component', 'Practical component', 'Coursework component'], gradingSummary: 'Assessment routes and components are syllabus-specific; some subjects can progress from AS Level to A Level.',
    sources: [{ authority: 'Cambridge International Education', url: aLevelUrl, title: 'Cambridge International AS & A Levels', version: 'Current published syllabuses', applicableYears: ['AS Level', 'A Level'], lastChecked: checked }]
  },
  VCE: {
    id: 'VCE', name: 'Victorian Certificate of Education', shortName: 'VCE', countryRegion: 'Victoria, Australia', authority: 'Victorian Curriculum and Assessment Authority', activeVersion: '2026 study design list', hierarchyKind: 'units-area-of-study',
    terminology: { level: 'Unit sequence', subject: 'Study', topic: 'Area of Study', subtopic: 'Outcome / key knowledge', syllabus: 'Study design', assessment: 'School-based assessment', examination: 'External examination' },
    levels: [{ id: 'units-1-2', label: 'Units 1 & 2', shortLabel: 'Units 1 & 2' }, { id: 'units-3-4', label: 'Units 3 & 4', shortLabel: 'Units 3 & 4' }],
    subjects: withTopics([
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
    ]), assessmentTypes: ['School-assessed coursework', 'School-assessed task', 'External examination', 'General Achievement Test'], gradingSummary: 'Assessment arrangements are study-specific and may combine school-based assessment with external examinations.',
    sources: [{ authority: 'Victorian Curriculum and Assessment Authority', url: vceUrl, title: 'VCE Study Designs', version: '2026 study design list', applicableYears: ['Units 1-4'], lastChecked: checked }]
  },
  IB_MYP: {
    id: 'IB_MYP', name: 'IB Middle Years Programme', shortName: 'IB MYP', countryRegion: 'International', authority: 'International Baccalaureate Organization', activeVersion: 'Current public MYP curriculum framework', hierarchyKind: 'programme-subject-topic', terminology: { level: 'MYP year', subject: 'Subject group', topic: 'Key learning area', subtopic: 'Related concept', syllabus: 'Subject-group framework', assessment: 'School assessment', examination: 'Optional eAssessment' }, levels: [1, 2, 3, 4, 5].map((year) => ({ id: `myp-${year}`, label: `MYP Year ${year}`, shortLabel: `MYP ${year}` })), subjects: ibMypSubjects, assessmentTypes: ['School-based assessment', 'Personal project', 'Optional eAssessment'], gradingSummary: 'Schools assess against published MYP objectives and criteria; optional eAssessment is available in the final year.', sources: [{ authority: 'International Baccalaureate Organization', url: ibMypUrl, title: 'MYP curriculum', version: 'Current public framework', applicableYears: ['MYP years 1-5'], lastChecked: checked }]
  },
  IB: {
    id: 'IB', name: 'IB Diploma Programme', shortName: 'IB DP', countryRegion: 'International', authority: 'International Baccalaureate Organization', activeVersion: 'Current public Diploma Programme curriculum', hierarchyKind: 'programme-subject-topic', terminology: { level: 'Subject level', subject: 'DP subject', topic: 'Course topic', subtopic: 'Subtopic', syllabus: 'Subject brief / course', assessment: 'Internal and external assessment', examination: 'DP examination' }, levels: [{ id: 'sl', label: 'Standard Level', shortLabel: 'SL' }, { id: 'hl', label: 'Higher Level', shortLabel: 'HL' }], subjects: ibDpSubjects, assessmentTypes: ['Internal assessment', 'External assessment', 'Extended Essay', 'Theory of Knowledge', 'Creativity, Activity, Service'], gradingSummary: 'Six subjects and the DP core contribute to the Diploma; subject requirements and assessment are course-specific.', sources: [{ authority: 'International Baccalaureate Organization', url: ibDpUrl, title: 'Diploma Programme curriculum', version: 'Current public curriculum', applicableYears: ['Diploma Programme'], lastChecked: checked }]
  }
}

export const SUPPORTED_CURRICULA = Object.values(registry)
export const DEFAULT_CURRICULUM_ID: SupportedCurriculumId = 'IB'

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
