export type CourseMetadata = Record<string, unknown> & {
  courseCode: string
  courseName?: string
  university?: string
  semester?: string
  weekNumber?: number
  lectureNumber?: number
  tutorialNumber?: number
  assignmentNumber?: number
  documentType?: string
}

export interface CatalogDocument {
  documentId: string
  version: number
  fileHash: string
  fileName: string
  mimeType: string
  uploadedAt: string
  originalPath: string
  extractedTextPath: string
  metadataPath: string
  chunkIds: string[]
  metadata: CourseMetadata
  status: 'active' | 'archived'
}

export interface ChunkRecord {
  chunkId: string
  documentId: string
  courseCode?: string | null
  sourceFileName?: string | null
  version: number
  chunkIndex: number
  sectionTitle?: string
  pageNumber?: number
  text: string
  keywords: string[]
  relationships: string[]
  embeddingPath: string
  sourcePriority: 1 | 2 | 3 | 4 | 5
}

export interface CatalogStore {
  schemaVersion: number
  updatedAt: string
  activeCurriculumVersion: string
  documents: CatalogDocument[]
  chunks: ChunkRecord[]
}

export interface SearchResult {
  chunk: ChunkRecord
  score: number
}

export interface StudentProfile {
  studentId: string
  updatedAt: string
  completedTopics: string[]
  quizHistory: Array<{ quizId: string; score: number; completedAt: string }>
  strengths: string[]
  weaknesses: string[]
  commonMistakes: string[]
  preferredExplanationStyle?: string
  revisionHistory: string[]
  bookmarkedTopics: string[]
  studyGoals: string[]
  practiceHistory: string[]
  learningStreak: number
  confidenceRatings: Record<string, number>
  masteredConcepts: string[]
}
