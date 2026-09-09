export type LearnerLevel = 'HL' | 'SL'
export type LearnerProjectType = 'IA' | 'EE' | 'TOK' | 'CAS' | 'Mock' | 'Exam' | 'Oral'
export type LearnerCurriculumId = 'IB' | 'VCE' | 'HSC' | 'QCE' | 'A_LEVEL' | 'GCSE' | 'IGCSE' | 'AP' | 'NSC' | 'IEB' | 'CUSTOM'

export interface SchoolProfile {
  name: string
  country: string
  stateRegion?: string
}

export interface LearnerSubject {
  id: string
  name: string
  level?: LearnerLevel | string
  curriculumSubjectCode?: string
  teacher?: string
  targetGrade?: string
  predictedGrade?: string
  currentGrade?: string
  currentTopics?: string[]
  notes?: string
}

export interface TimetableEntry {
  id: string
  day: string
  time: string
  subject: string
  teacher: string
  room: string
}

export interface LearnerAssessment {
  id: string
  title: string
  subject: string
  type: string
  dueDate: string
  dueTime?: string
  status: 'upcoming' | 'completed'
  notes?: string
  weighting?: string
}

export interface MajorProject {
  id: string
  title: string
  type: LearnerProjectType
  dueDate: string
  status: string
  milestone: string
  notes?: string
}

export interface ReportEntry {
  id: string
  title: string
  date: string
  subject: string
  level: LearnerLevel
  grade: string
  predictedGrade: string
  teacherComments: string
  term: string
  year: string
}

export interface LearnerApplication {
  id: string
  university: string
  course: string
  status: string
}

export interface LearnerEnglishTest {
  id?: string
  test: 'IELTS' | 'TOEFL' | 'PTE' | 'CAMBRIDGE'
  overall?: number
  components?: Record<string, number>
  testDate?: string
  scoreScale?: string
  qualification?: string
  source?: 'MANUAL' | 'DOCUMENT_EXTRACTION'
  linkedUploadId?: string
  createdAt?: string
  updatedAt?: string
}

export interface LearnerAdmissionsTest {
  id?: string
  test: 'SAT' | 'ACT' | 'NBT_AQL' | 'NBT_MAT' | 'UCAT' | 'UCAT_ANZ' | 'GAMSAT' | 'LNAT' | 'TMUA' | 'ESAT' | 'ISAT'
  score?: number
  components?: Record<string, number>
  testDate?: string
  resultStatus?: 'BOOKED' | 'AWAITING_RESULT' | 'RESULT_RECEIVED'
  source?: 'MANUAL' | 'DOCUMENT_EXTRACTION'
  linkedUploadId?: string
  createdAt?: string
  updatedAt?: string
}

export interface UniversityPlanningProfile {
  citizenships: string[]
  residenceCountry: string
  preferredCountries: string[]
  studyAreas: string[]
  priorities: string[]
  predictedOverall?: number
  englishTests: LearnerEnglishTest[]
  admissionsTests: LearnerAdmissionsTest[]
}

export interface LearnerProfile {
  preferredName: string
  school: SchoolProfile | null
  curriculum: LearnerCurriculumId
  curriculumLabel: string
  yearLevel: string
  expectedGraduationYear: string
  primaryLanguage?: string
  languageOfInstruction?: string
  yearsStudiedInEnglish?: number
  previousQualifications?: string[]
  academicGoals: string[]
  universityPlanningPreferences: string[]
  universityPlanning: UniversityPlanningProfile
  learningPreferences: string[]
  onboardingCompleted: boolean
  subjects: LearnerSubject[]
  timetable: TimetableEntry[]
  assessments: LearnerAssessment[]
  projects: MajorProject[]
  reports: ReportEntry[]
  applications: LearnerApplication[]
  updatedAt: string
}

export const LEARNER_STORAGE_KEY = 'muksbooks:learner-profile:v1'

export const DEFAULT_LEARNER_PROFILE: LearnerProfile = {
  preferredName: '',
  school: null,
  curriculum: 'IB',
  curriculumLabel: 'IB',
  yearLevel: '',
  expectedGraduationYear: '',
  primaryLanguage: '',
  languageOfInstruction: '',
  previousQualifications: [],
  academicGoals: [],
  universityPlanningPreferences: [],
  universityPlanning: {
    citizenships: [],
    residenceCountry: '',
    preferredCountries: [],
    studyAreas: [],
    priorities: [],
    englishTests: [],
    admissionsTests: []
  },
  learningPreferences: [],
  onboardingCompleted: false,
  subjects: [],
  timetable: [],
  assessments: [],
  projects: [],
  reports: [],
  applications: [],
  updatedAt: new Date().toISOString()
}

export const LEARNER_CURRICULUM_OPTIONS: Array<{ value: LearnerCurriculumId; label: string }> = [
  { value: 'IB', label: 'International Baccalaureate (IB)' },
  { value: 'VCE', label: 'VCE' },
  { value: 'HSC', label: 'HSC' },
  { value: 'QCE', label: 'QCE' },
  { value: 'A_LEVEL', label: 'A-Levels' },
  { value: 'GCSE', label: 'GCSE' },
  { value: 'IGCSE', label: 'IGCSE' },
  { value: 'AP', label: 'AP' },
  { value: 'NSC', label: 'South African NSC' },
  { value: 'IEB', label: 'IEB' },
  { value: 'CUSTOM', label: 'Other / Custom' }
]

export function getSubjectLevelOptions(curriculum: LearnerCurriculumId): string[] {
  if (curriculum === 'IB') return ['HL', 'SL']
  if (curriculum === 'A_LEVEL') return ['AS', 'A2']
  if (curriculum === 'VCE' || curriculum === 'HSC' || curriculum === 'QCE' || curriculum === 'NSC' || curriculum === 'IEB') return ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4']
  return ['Standard', 'Higher', 'Advanced']
}

export function getProfileFieldsForMode(mode: 'LEARNER' | 'UNIVERSITY') {
  if (mode === 'LEARNER') {
    return [
      'preferredName',
      'school',
      'country',
      'curriculum',
      'yearLevel',
      'expectedGraduationYear',
      'subjects',
      'academicGoals',
      'universityPlanningPreferences'
    ]
  }

  return ['institution', 'degree', 'fieldOfStudy', 'major', 'yearLevel', 'units']
}

export function normalizeLearnerProfile(input: unknown): LearnerProfile {
  const source = input && typeof input === 'object' ? input as Partial<LearnerProfile> : {}
  const schoolRecord = source.school && typeof source.school === 'object' ? source.school : null
  const planning = source.universityPlanning && typeof source.universityPlanning === 'object' ? source.universityPlanning : DEFAULT_LEARNER_PROFILE.universityPlanning

  return {
    preferredName: source.preferredName ? String(source.preferredName) : '',
    school: schoolRecord
      ? {
          name: typeof schoolRecord.name === 'string' ? schoolRecord.name : '',
          country: typeof schoolRecord.country === 'string' ? schoolRecord.country : '',
          stateRegion: typeof schoolRecord.stateRegion === 'string' ? schoolRecord.stateRegion : ''
        }
      : null,
    curriculum: source.curriculum && typeof source.curriculum === 'string' && LEARNER_CURRICULUM_OPTIONS.some((option) => option.value === source.curriculum)
      ? source.curriculum as LearnerCurriculumId
      : DEFAULT_LEARNER_PROFILE.curriculum,
    curriculumLabel: source.curriculumLabel ? String(source.curriculumLabel) : (source.curriculum ? String(source.curriculum) : DEFAULT_LEARNER_PROFILE.curriculumLabel),
    yearLevel: source.yearLevel ? String(source.yearLevel) : '',
    expectedGraduationYear: source.expectedGraduationYear ? String(source.expectedGraduationYear) : '',
    primaryLanguage: typeof source.primaryLanguage === 'string' ? source.primaryLanguage : '',
    languageOfInstruction: typeof source.languageOfInstruction === 'string' ? source.languageOfInstruction : '',
    yearsStudiedInEnglish: typeof source.yearsStudiedInEnglish === 'number' ? source.yearsStudiedInEnglish : undefined,
    previousQualifications: Array.isArray(source.previousQualifications) ? source.previousQualifications.map(String).filter(Boolean) : [],
    academicGoals: Array.isArray(source.academicGoals) ? source.academicGoals.map((goal) => String(goal)).filter(Boolean) : [],
    universityPlanningPreferences: Array.isArray(source.universityPlanningPreferences) ? source.universityPlanningPreferences.map((item) => String(item)).filter(Boolean) : [],
    universityPlanning: {
      citizenships: Array.isArray(planning.citizenships) ? planning.citizenships.map(String).filter(Boolean) : [],
      residenceCountry: typeof planning.residenceCountry === 'string' ? planning.residenceCountry : '',
      preferredCountries: Array.isArray(planning.preferredCountries) ? planning.preferredCountries.map(String).filter(Boolean) : [],
      studyAreas: Array.isArray(planning.studyAreas) ? planning.studyAreas.map(String).filter(Boolean) : [],
      priorities: Array.isArray(planning.priorities) ? planning.priorities.map(String).filter(Boolean) : [],
      predictedOverall: typeof planning.predictedOverall === 'number' ? planning.predictedOverall : undefined,
      englishTests: Array.isArray(planning.englishTests) ? planning.englishTests.flatMap((entry) => {
        if (!entry || typeof entry !== 'object' || !['IELTS', 'TOEFL', 'PTE', 'CAMBRIDGE'].includes(String(entry.test))) return []
        return [{
          id: typeof entry.id === 'string' ? entry.id : undefined,
          test: entry.test as LearnerEnglishTest['test'],
          overall: typeof entry.overall === 'number' ? entry.overall : undefined,
          components: entry.components && typeof entry.components === 'object' ? entry.components : undefined,
          testDate: typeof entry.testDate === 'string' ? entry.testDate : undefined,
          scoreScale: typeof entry.scoreScale === 'string' ? entry.scoreScale : undefined,
          qualification: typeof entry.qualification === 'string' ? entry.qualification : undefined,
          source: ['MANUAL', 'DOCUMENT_EXTRACTION'].includes(String(entry.source)) ? entry.source as LearnerEnglishTest['source'] : undefined,
          linkedUploadId: typeof entry.linkedUploadId === 'string' ? entry.linkedUploadId : undefined,
          createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : undefined,
          updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : undefined
        }]
      }) : [],
      admissionsTests: Array.isArray(planning.admissionsTests) ? planning.admissionsTests.flatMap((entry) => {
        if (!entry || typeof entry !== 'object' || !['SAT', 'ACT', 'NBT_AQL', 'NBT_MAT', 'UCAT', 'UCAT_ANZ', 'GAMSAT', 'LNAT', 'TMUA', 'ESAT', 'ISAT'].includes(String(entry.test))) return []
        return [{
          id: typeof entry.id === 'string' ? entry.id : undefined,
          test: entry.test as LearnerAdmissionsTest['test'],
          score: typeof entry.score === 'number' ? entry.score : undefined,
          components: entry.components && typeof entry.components === 'object' ? entry.components : undefined,
          testDate: typeof entry.testDate === 'string' ? entry.testDate : undefined,
          resultStatus: ['BOOKED', 'AWAITING_RESULT', 'RESULT_RECEIVED'].includes(String(entry.resultStatus))
            ? entry.resultStatus as LearnerAdmissionsTest['resultStatus']
            : undefined,
          source: ['MANUAL', 'DOCUMENT_EXTRACTION'].includes(String(entry.source)) ? entry.source as LearnerAdmissionsTest['source'] : undefined,
          linkedUploadId: typeof entry.linkedUploadId === 'string' ? entry.linkedUploadId : undefined,
          createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : undefined,
          updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : undefined
        }]
      }) : []
    },
    learningPreferences: Array.isArray(source.learningPreferences) ? source.learningPreferences.map((item) => String(item)).filter(Boolean) : [],
    onboardingCompleted: Boolean(source.onboardingCompleted),
    subjects: Array.isArray(source.subjects) ? source.subjects.map((subject) => ({
      id: String(subject?.id || Math.random().toString(36).slice(2)),
      name: String(subject?.name || 'New subject'),
      level: subject?.level ? String(subject.level) : 'Standard',
      curriculumSubjectCode: subject?.curriculumSubjectCode ? String(subject.curriculumSubjectCode) : '',
      teacher: subject?.teacher ? String(subject.teacher) : '',
      targetGrade: subject?.targetGrade ? String(subject.targetGrade) : '',
      predictedGrade: subject?.predictedGrade ? String(subject.predictedGrade) : '',
      currentGrade: subject?.currentGrade ? String(subject.currentGrade) : '',
      currentTopics: Array.isArray(subject?.currentTopics) ? subject.currentTopics.map((topic) => String(topic)).filter(Boolean) : [],
      notes: subject?.notes ? String(subject.notes) : ''
    })) : [],
    timetable: Array.isArray(source.timetable) ? source.timetable.map((entry) => ({
      id: String(entry?.id || Math.random().toString(36).slice(2)),
      day: String(entry?.day || 'Monday'),
      time: String(entry?.time || '09:00'),
      subject: String(entry?.subject || 'Subject'),
      teacher: String(entry?.teacher || 'TBC'),
      room: String(entry?.room || 'TBC')
    })) : [],
    assessments: Array.isArray(source.assessments) ? source.assessments.map((assessment) => ({
      id: String(assessment?.id || Math.random().toString(36).slice(2)),
      title: String(assessment?.title || 'Assessment'),
      subject: String(assessment?.subject || 'Subject'),
      type: String(assessment?.type || 'Assessment'),
      dueDate: String(assessment?.dueDate || new Date().toISOString().slice(0, 10)),
      dueTime: assessment?.dueTime ? String(assessment.dueTime) : '',
      status: assessment?.status === 'completed' ? 'completed' : 'upcoming',
      notes: assessment?.notes ? String(assessment.notes) : '',
      weighting: assessment?.weighting ? String(assessment.weighting) : ''
    })) : [],
    projects: Array.isArray(source.projects) ? source.projects.map((project) => ({
      id: String(project?.id || Math.random().toString(36).slice(2)),
      title: String(project?.title || 'Project'),
      type: (project?.type as LearnerProjectType) || 'IA',
      dueDate: String(project?.dueDate || new Date().toISOString().slice(0, 10)),
      status: String(project?.status || 'In progress'),
      milestone: String(project?.milestone || 'Next milestone'),
      notes: project?.notes ? String(project.notes) : ''
    })) : [],
    reports: Array.isArray(source.reports) ? source.reports.map((report) => ({
      id: String(report?.id || Math.random().toString(36).slice(2)),
      title: String(report?.title || 'Report'),
      date: String(report?.date || new Date().toISOString().slice(0, 10)),
      subject: String(report?.subject || 'Subject'),
      level: report?.level === 'SL' ? 'SL' : 'HL',
      grade: String(report?.grade || 'A'),
      predictedGrade: String(report?.predictedGrade || 'A'),
      teacherComments: String(report?.teacherComments || 'No comments recorded.'),
      term: String(report?.term || 'Term 1'),
      year: String(report?.year || '2026')
    })) : [],
    applications: Array.isArray(source.applications) ? source.applications.map((application) => ({
      id: String(application?.id || Math.random().toString(36).slice(2)),
      university: String(application?.university || 'University'),
      course: String(application?.course || 'Course'),
      status: String(application?.status || 'Interested')
    })) : [],
    updatedAt: source.updatedAt ? String(source.updatedAt) : new Date().toISOString()
  }
}

export function getLearnerProfile(): LearnerProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_LEARNER_PROFILE
  }

  try {
    const value = window.localStorage.getItem(LEARNER_STORAGE_KEY)
    if (!value) return DEFAULT_LEARNER_PROFILE
    return normalizeLearnerProfile(JSON.parse(value))
  } catch {
    return DEFAULT_LEARNER_PROFILE
  }
}

export function saveLearnerProfile(profile: LearnerProfile): LearnerProfile {
  const normalized = normalizeLearnerProfile(profile)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(normalized))
  }
  return normalized
}

export function buildLearnerProfileFromSettings(settings: Partial<Record<string, unknown>>): LearnerProfile {
  const profile = getLearnerProfile()
  const nextSchool = settings.schoolName || settings.institution
    ? {
        name: String(settings.schoolName || settings.institution || profile.school?.name || ''),
        country: String(settings.schoolCountry || profile.school?.country || ''),
        stateRegion: profile.school?.stateRegion || ''
      }
    : profile.school

  return normalizeLearnerProfile({
    ...profile,
    preferredName: String(settings.name || profile.preferredName || ''),
    school: nextSchool,
    curriculum: typeof settings.curriculum === 'string' && LEARNER_CURRICULUM_OPTIONS.some((option) => option.value === settings.curriculum)
      ? settings.curriculum as LearnerCurriculumId
      : profile.curriculum,
    curriculumLabel: typeof settings.curriculum === 'string' ? String(settings.curriculum) : profile.curriculumLabel,
    yearLevel: typeof settings.schoolYear === 'string' ? String(settings.schoolYear) : profile.yearLevel,
    expectedGraduationYear: profile.expectedGraduationYear || '',
    onboardingCompleted: profile.onboardingCompleted || Boolean(nextSchool?.name || profile.subjects.length),
    updatedAt: new Date().toISOString()
  })
}
