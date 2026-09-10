import type { LearnerProfile, LearnerSubject } from './learner/store.ts'
import { getCurriculum, getCurriculumSubject, type CanonicalSubjectArea } from './learner/curriculum-registry.ts'

export type AcademicContainerRef =
  | {
      academicMode: 'LEARNER'
      kind: 'SUBJECT'
      id: string
      label: string
      curriculumId: string
      curriculumSubjectCode?: string
      levelId?: string
      canonicalArea?: CanonicalSubjectArea
    }
  | {
      academicMode: 'UNIVERSITY'
      kind: 'UNIT'
      id: string
      label: string
      code: string
    }

export interface UniversityUnitLike {
  id: string
  code?: string | null
  course_code?: string | null
  name?: string | null
  course_name?: string | null
}

export function learnerSubjectContainer(profile: Pick<LearnerProfile, 'curriculum'>, subject: LearnerSubject): AcademicContainerRef {
  const curriculumId = subject.curriculumId || profile.curriculum
  const catalogueSubject = subject.curriculumSubjectCode
    ? getCurriculumSubject(curriculumId, subject.curriculumSubjectCode)
    : undefined
  return {
    academicMode: 'LEARNER',
    kind: 'SUBJECT',
    id: subject.id,
    label: subject.name,
    curriculumId,
    curriculumSubjectCode: subject.curriculumSubjectCode || undefined,
    levelId: subject.levelId || undefined,
    canonicalArea: catalogueSubject?.canonicalArea
  }
}

export function universityUnitContainer(unit: UniversityUnitLike): AcademicContainerRef {
  const code = String(unit.code || unit.course_code || '').trim()
  return {
    academicMode: 'UNIVERSITY',
    kind: 'UNIT',
    id: unit.id,
    code,
    label: String(unit.name || unit.course_name || code || 'Unit')
  }
}

export function activeLearnerSubjectContainers(profile: LearnerProfile): AcademicContainerRef[] {
  return profile.subjects
    .filter((subject) => subject.active !== false)
    .map((subject) => learnerSubjectContainer(profile, subject))
}

export function stableLearnerSubjectId(curriculumId: string, subjectCode: string | undefined, name: string) {
  const normalizedName = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const normalizedCode = String(subjectCode || 'manual').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${curriculumId.toLowerCase()}-${normalizedCode}-${normalizedName || 'subject'}`
}

export function resolveLearnerSubject(profile: LearnerProfile, subjectId: string) {
  return profile.subjects.find((subject) => subject.id === subjectId && subject.active !== false)
}

export function learnerSubjectCurriculum(profile: LearnerProfile, subject: LearnerSubject) {
  return getCurriculum(subject.curriculumId || profile.curriculum)
}