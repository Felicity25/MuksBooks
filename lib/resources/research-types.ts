export interface ResearchSource {
  name: string
  url: string
  sourceClass: 'Academic' | 'Professional' | 'Regulatory'
  validatedAt: string
}

export interface ResearchUploadEvidence {
  section: string
  text: string
  score: number
}

export interface DeepResearchBrief {
  canonicalTopic: string
  displayTopic: string
  unitCodes: string[]
  overview: string
  keyIdeas: string[]
  actuarialApplications: string[]
  studyQuestions: string[]
  sources: ResearchSource[]
  uploadEvidence: ResearchUploadEvidence[]
  generationMode: 'ai-synthesis' | 'evidence-only'
  researchedAt: string
  expiresAt: string
  inputFingerprint: string
  cached: boolean
}