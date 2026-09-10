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

export interface CurriculumLevel { id: string; label: string; shortLabel: string }
export interface CurriculumTopic { id: string; title: string; subtopics?: string[]; sourceUrl?: string }
export interface CurriculumSubject {
  id: string
  title: string
  canonicalArea: CanonicalSubjectArea
  group: string
  common: boolean
  syllabusCode?: string
  availableLevels?: string[]
  manualNameLabel?: string
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
  terminology: { level: string; subject: string; topic: string; subtopic: string; syllabus: string; assessment: string; examination: string }
  levels: CurriculumLevel[]
  subjects: CurriculumSubject[]
  assessmentTypes: string[]
  gradingSummary: string
  sources: CurriculumSource[]
}

type SubjectSeed = [id: string, title: string, area: CanonicalSubjectArea, group?: string, common?: boolean, levels?: string[], manualNameLabel?: string, syllabusCode?: string]

const checked = '2026-09-10'
const capsUrl = 'https://www.education.gov.za/Curriculum/CurriculumAssessmentPolicyStatements(CAPS).aspx'
const iebUrl = 'https://www.ieb.co.za/assessment/high-schools'
const igcseUrl = 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/subjects/'
const aLevelUrl = 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/subjects/'
const vceUrl = 'https://www.vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/vce-study-designs'
const ibMypUrl = 'https://www.ibo.org/programmes/middle-years-programme/curriculum/'
const ibDpUrl = 'https://www.ibo.org/programmes/diploma-programme/curriculum/'

const topic = (id: string, title: string, subtopics: string[] = []): CurriculumTopic => ({ id, title, subtopics })
const mathsTopics = [topic('algebra', 'Algebra'), topic('functions', 'Functions'), topic('geometry-trigonometry', 'Geometry and trigonometry'), topic('statistics-probability', 'Statistics and probability'), topic('calculus', 'Calculus')]
const languageTopics = [topic('reading', 'Reading and interpretation'), topic('writing', 'Writing and composition'), topic('oral', 'Speaking and listening')]
const topicsFor = (id: string, area: CanonicalSubjectArea) => area === 'Mathematics' ? mathsTopics : area === 'English' || area === 'Languages' ? languageTopics : area === 'Science' ? [topic('scientific-practice', 'Scientific practice'), topic('systems', 'Systems and interactions')] : area === 'Technology' ? [topic('systems', 'Systems'), topic('data', 'Data'), topic('design-programming', 'Design and programming')] : [topic('foundations', 'Foundations'), topic('analysis-evaluation', 'Analysis and evaluation')]
const subjects = (sourceUrl: string, seeds: SubjectSeed[]): CurriculumSubject[] => seeds.map(([id, title, canonicalArea, group = canonicalArea, common = false, availableLevels, manualNameLabel, syllabusCode]) => ({ id, title, canonicalArea, group, common, availableLevels, manualNameLabel, syllabusCode, topics: topicsFor(id, canonicalArea), sourceUrl }))

const southAfricanSeeds: SubjectSeed[] = [
  ['accounting', 'Accounting', 'Commerce', 'Commerce', true], ['agricultural-management-practices', 'Agricultural Management Practices', 'Science'], ['agricultural-sciences', 'Agricultural Sciences', 'Science'], ['agricultural-technology', 'Agricultural Technology', 'Technology'],
  ['business-studies', 'Business Studies', 'Commerce', 'Commerce', true], ['civil-technology', 'Civil Technology', 'Technology'], ['computer-applications-technology', 'Computer Applications Technology', 'Technology', 'Technology', true], ['consumer-studies', 'Consumer Studies', 'Commerce'],
  ['dance-studies', 'Dance Studies', 'Arts'], ['design', 'Design', 'Arts'], ['dramatic-arts', 'Dramatic Arts', 'Arts'], ['economics', 'Economics', 'Commerce', 'Commerce', true], ['electrical-technology', 'Electrical Technology', 'Technology'], ['engineering-graphics-design', 'Engineering Graphics and Design', 'Technology'],
  ['english-home-language', 'English Home Language', 'English', 'Languages', true], ['english-first-additional-language', 'English First Additional Language', 'English', 'Languages', true], ['geography', 'Geography', 'Humanities', 'Humanities', true], ['history', 'History', 'Humanities', 'Humanities', true],
  ['hospitality-studies', 'Hospitality Studies', 'Commerce'], ['information-technology', 'Information Technology', 'Technology', 'Technology', true], ['life-orientation', 'Life Orientation', 'Health', 'Core', true], ['life-sciences', 'Life Sciences', 'Science', 'Sciences', true],
  ['mathematical-literacy', 'Mathematical Literacy', 'Mathematics', 'Mathematics', true], ['mathematics', 'Mathematics', 'Mathematics', 'Mathematics', true], ['mechanical-technology', 'Mechanical Technology', 'Technology'], ['music', 'Music', 'Arts'],
  ['physical-sciences', 'Physical Sciences', 'Science', 'Sciences', true], ['religion-studies', 'Religion Studies', 'Humanities'], ['tourism', 'Tourism', 'Commerce'], ['visual-arts', 'Visual Arts', 'Arts'],
  ['afrikaans-home-language', 'Afrikaans Home Language', 'Languages', 'Languages', true], ['afrikaans-first-additional-language', 'Afrikaans First Additional Language', 'Languages'], ['isiZulu-home-language', 'isiZulu Home Language', 'Languages'], ['isiXhosa-home-language', 'isiXhosa Home Language', 'Languages'], ['sepedi-home-language', 'Sepedi Home Language', 'Languages'], ['sesotho-home-language', 'Sesotho Home Language', 'Languages']
]

const igcseSeeds: SubjectSeed[] = [
  ['accounting', 'Accounting', 'Commerce', 'Business and commerce', false, undefined, undefined, '0452'], ['additional-mathematics', 'Additional Mathematics', 'Mathematics', 'Mathematics', true, undefined, undefined, '0606'], ['art-design', 'Art & Design', 'Arts'], ['biology', 'Biology', 'Science', 'Sciences', true, undefined, undefined, '0610'],
  ['business-studies', 'Business Studies', 'Commerce', 'Business and commerce', true, undefined, undefined, '0450'], ['chemistry', 'Chemistry', 'Science', 'Sciences', true, undefined, undefined, '0620'], ['combined-science', 'Combined Science', 'Science', 'Sciences', true, undefined, undefined, '0653'], ['computer-science', 'Computer Science', 'Technology', 'Technology', true, undefined, undefined, '0478'],
  ['design-technology', 'Design & Technology', 'Technology'], ['drama', 'Drama', 'Arts'], ['economics', 'Economics', 'Commerce', 'Business and commerce', true, undefined, undefined, '0455'], ['english-first-language', 'First Language English', 'English', 'Languages', true, undefined, undefined, '0500'],
  ['english-second-language', 'English as a Second Language', 'English', 'Languages', true, undefined, undefined, '0510'], ['enterprise', 'Enterprise', 'Commerce'], ['environmental-management', 'Environmental Management', 'Science'], ['food-nutrition', 'Food & Nutrition', 'Health'], ['foreign-language', 'Foreign Language', 'Languages', 'Languages', false, undefined, 'Language'],
  ['geography', 'Geography', 'Humanities', 'Humanities', true, undefined, undefined, '0460'], ['global-perspectives', 'Global Perspectives', 'Humanities', 'Humanities', true, undefined, undefined, '0457'], ['history', 'History', 'Humanities', 'Humanities', true, undefined, undefined, '0470'], ['information-communication-technology', 'Information & Communication Technology', 'Technology', 'Technology', true, undefined, undefined, '0417'],
  ['international-mathematics', 'International Mathematics', 'Mathematics'], ['literature-english', 'Literature in English', 'English'], ['marine-science', 'Marine Science', 'Science'], ['mathematics', 'Mathematics', 'Mathematics', 'Mathematics', true, undefined, undefined, '0580'], ['music', 'Music', 'Arts'], ['physical-education', 'Physical Education', 'Health'], ['physics', 'Physics', 'Science', 'Sciences', true, undefined, undefined, '0625'], ['sociology', 'Sociology', 'Humanities'], ['travel-tourism', 'Travel & Tourism', 'Commerce'], ['world-literature', 'World Literature', 'English']
]

const aLevelSeeds: SubjectSeed[] = [
  ['accounting', 'Accounting', 'Commerce', 'Business and commerce', false, undefined, undefined, '9706'], ['art-design', 'Art & Design', 'Arts'], ['biology', 'Biology', 'Science', 'Sciences', true, undefined, undefined, '9700'], ['business', 'Business', 'Commerce', 'Business and commerce', true, undefined, undefined, '9609'],
  ['chemistry', 'Chemistry', 'Science', 'Sciences', true, undefined, undefined, '9701'], ['classical-studies', 'Classical Studies', 'Humanities'], ['computer-science', 'Computer Science', 'Technology', 'Technology', true, undefined, undefined, '9618'], ['design-technology', 'Design & Technology', 'Technology'], ['digital-media-design', 'Digital Media & Design', 'Arts'],
  ['economics', 'Economics', 'Commerce', 'Business and commerce', true, undefined, undefined, '9708'], ['english-language', 'English Language', 'English', 'Languages', true, undefined, undefined, '9093'], ['english-literature', 'Literature in English', 'English'], ['environmental-management', 'Environmental Management', 'Science', 'Sciences', false, ['as-level']], ['further-mathematics', 'Further Mathematics', 'Mathematics', 'Mathematics', true, undefined, undefined, '9231'],
  ['geography', 'Geography', 'Humanities', 'Humanities', true, undefined, undefined, '9696'], ['global-perspectives-research', 'Global Perspectives & Research', 'Humanities'], ['history', 'History', 'Humanities', 'Humanities', true, undefined, undefined, '9489'], ['information-technology', 'Information Technology', 'Technology'], ['language', 'Language', 'Languages', 'Languages', false, undefined, 'Language'],
  ['law', 'Law', 'Humanities'], ['marine-science', 'Marine Science', 'Science'], ['mathematics', 'Mathematics', 'Mathematics', 'Mathematics', true, undefined, undefined, '9709'], ['media-studies', 'Media Studies', 'Arts'], ['music', 'Music', 'Arts'], ['physical-education', 'Physical Education', 'Health'], ['physics', 'Physics', 'Science', 'Sciences', true, undefined, undefined, '9702'], ['psychology', 'Psychology', 'Science', 'Humanities', true, undefined, undefined, '9990'], ['sociology', 'Sociology', 'Humanities'], ['thinking-skills', 'Thinking Skills', 'Humanities'], ['travel-tourism', 'Travel & Tourism', 'Commerce']
]

const vceSeeds: SubjectSeed[] = [
  ['accounting', 'Accounting', 'Commerce', 'Business and commerce'], ['algorithmics', 'Algorithmics (HESS)', 'Technology', 'Technology', false, ['units-3-4']], ['applied-computing', 'Applied Computing', 'Technology', 'Technology', true], ['art-creative-practice', 'Art Creative Practice', 'Arts'], ['art-making-exhibiting', 'Art Making and Exhibiting', 'Arts'],
  ['australian-global-politics', 'Australian and Global Politics', 'Humanities'], ['biology', 'Biology', 'Science', 'Sciences', true], ['business-management', 'Business Management', 'Commerce', 'Business and commerce', true], ['chemistry', 'Chemistry', 'Science', 'Sciences', true], ['classical-studies', 'Classical Studies', 'Humanities'], ['computing', 'Computing', 'Technology'], ['dance', 'Dance', 'Arts'], ['drama', 'Drama', 'Arts'],
  ['economics', 'Economics', 'Commerce', 'Business and commerce', true], ['english', 'English', 'English', 'English', true], ['english-additional-language', 'English as an Additional Language', 'English'], ['english-language', 'English Language', 'English'], ['environmental-science', 'Environmental Science', 'Science'], ['food-studies', 'Food Studies', 'Health'],
  ['foundation-mathematics', 'Foundation Mathematics', 'Mathematics'], ['general-mathematics', 'General Mathematics', 'Mathematics', 'Mathematics', true], ['geography', 'Geography', 'Humanities', 'Humanities', true], ['health-human-development', 'Health and Human Development', 'Health', 'Health', true], ['history', 'History', 'Humanities', 'Humanities', true], ['industry-enterprise', 'Industry and Enterprise', 'Commerce'],
  ['language', 'Languages', 'Languages', 'Languages', false, undefined, 'Language'], ['legal-studies', 'Legal Studies', 'Humanities', 'Humanities', true], ['literature', 'Literature', 'English'], ['mathematical-methods', 'Mathematical Methods', 'Mathematics', 'Mathematics', true], ['media', 'Media', 'Arts'], ['music', 'Music', 'Arts'], ['outdoor-environmental-studies', 'Outdoor and Environmental Studies', 'Health'],
  ['philosophy', 'Philosophy', 'Humanities'], ['physical-education', 'Physical Education', 'Health'], ['physics', 'Physics', 'Science', 'Sciences', true], ['product-design-technologies', 'Product Design and Technologies', 'Technology'], ['psychology', 'Psychology', 'Science', 'Sciences', true], ['religion-society', 'Religion and Society', 'Humanities'], ['sociology', 'Sociology', 'Humanities'], ['specialist-mathematics', 'Specialist Mathematics', 'Mathematics', 'Mathematics', true], ['systems-engineering', 'Systems Engineering', 'Technology'], ['theatre-studies', 'Theatre Studies', 'Arts'], ['visual-communication-design', 'Visual Communication Design', 'Arts']
]

const ibMypSeeds: SubjectSeed[] = [
  ['language-literature', 'Language and literature', 'English', 'Subject groups', true, undefined, 'Language'], ['language-acquisition', 'Language acquisition', 'Languages', 'Subject groups', true, undefined, 'Language'], ['individuals-societies', 'Individuals and societies', 'Humanities', 'Subject groups', true], ['sciences', 'Sciences', 'Science', 'Subject groups', true], ['mathematics', 'Mathematics', 'Mathematics', 'Subject groups', true], ['arts', 'Arts', 'Arts', 'Subject groups', true], ['physical-health-education', 'Physical and health education', 'Health', 'Subject groups', true], ['design', 'Design', 'Technology', 'Subject groups', true], ['interdisciplinary-learning', 'Interdisciplinary learning', 'Humanities', 'Programme requirements'], ['personal-project', 'Personal project', 'Humanities', 'Programme requirements', true, ['myp-5']]
]

const ibDpSeeds: SubjectSeed[] = [
  ['language-a-literature', 'Language A: literature', 'Languages', 'Group 1: Studies in language and literature', true, ['sl', 'hl'], 'Language'], ['english-a-language-literature', 'Language A: language and literature', 'English', 'Group 1: Studies in language and literature', true, ['sl', 'hl'], 'Language'], ['literature-performance', 'Literature and performance', 'Arts', 'Group 1: Studies in language and literature', false, ['sl']],
  ['language-b', 'Language B', 'Languages', 'Group 2: Language acquisition', true, ['sl', 'hl'], 'Language'], ['language-ab-initio', 'Language ab initio', 'Languages', 'Group 2: Language acquisition', true, ['sl'], 'Language'], ['classical-languages', 'Classical languages', 'Languages', 'Group 2: Language acquisition', false, ['sl', 'hl'], 'Language'],
  ['business-management', 'Business management', 'Commerce', 'Group 3: Individuals and societies', true, ['sl', 'hl']], ['digital-society', 'Digital society', 'Technology', 'Group 3: Individuals and societies', false, ['sl', 'hl']], ['economics', 'Economics', 'Commerce', 'Group 3: Individuals and societies', true, ['sl', 'hl']], ['geography', 'Geography', 'Humanities', 'Group 3: Individuals and societies', true, ['sl', 'hl']], ['global-politics', 'Global politics', 'Humanities', 'Group 3: Individuals and societies', true, ['sl', 'hl']], ['history', 'History', 'Humanities', 'Group 3: Individuals and societies', true, ['sl', 'hl']], ['philosophy', 'Philosophy', 'Humanities', 'Group 3: Individuals and societies', false, ['sl', 'hl']], ['psychology', 'Psychology', 'Science', 'Group 3: Individuals and societies', true, ['sl', 'hl']], ['social-cultural-anthropology', 'Social and cultural anthropology', 'Humanities', 'Group 3: Individuals and societies', false, ['sl', 'hl']], ['world-religions', 'World religions', 'Humanities', 'Group 3: Individuals and societies', false, ['sl']],
  ['biology', 'Biology', 'Science', 'Group 4: Sciences', true, ['sl', 'hl']], ['chemistry', 'Chemistry', 'Science', 'Group 4: Sciences', true, ['sl', 'hl']], ['computer-science', 'Computer science', 'Technology', 'Group 4: Sciences', true, ['sl', 'hl']], ['design-technology', 'Design technology', 'Technology', 'Group 4: Sciences', false, ['sl', 'hl']], ['environmental-systems-societies', 'Environmental systems and societies', 'Science', 'Group 4: Sciences', true, ['sl', 'hl']], ['physics', 'Physics', 'Science', 'Group 4: Sciences', true, ['sl', 'hl']], ['sports-exercise-health-science', 'Sports, exercise and health science', 'Health', 'Group 4: Sciences', false, ['sl', 'hl']],
  ['mathematics-analysis-approaches', 'Mathematics: analysis and approaches', 'Mathematics', 'Group 5: Mathematics', true, ['sl', 'hl']], ['mathematics-applications-interpretation', 'Mathematics: applications and interpretation', 'Mathematics', 'Group 5: Mathematics', true, ['sl', 'hl']],
  ['dance', 'Dance', 'Arts', 'Group 6: The arts', false, ['sl', 'hl']], ['film', 'Film', 'Arts', 'Group 6: The arts', false, ['sl', 'hl']], ['music', 'Music', 'Arts', 'Group 6: The arts', true, ['sl', 'hl']], ['theatre', 'Theatre', 'Arts', 'Group 6: The arts', false, ['sl', 'hl']], ['visual-arts', 'Visual arts', 'Arts', 'Group 6: The arts', true, ['sl', 'hl']],
  ['theory-of-knowledge', 'Theory of knowledge', 'Humanities', 'DP Core', true, []], ['extended-essay', 'Extended essay', 'Humanities', 'DP Core', true, []], ['creativity-activity-service', 'Creativity, activity, service', 'Health', 'DP Core', true, []]
]

const gradeLevels = ['Grade 10', 'Grade 11', 'Grade 12'].map((label) => ({ id: label.toLowerCase().replace(' ', '-'), label, shortLabel: label.replace('Grade ', 'G') }))
const registry: Record<SupportedCurriculumId, CurriculumDefinition> = {
  IEB: { id: 'IEB', name: 'IEB National Senior Certificate', shortName: 'IEB', countryRegion: 'South Africa', authority: 'Independent Examinations Board / Umalusi', activeVersion: 'Current IEB NSC', hierarchyKind: 'grade-subject-topic', terminology: { level: 'Grade', subject: 'Subject', topic: 'Curriculum topic', subtopic: 'Subtopic', syllabus: 'Subject Assessment Guidelines', assessment: 'School-based assessment', examination: 'IEB NSC examination' }, levels: gradeLevels, subjects: subjects(iebUrl, southAfricanSeeds), assessmentTypes: ['School-based assessment', 'Practical assessment', 'Oral assessment', 'Final examination'], gradingSummary: 'Results and promotion follow the accredited National Senior Certificate framework.', sources: [{ authority: 'Independent Examinations Board', url: iebUrl, title: 'IEB High Schools and NSC assessment', version: 'Current', applicableYears: ['Grades 10-12'], lastChecked: checked }] },
  NSC: { id: 'NSC', name: 'South African NSC / CAPS', shortName: 'NSC / CAPS', countryRegion: 'South Africa', authority: 'Department of Basic Education', activeVersion: 'NCS Grades R-12 with current CAPS amendments', hierarchyKind: 'grade-subject-topic', terminology: { level: 'Grade', subject: 'Subject', topic: 'CAPS topic', subtopic: 'Subtopic', syllabus: 'CAPS statement', assessment: 'School-based assessment', examination: 'NSC examination' }, levels: gradeLevels, subjects: subjects(capsUrl, southAfricanSeeds), assessmentTypes: ['School-based assessment', 'Practical assessment task', 'Oral assessment', 'NSC examination'], gradingSummary: 'CAPS and the National Protocol for Assessment govern recording, reporting and promotion.', sources: [{ authority: 'South African Department of Basic Education', url: capsUrl, title: 'Curriculum and Assessment Policy Statements', version: 'NCS Grades R-12 and published amendments', applicableYears: ['Grades R-12'], lastChecked: checked }] },
  IGCSE: { id: 'IGCSE', name: 'Cambridge IGCSE', shortName: 'IGCSE', countryRegion: 'International', authority: 'Cambridge International Education', activeVersion: 'Current published syllabuses', hierarchyKind: 'stage-syllabus-topic', terminology: { level: 'Stage', subject: 'Subject', topic: 'Syllabus topic', subtopic: 'Subtopic', syllabus: 'Syllabus', assessment: 'Assessment component', examination: 'Cambridge examination' }, levels: [{ id: 'year-1', label: 'IGCSE Year 1', shortLabel: 'Year 1' }, { id: 'year-2', label: 'IGCSE Year 2', shortLabel: 'Year 2' }], subjects: subjects(igcseUrl, igcseSeeds), assessmentTypes: ['Written assessment', 'Oral assessment', 'Coursework', 'Practical assessment'], gradingSummary: 'Assessment is syllabus-specific; availability and grading routes vary by syllabus and administrative zone.', sources: [{ authority: 'Cambridge International Education', url: igcseUrl, title: 'Cambridge IGCSE subjects', version: 'Current published syllabuses', lastChecked: checked }] },
  A_LEVEL: { id: 'A_LEVEL', name: 'Cambridge International AS & A Level', shortName: 'AS / A Level', countryRegion: 'International', authority: 'Cambridge International Education', activeVersion: 'Current published syllabuses', hierarchyKind: 'stage-syllabus-topic', terminology: { level: 'Qualification stage', subject: 'Subject', topic: 'Syllabus topic', subtopic: 'Subtopic', syllabus: 'Syllabus', assessment: 'Assessment component', examination: 'Cambridge examination' }, levels: [{ id: 'as-level', label: 'AS Level', shortLabel: 'AS' }, { id: 'a-level', label: 'A Level', shortLabel: 'A Level' }], subjects: subjects(aLevelUrl, aLevelSeeds), assessmentTypes: ['Written component', 'Practical component', 'Coursework component'], gradingSummary: 'Assessment routes and components are syllabus-specific; not every subject is available at both stages.', sources: [{ authority: 'Cambridge International Education', url: aLevelUrl, title: 'Cambridge International AS & A Level subjects', version: 'Current published syllabuses', lastChecked: checked }] },
  VCE: { id: 'VCE', name: 'Victorian Certificate of Education', shortName: 'VCE', countryRegion: 'Victoria, Australia', authority: 'Victorian Curriculum and Assessment Authority', activeVersion: '2026 study design list', hierarchyKind: 'units-area-of-study', terminology: { level: 'Unit sequence', subject: 'Study', topic: 'Area of Study', subtopic: 'Outcome / key knowledge', syllabus: 'Study design', assessment: 'School-based assessment', examination: 'External examination' }, levels: [{ id: 'units-1-2', label: 'Units 1 & 2', shortLabel: 'Units 1 & 2' }, { id: 'units-3-4', label: 'Units 3 & 4', shortLabel: 'Units 3 & 4' }], subjects: subjects(vceUrl, vceSeeds), assessmentTypes: ['School-assessed coursework', 'School-assessed task', 'External examination', 'General Achievement Test'], gradingSummary: 'Assessment arrangements are study-specific and may combine school-based assessment with external examinations.', sources: [{ authority: 'Victorian Curriculum and Assessment Authority', url: vceUrl, title: 'VCE Study Designs', version: '2026 study design list', lastChecked: checked }] },
  IB_MYP: { id: 'IB_MYP', name: 'IB Middle Years Programme', shortName: 'IB MYP', countryRegion: 'International', authority: 'International Baccalaureate Organization', activeVersion: 'Current public MYP curriculum framework', hierarchyKind: 'programme-subject-topic', terminology: { level: 'MYP year', subject: 'Subject group', topic: 'Key learning area', subtopic: 'Related concept', syllabus: 'Subject-group framework', assessment: 'School assessment', examination: 'Optional eAssessment' }, levels: [1, 2, 3, 4, 5].map((year) => ({ id: `myp-${year}`, label: `MYP Year ${year}`, shortLabel: `MYP ${year}` })), subjects: subjects(ibMypUrl, ibMypSeeds), assessmentTypes: ['School-based assessment', 'Personal project', 'Optional eAssessment'], gradingSummary: 'Schools assess against published MYP objectives and criteria; optional eAssessment is available in the final year.', sources: [{ authority: 'International Baccalaureate Organization', url: ibMypUrl, title: 'MYP curriculum', version: 'Current public framework', lastChecked: checked }] },
  IB: { id: 'IB', name: 'IB Diploma Programme', shortName: 'IB DP', countryRegion: 'International', authority: 'International Baccalaureate Organization', activeVersion: 'Current public Diploma Programme curriculum', hierarchyKind: 'programme-subject-topic', terminology: { level: 'Subject level', subject: 'DP subject', topic: 'Course topic', subtopic: 'Subtopic', syllabus: 'Subject brief / course', assessment: 'Internal and external assessment', examination: 'DP examination' }, levels: [{ id: 'sl', label: 'Standard Level', shortLabel: 'SL' }, { id: 'hl', label: 'Higher Level', shortLabel: 'HL' }], subjects: subjects(ibDpUrl, ibDpSeeds), assessmentTypes: ['Internal assessment', 'External assessment', 'Extended Essay', 'Theory of Knowledge', 'Creativity, Activity, Service'], gradingSummary: 'Six subjects and the DP core contribute to the Diploma; subject requirements and assessment are course-specific.', sources: [{ authority: 'International Baccalaureate Organization', url: ibDpUrl, title: 'Diploma Programme curriculum', version: 'Current public curriculum', lastChecked: checked }] }
}

export const SUPPORTED_CURRICULA = Object.values(registry)
export const DEFAULT_CURRICULUM_ID: SupportedCurriculumId = 'IB'
export const CURRICULUM_SUBJECT_COUNTS: Record<SupportedCurriculumId, number> = Object.fromEntries(SUPPORTED_CURRICULA.map((curriculum) => [curriculum.id, curriculum.subjects.length])) as Record<SupportedCurriculumId, number>

export function isSupportedCurriculumId(value: unknown): value is SupportedCurriculumId { return typeof value === 'string' && value in registry }
export function getCurriculum(id: LearnerCurriculumId | string | undefined): CurriculumDefinition { return isSupportedCurriculumId(id) ? registry[id] : registry[DEFAULT_CURRICULUM_ID] }
export function getAllCurriculumSubjects(curriculumId: SupportedCurriculumId): CurriculumSubject[] { return getCurriculum(curriculumId).subjects }
export function getCommonCurriculumSubjects(curriculumId: SupportedCurriculumId): CurriculumSubject[] { return getCurriculum(curriculumId).subjects.filter((subject) => subject.common) }
export function searchCurriculumSubjects(curriculumId: SupportedCurriculumId, query: string): CurriculumSubject[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return getAllCurriculumSubjects(curriculumId)
  return getAllCurriculumSubjects(curriculumId).filter((subject) => {
    const haystack = [subject.title, subject.id, subject.group, subject.canonicalArea, subject.syllabusCode].filter(Boolean).join(' ').toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}
export function getCurriculumSubject(curriculumId: string, subjectIdOrTitle: string): CurriculumSubject | undefined { const normalized = subjectIdOrTitle.trim().toLowerCase(); return getCurriculum(curriculumId).subjects.find((subject) => subject.id === normalized || subject.title.toLowerCase() === normalized) }
export function getAvailableSubjectLevels(curriculumId: SupportedCurriculumId, subjectId: string): CurriculumLevel[] { const curriculum = getCurriculum(curriculumId); const subject = getCurriculumSubject(curriculumId, subjectId); return subject?.availableLevels === undefined ? curriculum.levels : curriculum.levels.filter((level) => subject.availableLevels?.includes(level.id)) }
export function resolveViewingCurriculum(savedCurriculum: LearnerCurriculumId, viewingCurriculum: 'MY' | SupportedCurriculumId): SupportedCurriculumId { return viewingCurriculum === 'MY' && isSupportedCurriculumId(savedCurriculum) ? savedCurriculum : viewingCurriculum === 'MY' ? DEFAULT_CURRICULUM_ID : viewingCurriculum }
export function curriculumPath(curriculumId: string, levelId?: string, subjectId?: string, topicId?: string) { return ['/resources', curriculumId.toLowerCase(), levelId, subjectId, topicId].filter(Boolean).join('/') }
export function createLearnerCurriculumContext(input: { curriculumId: LearnerCurriculumId; level: string; subject?: CurriculumSubject; topic?: CurriculumTopic }) { const curriculum = getCurriculum(input.curriculumId); return { learnerMode: 'school' as const, curriculum: curriculum.id, curriculumName: curriculum.name, curriculumVersion: curriculum.activeVersion, level: input.level, subject: input.subject?.title || '', subjectCode: input.subject?.syllabusCode || input.subject?.id || '', canonicalSubjectArea: input.subject?.canonicalArea || '', topic: input.topic?.title || '', authority: curriculum.authority } }
