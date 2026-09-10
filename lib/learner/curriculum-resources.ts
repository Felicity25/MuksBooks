import type { CanonicalSubjectArea, SupportedCurriculumId } from './curriculum-registry'

export type LearnerResourceType = 'Syllabus' | 'Topic overview' | 'Notes' | 'Worked examples' | 'Practice questions' | 'Past examination material' | 'Marking guidance' | 'Formula / reference material' | 'Video' | 'External learning resource'

export interface CurriculumAlignment {
  curriculumId: SupportedCurriculumId
  curriculumVersion: string
  levelIds?: string[]
  subjectIds?: string[]
  topicIds?: string[]
  applicableYears?: string[]
  authority?: string
}

export interface LearnerCurriculumResource {
  id: string
  title: string
  summary: string
  type: LearnerResourceType
  difficulty: 'Foundation' | 'Core' | 'Extension'
  canonicalAreas: CanonicalSubjectArea[]
  subjectKeywords: string[]
  topicKeywords: string[]
  source: string
  sourceUrl: string
  lastVerified: string
  alignments: CurriculumAlignment[]
}

const verified = '2026-09-10'

export const CURRICULUM_RESOURCES: LearnerCurriculumResource[] = [
  {
    id: 'dbe-caps-statements', title: 'CAPS subject policy statements', summary: 'Official curriculum and assessment policy statements published for approved South African school subjects.', type: 'Syllabus', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce', 'Technology', 'Languages', 'Arts', 'Health'], subjectKeywords: [], topicKeywords: [], source: 'South African Department of Basic Education', sourceUrl: 'https://www.education.gov.za/Curriculum/CurriculumAssessmentPolicyStatements(CAPS).aspx', lastVerified: verified,
    alignments: [{ curriculumId: 'NSC', curriculumVersion: 'NCS Grades R-12 and published amendments', levelIds: ['grade-10', 'grade-11', 'grade-12'], authority: 'South African Department of Basic Education' }]
  },
  {
    id: 'dbe-nsc-past-papers', title: 'NSC past examination papers', summary: 'Official Grade 12 examination papers and related examination material from the Department of Basic Education.', type: 'Past examination material', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce'], subjectKeywords: [], topicKeywords: [], source: 'South African Department of Basic Education', sourceUrl: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx', lastVerified: verified,
    alignments: [{ curriculumId: 'NSC', curriculumVersion: 'Current NSC examinations', levelIds: ['grade-12'], applicableYears: ['Current and archived examination years'], authority: 'South African Department of Basic Education' }]
  },
  {
    id: 'ieb-nsc-past-papers', title: 'IEB NSC past papers and marking guidelines', summary: 'Official IEB examination papers and marking guidance where made publicly available.', type: 'Past examination material', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce'], subjectKeywords: [], topicKeywords: [], source: 'Independent Examinations Board', sourceUrl: 'https://www.ieb.co.za/assessment/high-schools/national-senior-certificate/nsc-past-papers', lastVerified: verified,
    alignments: [{ curriculumId: 'IEB', curriculumVersion: 'Current IEB NSC', levelIds: ['grade-12'], authority: 'Independent Examinations Board' }]
  },
  {
    id: 'cambridge-igcse-subjects', title: 'Cambridge IGCSE syllabuses', summary: 'Official subject syllabuses, assessment objectives and component information for Cambridge IGCSE.', type: 'Syllabus', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce', 'Technology', 'Languages', 'Arts'], subjectKeywords: [], topicKeywords: [], source: 'Cambridge International Education', sourceUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/subjects/', lastVerified: verified,
    alignments: [{ curriculumId: 'IGCSE', curriculumVersion: 'Current published syllabuses', levelIds: ['year-1', 'year-2'], authority: 'Cambridge International Education' }]
  },
  {
    id: 'cambridge-a-level-subjects', title: 'Cambridge International AS & A Level syllabuses', summary: 'Official syllabuses and assessment component details for Cambridge International AS & A Level subjects.', type: 'Syllabus', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce', 'Technology', 'Languages', 'Arts'], subjectKeywords: [], topicKeywords: [], source: 'Cambridge International Education', sourceUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/subjects/', lastVerified: verified,
    alignments: [{ curriculumId: 'A_LEVEL', curriculumVersion: 'Current published syllabuses', levelIds: ['as-level', 'a-level'], authority: 'Cambridge International Education' }]
  },
  {
    id: 'vce-study-designs', title: 'VCE study designs', summary: 'Official study designs defining units, Areas of Study, outcomes and assessment for each VCE study.', type: 'Syllabus', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce', 'Technology', 'Languages', 'Arts', 'Health'], subjectKeywords: [], topicKeywords: [], source: 'Victorian Curriculum and Assessment Authority', sourceUrl: 'https://www.vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/vce-study-designs', lastVerified: verified,
    alignments: [{ curriculumId: 'VCE', curriculumVersion: '2026 study design list', levelIds: ['units-1-2', 'units-3-4'], authority: 'Victorian Curriculum and Assessment Authority' }]
  },
  {
    id: 'vce-exam-material', title: 'VCE examination specifications and past examinations', summary: 'Official specifications, past examinations, external assessment reports and sample material.', type: 'Past examination material', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce'], subjectKeywords: [], topicKeywords: [], source: 'Victorian Curriculum and Assessment Authority', sourceUrl: 'https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/examination-specifications-past-examinations-and-external-assessment-reports', lastVerified: verified,
    alignments: [{ curriculumId: 'VCE', curriculumVersion: 'Current VCE assessment program', levelIds: ['units-3-4'], authority: 'Victorian Curriculum and Assessment Authority' }]
  },
  {
    id: 'openstax-mathematics', title: 'OpenStax mathematics library', summary: 'Open textbooks and worked explanations that can supplement curriculum-specific mathematics material.', type: 'External learning resource', difficulty: 'Foundation', canonicalAreas: ['Mathematics'], subjectKeywords: ['mathematics', 'mathematical methods', 'general mathematics', 'additional mathematics'], topicKeywords: ['algebra', 'functions', 'calculus', 'statistics'], source: 'OpenStax, Rice University', sourceUrl: 'https://openstax.org/subjects/math', lastVerified: verified, alignments: []
  }
]

export function findCurriculumResources(input: { curriculumId: SupportedCurriculumId; levelId: string; subjectId: string; subjectTitle: string; canonicalArea: CanonicalSubjectArea; topicId?: string }) {
  const normalizedTitle = input.subjectTitle.toLowerCase()
  const aligned = CURRICULUM_RESOURCES.filter((resource) => resource.alignments.some((alignment) =>
    alignment.curriculumId === input.curriculumId &&
    (!alignment.levelIds?.length || alignment.levelIds.includes(input.levelId)) &&
    (!alignment.subjectIds?.length || alignment.subjectIds.includes(input.subjectId)) &&
    (!alignment.topicIds?.length || !input.topicId || alignment.topicIds.includes(input.topicId))
  ))
  const additional = CURRICULUM_RESOURCES.filter((resource) => !resource.alignments.length && (
    resource.canonicalAreas.includes(input.canonicalArea) || resource.subjectKeywords.some((keyword) => normalizedTitle.includes(keyword))
  ))
  return { aligned, additional }
}
