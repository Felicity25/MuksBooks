export interface InterestArea {
  id: string
  name: string
  description: string
  studyAreas: string[]
  subjectSignals: string[]
}

export const INTEREST_AREAS: InterestArea[] = [
  { id: 'finance', name: 'Finance & Commerce', description: 'Explore quantitative, business and financial pathways.', studyAreas: ['Actuarial Science', 'Finance', 'Economics', 'Commerce', 'Accounting', 'Statistics', 'Mathematics', 'Data Science'], subjectSignals: ['Mathematics', 'Economics', 'Business', 'Accounting'] },
  { id: 'technology', name: 'Technology', description: 'Explore computing, software, data and digital systems.', studyAreas: ['Computer Science', 'Software Engineering', 'Information Technology', 'Cybersecurity', 'Data Science', 'Artificial Intelligence', 'Engineering'], subjectSignals: ['Mathematics', 'Computer Science', 'Physics'] },
  { id: 'health', name: 'Health', description: 'Explore clinical, biomedical and public-health pathways.', studyAreas: ['Medicine', 'Dentistry', 'Pharmacy', 'Nursing', 'Physiotherapy', 'Occupational Therapy', 'Biomedical Science', 'Public Health'], subjectSignals: ['Biology', 'Chemistry', 'Mathematics'] },
  { id: 'engineering', name: 'Engineering', description: 'Explore design, infrastructure and technical systems.', studyAreas: ['Engineering', 'Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Chemical Engineering', 'Mechatronics', 'Software Engineering', 'Biomedical Engineering', 'Mining Engineering'], subjectSignals: ['Mathematics', 'Physics', 'Chemistry'] },
  { id: 'society', name: 'Law, Policy & Society', description: 'Explore law, government, society and international affairs.', studyAreas: ['Law', 'Politics', 'International Relations', 'Economics', 'History', 'Philosophy', 'Psychology'], subjectSignals: ['English', 'History', 'Economics', 'Politics'] },
  { id: 'creative', name: 'Design & Creative Practice', description: 'Explore built environments, communication and creative practice.', studyAreas: ['Architecture', 'Design', 'Media', 'Arts', 'Humanities'], subjectSignals: ['Art', 'Design', 'English', 'Technology'] },
  { id: 'science', name: 'Science & Mathematics', description: 'Explore fundamental and applied scientific study.', studyAreas: ['Mathematics', 'Statistics', 'Physics', 'Chemistry', 'Biology', 'Environmental Science'], subjectSignals: ['Mathematics', 'Physics', 'Chemistry', 'Biology'] }
]

export function getRelevantStudyAreas(subjectNames: string[], interests: string[]) {
  const normalizedSignals = [...subjectNames, ...interests].map((value) => value.toLowerCase())
  return INTEREST_AREAS
    .map((area) => ({
      ...area,
      relevance: area.subjectSignals.reduce((score, signal) => score + (normalizedSignals.some((value) => value.includes(signal.toLowerCase())) ? 1 : 0), 0) +
        (normalizedSignals.some((value) => value.includes(area.name.toLowerCase()) || area.studyAreas.some((studyArea) => value.includes(studyArea.toLowerCase()))) ? 2 : 0)
    }))
    .sort((left, right) => right.relevance - left.relevance)
}
