export type LearnerLevel = 'HL' | 'SL'
export type LearnerProjectType = 'IA' | 'EE' | 'TOK' | 'CAS' | 'Mock' | 'Exam' | 'Oral'

export interface LearnerSubject {
  id: string
  name: string
  level: LearnerLevel
  teacher?: string
  targetGrade?: string
  predictedGrade?: string
  currentGrade?: string
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

export interface LearnerProfile {
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
  subjects: [
    { id: 'maths-hl', name: 'Mathematics: Analysis & Approaches', level: 'HL', teacher: 'Ms Lee', targetGrade: '6', predictedGrade: '6', currentGrade: '5', notes: 'Strong algebra and calculus; probability needs more attention.' },
    { id: 'economics-hl', name: 'Economics', level: 'HL', teacher: 'Mr Hassan', targetGrade: '6', predictedGrade: '6', currentGrade: '5', notes: 'Evaluation responses need more structure and evidence.' },
    { id: 'english-sl', name: 'English Language & Literature', level: 'SL', teacher: 'Mrs Clarke', targetGrade: '6', predictedGrade: '6', currentGrade: '6', notes: 'Strong analytical writing and oral confidence.' },
    { id: 'biology-sl', name: 'Biology', level: 'SL', teacher: 'Dr Smith', targetGrade: '5', predictedGrade: '5', currentGrade: '4', notes: 'Data interpretation is the biggest growth area.' }
  ],
  timetable: [
    { id: 'monday-maths', day: 'Monday', time: '09:00', subject: 'Mathematics: AA HL', teacher: 'Ms Lee', room: 'A12' },
    { id: 'tuesday-econ', day: 'Tuesday', time: '11:00', subject: 'Economics HL', teacher: 'Mr Hassan', room: 'B4' },
    { id: 'wednesday-english', day: 'Wednesday', time: '10:30', subject: 'English SL', teacher: 'Mrs Clarke', room: 'C1' },
    { id: 'thursday-bio', day: 'Thursday', time: '13:00', subject: 'Biology SL', teacher: 'Dr Smith', room: 'Lab 2' }
  ],
  assessments: [
    { id: 'mock-maths', title: 'Mathematics mock', subject: 'Mathematics: Analysis & Approaches', type: 'Mock', dueDate: '2026-10-03', dueTime: '09:00', status: 'upcoming', notes: 'Revision focused on calculus and probability.', weighting: '25%' },
    { id: 'econ-ia', title: 'Economics IA draft', subject: 'Economics', type: 'Internal Assessment', dueDate: '2026-10-14', dueTime: '17:00', status: 'upcoming', notes: 'Complete explanation and evidence.', weighting: '20%' },
    { id: 'bio-test', title: 'Biology test', subject: 'Biology', type: 'Test', dueDate: '2026-10-08', dueTime: '11:00', status: 'upcoming', notes: 'Set revision priority for cell respiration and genetics.', weighting: '10%' }
  ],
  projects: [
    { id: 'econ-ia-project', title: 'Economics IA', type: 'IA', dueDate: '2026-10-16', status: 'Drafting', milestone: 'First draft in progress', notes: 'Research question and method finalised.' },
    { id: 'ee-project', title: 'Extended Essay', type: 'EE', dueDate: '2026-11-20', status: 'Research plan approved', milestone: 'Review sources for methodology and evidence', notes: 'Supervisor is reviewing the question.' },
    { id: 'tok-project', title: 'TOK Exhibition', type: 'TOK', dueDate: '2026-10-05', status: 'Reflection stage', milestone: 'Prepare final exhibition and commentary', notes: 'Need one stronger real-world example.' }
  ],
  reports: [
    { id: 'report-1', title: 'Term 1 report', date: '2026-08-21', subject: 'Economics', level: 'HL', grade: 'A-', predictedGrade: 'A', teacherComments: 'Strong application and structured analysis; continue to strengthen evaluation language.', term: 'Term 1', year: '2026' },
    { id: 'report-2', title: 'Mock report', date: '2026-09-14', subject: 'Mathematics', level: 'HL', grade: '5', predictedGrade: '6', teacherComments: 'Strong understanding of algebra; need more confidence with calculus applications.', term: 'Mock', year: '2026' }
  ],
  applications: [
    { id: 'app-1', university: 'University of Melbourne', course: 'Actuarial Science', status: 'Researching' },
    { id: 'app-2', university: 'London School of Economics', course: 'Economics', status: 'Interested' }
  ],
  updatedAt: new Date().toISOString()
}

export function normalizeLearnerProfile(input: unknown): LearnerProfile {
  const base = DEFAULT_LEARNER_PROFILE
  const source = input && typeof input === 'object' ? input as Partial<LearnerProfile> : {}

  return {
    subjects: Array.isArray(source.subjects) ? source.subjects.map((subject) => ({
      id: String(subject?.id || Math.random().toString(36).slice(2)),
      name: String(subject?.name || 'New subject'),
      level: subject?.level === 'SL' ? 'SL' : 'HL',
      teacher: subject?.teacher ? String(subject.teacher) : '',
      targetGrade: subject?.targetGrade ? String(subject.targetGrade) : '',
      predictedGrade: subject?.predictedGrade ? String(subject.predictedGrade) : '',
      currentGrade: subject?.currentGrade ? String(subject.currentGrade) : '',
      notes: subject?.notes ? String(subject.notes) : ''
    })) : base.subjects,
    timetable: Array.isArray(source.timetable) ? source.timetable.map((entry) => ({
      id: String(entry?.id || Math.random().toString(36).slice(2)),
      day: String(entry?.day || 'Monday'),
      time: String(entry?.time || '09:00'),
      subject: String(entry?.subject || 'Subject'),
      teacher: String(entry?.teacher || 'TBC'),
      room: String(entry?.room || 'TBC')
    })) : base.timetable,
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
    })) : base.assessments,
    projects: Array.isArray(source.projects) ? source.projects.map((project) => ({
      id: String(project?.id || Math.random().toString(36).slice(2)),
      title: String(project?.title || 'Project'),
      type: (project?.type as LearnerProjectType) || 'IA',
      dueDate: String(project?.dueDate || new Date().toISOString().slice(0, 10)),
      status: String(project?.status || 'In progress'),
      milestone: String(project?.milestone || 'Next milestone'),
      notes: project?.notes ? String(project.notes) : ''
    })) : base.projects,
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
    })) : base.reports,
    applications: Array.isArray(source.applications) ? source.applications.map((application) => ({
      id: String(application?.id || Math.random().toString(36).slice(2)),
      university: String(application?.university || 'University'),
      course: String(application?.course || 'Course'),
      status: String(application?.status || 'Interested')
    })) : base.applications,
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
