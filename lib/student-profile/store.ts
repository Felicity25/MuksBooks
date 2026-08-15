import { promises as fs } from 'fs'
import path from 'path'
import { KNOWLEDGE_ROOT } from '@/lib/knowledge-base/catalog'
import type { StudentProfile } from '@/lib/knowledge-base/types'

const PROFILE_ROOT = path.join(KNOWLEDGE_ROOT, 'student_profiles')

function defaultProfile(studentId: string): StudentProfile {
  return {
    studentId,
    updatedAt: new Date().toISOString(),
    completedTopics: [],
    quizHistory: [],
    strengths: [],
    weaknesses: [],
    commonMistakes: [],
    preferredExplanationStyle: 'step-by-step',
    revisionHistory: [],
    bookmarkedTopics: [],
    studyGoals: [],
    practiceHistory: [],
    learningStreak: 0,
    confidenceRatings: {},
    masteredConcepts: []
  }
}

function profilePath(studentId: string) {
  return path.join(PROFILE_ROOT, `${studentId}.json`)
}

export async function loadStudentProfile(studentId: string) {
  await fs.mkdir(PROFILE_ROOT, { recursive: true })
  const file = profilePath(studentId)
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw) as StudentProfile
  } catch {
    const profile = defaultProfile(studentId)
    await fs.writeFile(file, JSON.stringify(profile, null, 2), 'utf8')
    return profile
  }
}

export async function saveStudentProfile(profile: StudentProfile) {
  await fs.mkdir(PROFILE_ROOT, { recursive: true })
  profile.updatedAt = new Date().toISOString()
  await fs.writeFile(profilePath(profile.studentId), JSON.stringify(profile, null, 2), 'utf8')
}
