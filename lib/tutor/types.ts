export type TutorRole = 'user' | 'assistant' | 'system'

export interface TutorCitation {
  id: string
  label: string
  unit?: string | null
  section?: string | null
  score?: number | null
}

export interface TutorConversation {
  id: string
  user_id: string
  unit_id?: string | null
  active_unit_code?: string | null
  title: string
  mode?: string | null
  source_scope?: Record<string, unknown> | null
  summary?: string | null
  created_at: string
  updated_at: string
}

export interface TutorMessage {
  id: string
  conversation_id: string
  user_id: string
  role: TutorRole
  content: string
  citations?: TutorCitation[]
  metadata?: Record<string, unknown>
  created_at: string
}

export interface TutorLearningProfile {
  user_id: string
  preferred_depth: 'brief' | 'balanced' | 'deep'
  hint_style: 'progressive' | 'direct' | 'socratic'
  confidence_r: number
  recent_topics: string[]
  repeated_misconceptions: string[]
  successful_approaches: string[]
  struggling_approaches: string[]
  practice_signals: Array<{ topic: string; score: number; lastSeenAt: string }>
  preferences: Record<string, unknown>
  updated_at: string
}

export interface TutorProviderConfig {
  provider: 'anthropic' | 'openai'
  model: string
  byok: boolean
}

export interface TutorUsageRecord {
  provider: string
  model: string
  inputTokens?: number
  outputTokens?: number
  costMicrousd?: number
}

export interface TutorReplyPayload {
  text: string
  citations: TutorCitation[]
  usage?: TutorUsageRecord
  provider: string
  model: string
}
