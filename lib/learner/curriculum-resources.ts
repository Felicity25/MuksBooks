import { SUPPORTED_CURRICULA, getCurriculum, type CanonicalSubjectArea, type SupportedCurriculumId } from './curriculum-registry.ts'

export type LearnerResourceType = 'Curriculum / Syllabus' | 'Study Notes' | 'Topic Explanation' | 'Worked Examples' | 'Practice Questions' | 'Past Paper' | 'Marking Guideline / Memorandum' | 'Examiner Report' | 'Specimen Paper' | 'Formula / Data Sheet' | 'Video' | 'Assessment Guidance' | 'Revision Guide' | 'Interactive Resource' | 'Official Website'
export type ResourceTrustStatus = 'OFFICIAL' | 'VERIFIED' | 'GENERAL'

export interface CurriculumAlignment {
  curriculumId: SupportedCurriculumId
  curriculumVersion: string
  programme?: string
  qualification?: string
  levelIds?: string[]
  subjectIds?: string[]
  topicIds?: string[]
  unit?: string
  areaOfStudy?: string
  syllabusCode?: string
  syllabusVersion?: string
  applicableYears?: string[]
  authority?: string
  matchConfidence?: 'EXACT' | 'HIGH' | 'GENERAL'
}

export interface LearnerCurriculumResource {
  id: string
  title: string
  summary: string
  type: LearnerResourceType
  trustStatus: ResourceTrustStatus
  difficulty: 'Foundation' | 'Core' | 'Extension'
  canonicalAreas: CanonicalSubjectArea[]
  subjectKeywords: string[]
  topicKeywords: string[]
  source: string
  sourceUrl: string
  sourceDomain: string
  accessType: 'PUBLIC' | 'PROVIDER_LOGIN' | 'PAID'
  language: string
  verifiedAt?: string
  lastCheckedAt: string
  verificationMethod: string
  validFrom?: string
  validTo?: string
  isActive: boolean
  alignments: CurriculumAlignment[]
}

const verified = '2026-09-10'

const CORE_CURRICULUM_RESOURCES: LearnerCurriculumResource[] = [
  {
    id: 'dbe-caps-statements', title: 'CAPS subject policy statements', summary: 'Official curriculum and assessment policy statements published for approved South African school subjects.', type: 'Curriculum / Syllabus', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce', 'Technology', 'Languages', 'Arts', 'Health'], subjectKeywords: [], topicKeywords: [], source: 'South African Department of Basic Education', sourceUrl: 'https://www.education.gov.za/Curriculum/CurriculumAssessmentPolicyStatements(CAPS).aspx', sourceDomain: 'education.gov.za', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'NSC', curriculumVersion: 'NCS Grades R-12 and published amendments', levelIds: ['grade-10', 'grade-11', 'grade-12'], authority: 'South African Department of Basic Education' }]
  },
  {
    id: 'dbe-nsc-past-papers', title: 'NSC past examination papers', summary: 'Official Grade 12 examination papers and related examination material from the Department of Basic Education.', type: 'Past Paper', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce'], subjectKeywords: [], topicKeywords: [], source: 'South African Department of Basic Education', sourceUrl: 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx', sourceDomain: 'education.gov.za', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'NSC', curriculumVersion: 'Current NSC examinations', levelIds: ['grade-12'], applicableYears: ['Current and archived examination years'], authority: 'South African Department of Basic Education' }]
  },
  {
    id: 'ieb-nsc-past-papers', title: 'IEB NSC past papers and marking guidelines', summary: 'Official IEB examination papers and marking guidance where made publicly available.', type: 'Past Paper', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce'], subjectKeywords: [], topicKeywords: [], source: 'Independent Examinations Board', sourceUrl: 'https://www.ieb.co.za/assessment/high-schools/national-senior-certificate/nsc-past-papers', sourceDomain: 'ieb.co.za', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'IEB', curriculumVersion: 'Current IEB NSC', levelIds: ['grade-12'], authority: 'Independent Examinations Board' }]
  },
  {
    id: 'ieb-subject-assessment-guidelines', title: 'IEB Subject Assessment Guidelines', summary: 'Official IEB subject assessment guidance and qualification information for the National Senior Certificate.', type: 'Assessment Guidance', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce', 'Technology', 'Languages', 'Arts'], subjectKeywords: [], topicKeywords: [], source: 'Independent Examinations Board', sourceUrl: 'https://www.ieb.co.za/assessment/high-schools', sourceDomain: 'ieb.co.za', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'IEB', curriculumVersion: 'Current IEB NSC', levelIds: ['grade-10', 'grade-11', 'grade-12'], authority: 'Independent Examinations Board' }]
  },
  {
    id: 'dbe-mind-the-gap', title: 'Mind the Gap study guides', summary: 'Official DBE Grade 12 study guides that supplement CAPS teaching and NSC examination preparation in selected subjects.', type: 'Revision Guide', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce'], subjectKeywords: [], topicKeywords: [], source: 'South African Department of Basic Education', sourceUrl: 'https://www.education.gov.za/Curriculum/LearningandTeachingSupportMaterials(LTSM)/MindtheGapStudyGuides.aspx', sourceDomain: 'education.gov.za', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'NSC', curriculumVersion: 'Current CAPS and NSC support', levelIds: ['grade-12'], authority: 'South African Department of Basic Education' }]
  },
  {
    id: 'cambridge-igcse-subjects', title: 'Cambridge IGCSE syllabuses', summary: 'Official subject syllabuses, assessment objectives and component information for Cambridge IGCSE.', type: 'Curriculum / Syllabus', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce', 'Technology', 'Languages', 'Arts'], subjectKeywords: [], topicKeywords: [], source: 'Cambridge International Education', sourceUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/subjects/', sourceDomain: 'cambridgeinternational.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'IGCSE', curriculumVersion: 'Current published syllabuses', levelIds: ['year-1', 'year-2'], authority: 'Cambridge International Education' }]
  },
  {
    id: 'cambridge-a-level-subjects', title: 'Cambridge International AS & A Level syllabuses', summary: 'Official syllabuses and assessment component details for Cambridge International AS & A Level subjects.', type: 'Curriculum / Syllabus', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce', 'Technology', 'Languages', 'Arts'], subjectKeywords: [], topicKeywords: [], source: 'Cambridge International Education', sourceUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/subjects/', sourceDomain: 'cambridgeinternational.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'A_LEVEL', curriculumVersion: 'Current published syllabuses', levelIds: ['as-level', 'a-level'], authority: 'Cambridge International Education' }]
  },
  {
    id: 'cambridge-igcse-mathematics-0580', title: 'Cambridge IGCSE Mathematics (0580)', summary: 'Official public subject page with the current syllabus overview, assessment information and public specimen materials. Some teaching resources require a Cambridge school login.', type: 'Curriculum / Syllabus', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics'], subjectKeywords: ['mathematics'], topicKeywords: [], source: 'Cambridge International Education', sourceUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-mathematics-0580/', sourceDomain: 'cambridgeinternational.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Exact authority subject-page and syllabus-code review', isActive: true,
    alignments: [{ curriculumId: 'IGCSE', curriculumVersion: 'Current published syllabus', levelIds: ['year-1', 'year-2'], subjectIds: ['mathematics'], syllabusCode: '0580', authority: 'Cambridge International Education', matchConfidence: 'EXACT' }]
  },
  {
    id: 'cambridge-a-level-mathematics-9709', title: 'Cambridge International AS & A Level Mathematics (9709)', summary: 'Official public subject page with syllabus and assessment information. Restricted teacher materials remain behind Cambridge International Direct.', type: 'Curriculum / Syllabus', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics'], subjectKeywords: ['mathematics'], topicKeywords: [], source: 'Cambridge International Education', sourceUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/', sourceDomain: 'cambridgeinternational.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Exact authority subject-page and syllabus-code review', isActive: true,
    alignments: [{ curriculumId: 'A_LEVEL', curriculumVersion: 'Current published syllabus', levelIds: ['as-level', 'a-level'], subjectIds: ['mathematics'], syllabusCode: '9709', authority: 'Cambridge International Education', matchConfidence: 'EXACT' }]
  },
  {
    id: 'vce-study-designs', title: 'VCE study designs', summary: 'Official study designs defining units, Areas of Study, outcomes and assessment for each VCE study.', type: 'Curriculum / Syllabus', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce', 'Technology', 'Languages', 'Arts', 'Health'], subjectKeywords: [], topicKeywords: [], source: 'Victorian Curriculum and Assessment Authority', sourceUrl: 'https://www.vcaa.vic.edu.au/curriculum/vce-curriculum/vce-study-designs/vce-study-designs', sourceDomain: 'vcaa.vic.edu.au', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'VCE', curriculumVersion: '2026 study design list', levelIds: ['units-1-2', 'units-3-4'], authority: 'Victorian Curriculum and Assessment Authority' }]
  },
  {
    id: 'vce-exam-material', title: 'VCE examination specifications and past examinations', summary: 'Official specifications, past examinations, external assessment reports and sample material.', type: 'Past Paper', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce'], subjectKeywords: [], topicKeywords: [], source: 'Victorian Curriculum and Assessment Authority', sourceUrl: 'https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/examination-specifications-past-examinations-and-external-assessment-reports', sourceDomain: 'vcaa.vic.edu.au', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'VCE', curriculumVersion: 'Current VCE assessment program', levelIds: ['units-3-4'], authority: 'Victorian Curriculum and Assessment Authority' }]
  },
  {
    id: 'ib-myp-curriculum', title: 'IB Middle Years Programme curriculum', summary: 'Official public overview of the MYP framework, eight subject groups, interdisciplinary learning and the personal project.', type: 'Curriculum / Syllabus', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce', 'Technology', 'Languages', 'Arts', 'Health'], subjectKeywords: [], topicKeywords: [], source: 'International Baccalaureate Organization', sourceUrl: 'https://www.ibo.org/programmes/middle-years-programme/curriculum/', sourceDomain: 'ibo.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'IB_MYP', curriculumVersion: 'Current public MYP curriculum framework', levelIds: ['myp-1', 'myp-2', 'myp-3', 'myp-4', 'myp-5'], authority: 'International Baccalaureate Organization' }]
  },
  {
    id: 'ib-dp-curriculum', title: 'IB Diploma Programme curriculum', summary: 'Official public overview of DP subject groups, course choices and the programme structure.', type: 'Curriculum / Syllabus', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Commerce', 'Technology', 'Languages', 'Arts'], subjectKeywords: [], topicKeywords: [], source: 'International Baccalaureate Organization', sourceUrl: 'https://www.ibo.org/programmes/diploma-programme/curriculum/', sourceDomain: 'ibo.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'IB', curriculumVersion: 'Current public Diploma Programme curriculum', levelIds: ['sl', 'hl'], authority: 'International Baccalaureate Organization' }]
  },
  {
    id: 'ib-dp-core', title: 'IB Diploma Programme core', summary: 'Official overview of Theory of Knowledge, the Extended Essay, and Creativity, Activity, Service.', type: 'Assessment Guidance', trustStatus: 'OFFICIAL', difficulty: 'Core', canonicalAreas: ['English', 'Humanities', 'Science'], subjectKeywords: ['theory of knowledge', 'extended essay', 'cas'], topicKeywords: [], source: 'International Baccalaureate Organization', sourceUrl: 'https://www.ibo.org/programmes/diploma-programme/curriculum/dp-core/', sourceDomain: 'ibo.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Authority-domain and page-content review', isActive: true,
    alignments: [{ curriculumId: 'IB', curriculumVersion: 'Current public Diploma Programme curriculum', levelIds: ['sl', 'hl'], programme: 'Diploma Programme core', authority: 'International Baccalaureate Organization' }]
  },
  {
    id: 'openstax-mathematics', title: 'OpenStax mathematics library', summary: 'Open textbooks and worked explanations that can supplement curriculum-specific mathematics material.', type: 'Topic Explanation', trustStatus: 'GENERAL', difficulty: 'Foundation', canonicalAreas: ['Mathematics'], subjectKeywords: ['mathematics', 'mathematical methods', 'general mathematics', 'additional mathematics'], topicKeywords: ['algebra', 'functions', 'calculus', 'statistics'], source: 'OpenStax, Rice University', sourceUrl: 'https://openstax.org/subjects/math', sourceDomain: 'openstax.org', accessType: 'PUBLIC', language: 'English', lastCheckedAt: verified, verificationMethod: 'Provider and link review; not curriculum-mapped', isActive: true, alignments: []
  },
  {
    id: 'openstax-calculus-volume-1', title: 'Calculus Volume 1', summary: 'Peer-reviewed open textbook covering functions, limits, derivatives and introductory integration with worked examples and exercises.', type: 'Worked Examples', trustStatus: 'VERIFIED', difficulty: 'Core', canonicalAreas: ['Mathematics'], subjectKeywords: ['mathematics', 'mathematical methods'], topicKeywords: ['functions', 'calculus', 'differentiation', 'integration'], source: 'OpenStax, Rice University', sourceUrl: 'https://openstax.org/details/books/calculus-volume-1', sourceDomain: 'openstax.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Provider, level, subject and topic review against published curriculum metadata', isActive: true,
    alignments: [
      { curriculumId: 'VCE', curriculumVersion: 'Mathematics Study Design 2023-2027', levelIds: ['units-3-4'], subjectIds: ['mathematical-methods'], topicIds: ['calculus'], areaOfStudy: 'Calculus', matchConfidence: 'HIGH' },
      { curriculumId: 'A_LEVEL', curriculumVersion: 'Current published syllabus', levelIds: ['as-level', 'a-level'], subjectIds: ['mathematics'], topicIds: ['calculus'], syllabusCode: '9709', matchConfidence: 'HIGH' },
      { curriculumId: 'IB', curriculumVersion: 'Current public DP curriculum', levelIds: ['sl', 'hl'], subjectIds: ['mathematics-analysis-approaches', 'mathematics-applications-interpretation'], topicIds: ['calculus'], unit: 'Calculus', matchConfidence: 'HIGH' }
    ]
  },
  {
    id: 'openstax-biology-2e', title: 'Biology 2e', summary: 'Peer-reviewed open textbook with explanations, diagrams and exercises spanning cell biology, genetics, evolution, physiology and ecology.', type: 'Topic Explanation', trustStatus: 'VERIFIED', difficulty: 'Core', canonicalAreas: ['Science'], subjectKeywords: ['biology', 'life sciences', 'sciences'], topicKeywords: ['cells', 'genetics', 'evolution', 'ecology', 'physiology'], source: 'OpenStax, Rice University', sourceUrl: 'https://openstax.org/details/books/biology-2e', sourceDomain: 'openstax.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Provider, subject and level review; broad alignment only', isActive: true,
    alignments: [{ curriculumId: 'NSC', curriculumVersion: 'Current CAPS', subjectIds: ['life-sciences'], matchConfidence: 'HIGH' }, { curriculumId: 'IEB', curriculumVersion: 'Current IEB NSC', subjectIds: ['life-sciences'], matchConfidence: 'HIGH' }, { curriculumId: 'IGCSE', curriculumVersion: 'Current published syllabus', subjectIds: ['biology'], syllabusCode: '0610', matchConfidence: 'HIGH' }, { curriculumId: 'A_LEVEL', curriculumVersion: 'Current published syllabus', subjectIds: ['biology'], syllabusCode: '9700', matchConfidence: 'HIGH' }, { curriculumId: 'VCE', curriculumVersion: 'Current study design', subjectIds: ['biology'], matchConfidence: 'HIGH' }, { curriculumId: 'IB', curriculumVersion: 'Current public DP curriculum', subjectIds: ['biology'], matchConfidence: 'HIGH' }, { curriculumId: 'IB_MYP', curriculumVersion: 'Current public MYP framework', subjectIds: ['sciences'], matchConfidence: 'GENERAL' }]
  },
  {
    id: 'openstax-chemistry-2e', title: 'Chemistry 2e', summary: 'Peer-reviewed open chemistry textbook with worked examples and practice covering structure, bonding, reactions and quantitative chemistry.', type: 'Worked Examples', trustStatus: 'VERIFIED', difficulty: 'Core', canonicalAreas: ['Science'], subjectKeywords: ['chemistry', 'physical sciences', 'sciences'], topicKeywords: ['matter', 'structure', 'reactivity', 'reactions', 'stoichiometry'], source: 'OpenStax, Rice University', sourceUrl: 'https://openstax.org/details/books/chemistry-2e', sourceDomain: 'openstax.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Provider, subject and level review; broad alignment only', isActive: true,
    alignments: [{ curriculumId: 'NSC', curriculumVersion: 'Current CAPS', subjectIds: ['physical-sciences'], matchConfidence: 'HIGH' }, { curriculumId: 'IEB', curriculumVersion: 'Current IEB NSC', subjectIds: ['physical-sciences'], matchConfidence: 'HIGH' }, { curriculumId: 'IGCSE', curriculumVersion: 'Current published syllabus', subjectIds: ['chemistry'], syllabusCode: '0620', matchConfidence: 'HIGH' }, { curriculumId: 'A_LEVEL', curriculumVersion: 'Current published syllabus', subjectIds: ['chemistry'], syllabusCode: '9701', matchConfidence: 'HIGH' }, { curriculumId: 'VCE', curriculumVersion: 'Current study design', subjectIds: ['chemistry'], matchConfidence: 'HIGH' }, { curriculumId: 'IB', curriculumVersion: 'Current public DP curriculum', subjectIds: ['chemistry'], matchConfidence: 'HIGH' }, { curriculumId: 'IB_MYP', curriculumVersion: 'Current public MYP framework', subjectIds: ['sciences'], matchConfidence: 'GENERAL' }]
  },
  {
    id: 'openstax-physics', title: 'Physics', summary: 'OpenStax high-school physics text with explanations, worked examples and practice across motion, forces, energy, waves and electricity.', type: 'Worked Examples', trustStatus: 'VERIFIED', difficulty: 'Foundation', canonicalAreas: ['Science'], subjectKeywords: ['physics', 'physical sciences', 'sciences'], topicKeywords: ['motion', 'forces', 'energy', 'waves', 'electricity'], source: 'OpenStax, Rice University', sourceUrl: 'https://openstax.org/details/books/physics', sourceDomain: 'openstax.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Provider, subject and level review; broad alignment only', isActive: true,
    alignments: [{ curriculumId: 'NSC', curriculumVersion: 'Current CAPS', subjectIds: ['physical-sciences'], matchConfidence: 'HIGH' }, { curriculumId: 'IEB', curriculumVersion: 'Current IEB NSC', subjectIds: ['physical-sciences'], matchConfidence: 'HIGH' }, { curriculumId: 'IGCSE', curriculumVersion: 'Current published syllabus', subjectIds: ['physics'], syllabusCode: '0625', matchConfidence: 'HIGH' }, { curriculumId: 'A_LEVEL', curriculumVersion: 'Current published syllabus', subjectIds: ['physics'], syllabusCode: '9702', matchConfidence: 'HIGH' }, { curriculumId: 'VCE', curriculumVersion: 'Current study design', subjectIds: ['physics'], matchConfidence: 'HIGH' }, { curriculumId: 'IB', curriculumVersion: 'Current public DP curriculum', subjectIds: ['physics'], matchConfidence: 'HIGH' }, { curriculumId: 'IB_MYP', curriculumVersion: 'Current public MYP framework', subjectIds: ['sciences'], matchConfidence: 'GENERAL' }]
  },
  {
    id: 'khan-academy-grammar', title: 'Grammar', summary: 'Free grammar lessons and practice covering usage, syntax and punctuation; supplementary rather than curriculum-authoritative.', type: 'Practice Questions', trustStatus: 'GENERAL', difficulty: 'Foundation', canonicalAreas: ['English', 'Languages'], subjectKeywords: ['english', 'language', 'language and literature'], topicKeywords: ['writing', 'grammar'], source: 'Khan Academy', sourceUrl: 'https://www.khanacademy.org/humanities/grammar', sourceDomain: 'khanacademy.org', accessType: 'PUBLIC', language: 'English', lastCheckedAt: verified, verificationMethod: 'Provider and public-access review; not curriculum-mapped', isActive: true, alignments: []
  },
  {
    id: 'khan-academy-economics', title: 'Economics', summary: 'Free microeconomics and macroeconomics explanations and practice; terminology may differ from a learner’s official syllabus.', type: 'Topic Explanation', trustStatus: 'GENERAL', difficulty: 'Foundation', canonicalAreas: ['Commerce', 'Humanities'], subjectKeywords: ['economics'], topicKeywords: ['microeconomics', 'macroeconomics'], source: 'Khan Academy', sourceUrl: 'https://www.khanacademy.org/economics-finance-domain', sourceDomain: 'khanacademy.org', accessType: 'PUBLIC', language: 'English', lastCheckedAt: verified, verificationMethod: 'Provider and public-access review; not curriculum-mapped', isActive: true, alignments: []
  },
  {
    id: 'openstax-principles-economics-3e', title: 'Principles of Economics 3e', summary: 'Rigorously reviewed open textbook covering introductory microeconomics and macroeconomics with examples, diagrams and end-of-chapter practice.', type: 'Study Notes', trustStatus: 'VERIFIED', difficulty: 'Core', canonicalAreas: ['Commerce', 'Humanities'], subjectKeywords: ['economics'], topicKeywords: ['microeconomics', 'macroeconomics', 'markets', 'trade'], source: 'OpenStax, Rice University', sourceUrl: 'https://openstax.org/details/books/principles-economics-3e', sourceDomain: 'openstax.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Provider, review process, public access and subject-scope review; not curriculum-authoritative', isActive: true,
    alignments: [{ curriculumId: 'IGCSE', curriculumVersion: 'Current published syllabus', subjectIds: ['economics'], syllabusCode: '0455', matchConfidence: 'GENERAL' }, { curriculumId: 'A_LEVEL', curriculumVersion: 'Current published syllabus', subjectIds: ['economics'], syllabusCode: '9708', matchConfidence: 'GENERAL' }, { curriculumId: 'IB', curriculumVersion: 'Current public DP curriculum', subjectIds: ['economics'], matchConfidence: 'GENERAL' }]
  },
  {
    id: 'openstax-financial-accounting', title: 'Principles of Accounting: Financial Accounting', summary: 'Rigorously reviewed open textbook covering financial accounting fundamentals, worked examples and applied exercises.', type: 'Worked Examples', trustStatus: 'VERIFIED', difficulty: 'Core', canonicalAreas: ['Commerce'], subjectKeywords: ['accounting'], topicKeywords: ['financial accounting', 'financial statements', 'transactions'], source: 'OpenStax, Rice University', sourceUrl: 'https://openstax.org/details/books/principles-financial-accounting', sourceDomain: 'openstax.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Provider, review process, public access and subject-scope review; not curriculum-authoritative', isActive: true, alignments: []
  },
  {
    id: 'openstax-principles-management', title: 'Principles of Management', summary: 'Rigorously reviewed open textbook covering planning, organising, leading, control, human resources and strategy.', type: 'Study Notes', trustStatus: 'VERIFIED', difficulty: 'Core', canonicalAreas: ['Commerce'], subjectKeywords: ['business management', 'business studies', 'management'], topicKeywords: ['planning', 'organising', 'leadership', 'strategy'], source: 'OpenStax, Rice University', sourceUrl: 'https://openstax.org/details/books/principles-management', sourceDomain: 'openstax.org', accessType: 'PUBLIC', language: 'English', verifiedAt: verified, lastCheckedAt: verified, verificationMethod: 'Provider, review process, public access and subject-scope review; not curriculum-authoritative', isActive: true, alignments: []
  },
  {
    id: 'khan-academy-computer-science', title: 'Computer science theory', summary: 'Free lessons, articles and practice on algorithms, cryptography and information theory for learners with some programming background.', type: 'Interactive Resource', trustStatus: 'GENERAL', difficulty: 'Extension', canonicalAreas: ['Technology'], subjectKeywords: ['computer science', 'computing', 'digital solutions'], topicKeywords: ['algorithms', 'cryptography', 'information theory'], source: 'Khan Academy', sourceUrl: 'https://www.khanacademy.org/computing/computer-science', sourceDomain: 'khanacademy.org', accessType: 'PUBLIC', language: 'English', lastCheckedAt: verified, verificationMethod: 'Provider, public-access and page-content review; not curriculum-mapped', isActive: true, alignments: []
  },
  {
    id: 'khan-academy-world-history', title: 'World History', summary: 'Free structured course with readings, videos, activities and practice spanning early societies to globalisation.', type: 'Interactive Resource', trustStatus: 'GENERAL', difficulty: 'Core', canonicalAreas: ['Humanities'], subjectKeywords: ['history', 'individuals and societies'], topicKeywords: ['historical thinking', 'empires', 'industrialisation', 'global conflict'], source: 'Khan Academy and OER Project', sourceUrl: 'https://www.khanacademy.org/humanities/world-history', sourceDomain: 'khanacademy.org', accessType: 'PUBLIC', language: 'English', lastCheckedAt: verified, verificationMethod: 'Provider, public-access and page-content review; not curriculum-mapped', isActive: true, alignments: []
  }
]

const GENERATED_OFFICIAL_SUBJECT_RESOURCES: LearnerCurriculumResource[] = SUPPORTED_CURRICULA.flatMap((curriculum) => curriculum.subjects.flatMap((subject) => {
  if (!subject.sourceUrl || CORE_CURRICULUM_RESOURCES.some((resource) => resource.sourceUrl === subject.sourceUrl && resource.alignments.some((alignment) => alignment.curriculumId === curriculum.id && alignment.subjectIds?.includes(subject.id)))) return []
  const sourceDomain = new URL(subject.sourceUrl).hostname.replace(/^www\./, '')
  const isSubjectSpecificUrl = curriculum.subjects.filter((item) => item.sourceUrl === subject.sourceUrl).length === 1
  return [{
    id: `official-${curriculum.id.toLowerCase().replace('_', '-')}-${subject.id}`,
    title: `${curriculum.shortName} ${subject.title}${subject.syllabusCode ? ` (${subject.syllabusCode})` : ''} official curriculum`,
    summary: `Official ${curriculum.shortName} curriculum and assessment information for ${subject.title}.`,
    type: 'Curriculum / Syllabus' as const,
    trustStatus: 'OFFICIAL' as const,
    difficulty: 'Core' as const,
    canonicalAreas: [subject.canonicalArea],
    subjectKeywords: [subject.title.toLowerCase(), subject.id.replace(/-/g, ' ')],
    topicKeywords: [],
    source: curriculum.authority,
    sourceUrl: subject.sourceUrl,
    sourceDomain,
    accessType: 'PUBLIC' as const,
    language: 'English',
    verifiedAt: verified,
    lastCheckedAt: verified,
    verificationMethod: `Authority-owned ${isSubjectSpecificUrl ? 'subject' : 'programme'} URL from the reviewed curriculum registry`,
    isActive: true,
    alignments: [{ curriculumId: curriculum.id, curriculumVersion: curriculum.activeVersion, levelIds: curriculum.levels.map((level) => level.id), subjectIds: [subject.id], syllabusCode: subject.syllabusCode, authority: curriculum.authority, matchConfidence: isSubjectSpecificUrl ? 'EXACT' as const : 'GENERAL' as const }]
  }]
}))

export const CURRICULUM_RESOURCES: LearnerCurriculumResource[] = [...CORE_CURRICULUM_RESOURCES, ...GENERATED_OFFICIAL_SUBJECT_RESOURCES]

export interface ResourceSearchInput {
  text?: string
  scope?: 'ALL' | SupportedCurriculumId
  levelId?: string
  subjectId?: string
  subjectTitle?: string
  canonicalArea?: CanonicalSubjectArea
  topicId?: string
  officialOnly?: boolean
  type?: LearnerResourceType
  includeInactive?: boolean
}

function matchingAlignment(resource: LearnerCurriculumResource, input: ResourceSearchInput) {
  return resource.alignments.find((alignment) => (!input.scope || input.scope === 'ALL' || alignment.curriculumId === input.scope) &&
    (!alignment.levelIds?.length || !input.levelId || alignment.levelIds.includes(input.levelId)) &&
    (!alignment.subjectIds?.length || !input.subjectId || alignment.subjectIds.includes(input.subjectId)) &&
    (!alignment.topicIds?.length || Boolean(input.topicId && alignment.topicIds.includes(input.topicId))))
}

function matchesRequestedSubject(resource: LearnerCurriculumResource, input: ResourceSearchInput) {
  if (!input.subjectId && !input.subjectTitle) return true
  if (matchingAlignment(resource, input)) return true
  const terms = [input.subjectId?.replace(/-/g, ' '), input.subjectTitle].filter(Boolean).map((term) => term!.toLowerCase())
  const subjectText = [resource.title, ...resource.subjectKeywords].join(' ').toLowerCase()
  return terms.some((term) => subjectText.includes(term) || term.includes(subjectText))
}

function rankResource(resource: LearnerCurriculumResource, input: ResourceSearchInput) {
  const alignment = matchingAlignment(resource, input)
  if (input.scope && input.scope !== 'ALL' && !alignment) return -1
  const exactTopic = Boolean(input.topicId && alignment?.topicIds?.includes(input.topicId))
  const exactSubject = Boolean(input.subjectId && alignment?.subjectIds?.includes(input.subjectId))
  const exactLevel = Boolean(input.levelId && alignment?.levelIds?.includes(input.levelId))
  if (exactTopic) return 500
  if (exactSubject && exactLevel) return 400
  if (exactSubject) return 350
  if (resource.trustStatus === 'OFFICIAL' && alignment) return 300
  if (resource.trustStatus === 'VERIFIED') return 200
  return 100
}

export function searchCurriculumResources(input: ResourceSearchInput = {}) {
  const query = input.text?.trim().toLowerCase() || ''
  return CURRICULUM_RESOURCES.filter((resource) => (input.includeInactive || resource.isActive) &&
    (!input.officialOnly || resource.trustStatus === 'OFFICIAL') && (!input.type || resource.type === input.type) &&
    (!input.canonicalArea || resource.canonicalAreas.includes(input.canonicalArea)) && matchesRequestedSubject(resource, input) && rankResource(resource, input) >= 0 &&
    (!query || [resource.title, resource.summary, resource.source, resource.sourceDomain, ...resource.subjectKeywords, ...resource.topicKeywords].join(' ').toLowerCase().includes(query)))
    .sort((left, right) => rankResource(right, input) - rankResource(left, input) || left.title.localeCompare(right.title))
}

export function findCurriculumResources(input: { curriculumId: SupportedCurriculumId; levelId: string; subjectId: string; subjectTitle: string; canonicalArea: CanonicalSubjectArea; topicId?: string }) {
  const aligned = searchCurriculumResources({ scope: input.curriculumId, levelId: input.levelId, subjectId: input.subjectId, subjectTitle: input.subjectTitle, canonicalArea: input.canonicalArea, topicId: input.topicId })
  const normalizedTitle = input.subjectTitle.toLowerCase()
  const additional = CURRICULUM_RESOURCES.filter((resource) => resource.isActive && !resource.alignments.length && (resource.canonicalAreas.includes(input.canonicalArea) || resource.subjectKeywords.some((keyword) => normalizedTitle.includes(keyword))))
    .sort((left, right) => rankResource(right, {}) - rankResource(left, {}) || left.title.localeCompare(right.title))
  return { aligned, additional }
}

export function getResourceCoverage(curriculumId: SupportedCurriculumId, subjectId?: string, topicId?: string) {
  const resources = searchCurriculumResources({ scope: curriculumId, subjectId, topicId })
  const countByPurpose = (items: LearnerCurriculumResource[]) => ({
    official: items.filter((resource) => resource.trustStatus === 'OFFICIAL').length,
    learning: items.filter((resource) => ['Study Notes', 'Topic Explanation', 'Video', 'Interactive Resource'].includes(resource.type)).length,
    practice: items.filter((resource) => ['Worked Examples', 'Practice Questions'].includes(resource.type)).length,
    assessment: items.filter((resource) => ['Past Paper', 'Marking Guideline / Memorandum', 'Examiner Report', 'Specimen Paper', 'Formula / Data Sheet', 'Assessment Guidance', 'Revision Guide'].includes(resource.type)).length
  })
  const subject = subjectId ? getCurriculum(curriculumId).subjects.find((item) => item.id === subjectId) : undefined
  return {
    curriculumId,
    subjectId,
    topicId,
    total: resources.length,
    official: resources.filter((resource) => resource.trustStatus === 'OFFICIAL').length,
    verified: resources.filter((resource) => resource.trustStatus === 'VERIFIED').length,
    general: resources.filter((resource) => resource.trustStatus === 'GENERAL').length,
    inactive: CURRICULUM_RESOURCES.filter((resource) => !resource.isActive && resource.alignments.some((alignment) => alignment.curriculumId === curriculumId)).length,
    byPurpose: countByPurpose(resources),
    topics: subject?.topics.map((topic) => {
      const topicResources = searchCurriculumResources({ scope: curriculumId, subjectId, topicId: topic.id })
      return { topicId: topic.id, title: topic.title, total: topicResources.length, ...countByPurpose(topicResources) }
    }) || []
  }
}
