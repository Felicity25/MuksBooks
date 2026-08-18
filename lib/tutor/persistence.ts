import crypto from 'node:crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { TutorCitation, TutorConversation, TutorLearningProfile, TutorMessage, TutorUsageRecord } from '@/lib/tutor/types'

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

function isMissingRelation(err: unknown) {
  const msg = String((err as any)?.message || '').toLowerCase()
  return msg.includes('does not exist') || msg.includes('42703') || msg.includes('42p01')
}

function toConversation(row: any): TutorConversation {
  return {
    id: row.id,
    user_id: row.user_id,
    unit_id: row.unit_id,
    active_unit_code: row.active_unit_code,
    title: row.title || 'Untitled conversation',
    mode: row.mode,
    source_scope: row.source_scope || {},
    summary: row.summary || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function toMessage(row: any): TutorMessage {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    user_id: row.user_id,
    role: row.role,
    content: row.content,
    citations: (row.citations || []) as TutorCitation[],
    metadata: (row.metadata || {}) as Record<string, unknown>,
    created_at: row.created_at
  }
}

export async function listTutorConversations(userId: string) {
  const client = createSupabaseServerClient()
  if (!client) return []

  const primary = await client
    .from('tutor_conversations')
    .select('id, user_id, unit_id, active_unit_code, title, mode, source_scope, summary, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (!primary.error && primary.data) return primary.data.map(toConversation)
  if (!isMissingRelation(primary.error)) return []

  const fallback = await client
    .from('tutor_conversations')
    .select('id, user_id, unit_id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (fallback.error || !fallback.data) return []
  return fallback.data.map((row: any) => toConversation({ ...row, active_unit_code: null, mode: null, source_scope: {}, summary: null }))
}

export async function createTutorConversation(input: {
  userId: string
  title?: string
  unitId?: string | null
  activeUnitCode?: string | null
  mode?: string | null
}) {
  const client = createSupabaseServerClient()
  if (!client) return null

  const conversationId = id('conv')

  const primary = await client
    .from('tutor_conversations')
    .insert({
      id: conversationId,
      user_id: input.userId,
      title: input.title || 'New conversation',
      unit_id: input.unitId ?? null,
      active_unit_code: input.activeUnitCode ?? null,
      mode: input.mode ?? null,
      source_scope: {}
    })
    .select('id, user_id, unit_id, active_unit_code, title, mode, source_scope, summary, created_at, updated_at')
    .single()

  if (!primary.error && primary.data) return toConversation(primary.data)
  if (!isMissingRelation(primary.error)) return null

  const fallback = await client
    .from('tutor_conversations')
    .insert({
      id: conversationId,
      user_id: input.userId,
      title: input.title || 'New conversation',
      unit_id: input.unitId ?? null
    })
    .select('id, user_id, unit_id, title, created_at, updated_at')
    .single()

  if (fallback.error || !fallback.data) return null
  return toConversation({ ...fallback.data, active_unit_code: null, mode: null, source_scope: {}, summary: null })
}

export async function updateTutorConversation(input: {
  userId: string
  conversationId: string
  title?: string
  activeUnitCode?: string | null
  mode?: string | null
  sourceScope?: Record<string, unknown>
  summary?: string | null
}) {
  const client = createSupabaseServerClient()
  if (!client) return null

  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.activeUnitCode !== undefined) patch.active_unit_code = input.activeUnitCode
  if (input.mode !== undefined) patch.mode = input.mode
  if (input.sourceScope !== undefined) patch.source_scope = input.sourceScope
  if (input.summary !== undefined) patch.summary = input.summary

  if (Object.keys(patch).length === 0) return null

  const primary = await client
    .from('tutor_conversations')
    .update(patch)
    .eq('id', input.conversationId)
    .eq('user_id', input.userId)
    .select('id, user_id, unit_id, active_unit_code, title, mode, source_scope, summary, created_at, updated_at')
    .maybeSingle()

  if (!primary.error && primary.data) return toConversation(primary.data)
  if (!isMissingRelation(primary.error)) return null

  const fallbackPatch: Record<string, unknown> = {}
  if (input.title !== undefined) fallbackPatch.title = input.title
  if (Object.keys(fallbackPatch).length === 0) {
    const current = await client
      .from('tutor_conversations')
      .select('id, user_id, unit_id, title, created_at, updated_at')
      .eq('id', input.conversationId)
      .eq('user_id', input.userId)
      .maybeSingle()
    if (current.error || !current.data) return null
    return toConversation({ ...current.data, active_unit_code: null, mode: null, source_scope: {}, summary: null })
  }

  const fallback = await client
    .from('tutor_conversations')
    .update(fallbackPatch)
    .eq('id', input.conversationId)
    .eq('user_id', input.userId)
    .select('id, user_id, unit_id, title, created_at, updated_at')
    .maybeSingle()

  if (fallback.error || !fallback.data) return null
  return toConversation({ ...fallback.data, active_unit_code: null, mode: null, source_scope: {}, summary: null })
}

export async function deleteTutorConversation(userId: string, conversationId: string) {
  const client = createSupabaseServerClient()
  if (!client) return false

  const { error } = await client
    .from('tutor_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId)

  return !error
}

export async function listTutorMessages(userId: string, conversationId: string) {
  const client = createSupabaseServerClient()
  if (!client) return []

  const primary = await client
    .from('tutor_messages')
    .select('id, conversation_id, user_id, role, content, citations, metadata, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(300)

  if (!primary.error && primary.data) return primary.data.map(toMessage)
  if (!isMissingRelation(primary.error)) return []

  const fallback = await client
    .from('tutor_messages')
    .select('id, conversation_id, user_id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(300)

  if (fallback.error || !fallback.data) return []
  return fallback.data.map((row: any) => toMessage({ ...row, citations: [], metadata: {} }))
}

export async function createTutorMessage(input: {
  userId: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  citations?: TutorCitation[]
  metadata?: Record<string, unknown>
}) {
  const client = createSupabaseServerClient()
  if (!client) return null

  const messageId = id('msg')

  const primary = await client
    .from('tutor_messages')
    .insert({
      id: messageId,
      conversation_id: input.conversationId,
      user_id: input.userId,
      role: input.role,
      content: input.content,
      citations: input.citations || [],
      metadata: input.metadata || {}
    })
    .select('id, conversation_id, user_id, role, content, citations, metadata, created_at')
    .single()

  let data = primary.data as any
  if (primary.error) {
    if (!isMissingRelation(primary.error)) return null
    const fallback = await client
      .from('tutor_messages')
      .insert({
        id: messageId,
        conversation_id: input.conversationId,
        user_id: input.userId,
        role: input.role,
        content: input.content
      })
      .select('id, conversation_id, user_id, role, content, created_at')
      .single()
    if (fallback.error || !fallback.data) return null
    data = { ...fallback.data, citations: [], metadata: {} }
  }

  await client
    .from('tutor_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.conversationId)
    .eq('user_id', input.userId)

  return toMessage(data)
}

export async function getLearningProfile(userId: string): Promise<TutorLearningProfile> {
  const client = createSupabaseServerClient()
  const defaults: TutorLearningProfile = {
    user_id: userId,
    preferred_depth: 'balanced',
    hint_style: 'progressive',
    confidence_r: 0.5,
    recent_topics: [],
    repeated_misconceptions: [],
    successful_approaches: [],
    struggling_approaches: [],
    practice_signals: [],
    preferences: {},
    updated_at: new Date().toISOString()
  }

  if (!client) return defaults

  const { data, error } = await client
    .from('tutor_learning_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return defaults

  return {
    user_id: userId,
    preferred_depth: (data.preferred_depth || 'balanced') as TutorLearningProfile['preferred_depth'],
    hint_style: (data.hint_style || 'progressive') as TutorLearningProfile['hint_style'],
    confidence_r: Number(data.confidence_r || 0.5),
    recent_topics: Array.isArray(data.recent_topics) ? data.recent_topics : [],
    repeated_misconceptions: Array.isArray(data.repeated_misconceptions) ? data.repeated_misconceptions : [],
    successful_approaches: Array.isArray(data.successful_approaches) ? data.successful_approaches : [],
    struggling_approaches: Array.isArray(data.struggling_approaches) ? data.struggling_approaches : [],
    practice_signals: Array.isArray(data.practice_signals) ? data.practice_signals : [],
    preferences: (data.preferences || {}) as Record<string, unknown>,
    updated_at: data.updated_at || defaults.updated_at
  }
}

export async function upsertLearningProfile(userId: string, patch: Partial<TutorLearningProfile>) {
  const client = createSupabaseServerClient()
  if (!client) return null

  const current = await getLearningProfile(userId)
  const next = {
    user_id: userId,
    preferred_depth: patch.preferred_depth ?? current.preferred_depth,
    hint_style: patch.hint_style ?? current.hint_style,
    confidence_r: Math.max(0, Math.min(1, Number(patch.confidence_r ?? current.confidence_r))),
    recent_topics: patch.recent_topics ?? current.recent_topics,
    repeated_misconceptions: patch.repeated_misconceptions ?? current.repeated_misconceptions,
    successful_approaches: patch.successful_approaches ?? current.successful_approaches,
    struggling_approaches: patch.struggling_approaches ?? current.struggling_approaches,
    practice_signals: patch.practice_signals ?? current.practice_signals,
    preferences: patch.preferences ?? current.preferences,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await client
    .from('tutor_learning_profiles')
    .upsert(next, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (error || !data) return null
  return getLearningProfile(userId)
}

export async function resetLearningProfile(userId: string) {
  const client = createSupabaseServerClient()
  if (!client) return false
  const { error } = await client.from('tutor_learning_profiles').delete().eq('user_id', userId)
  return !error
}

export async function recordTutorUsage(input: {
  userId: string
  conversationId?: string
  usage?: TutorUsageRecord
  route: string
}) {
  if (!input.usage) return
  const client = createSupabaseServerClient()
  if (!client) return

  const { error } = await client.from('tutor_usage_events').insert({
    id: id('usage'),
    user_id: input.userId,
    conversation_id: input.conversationId ?? null,
    provider: input.usage.provider,
    model: input.usage.model,
    input_tokens: input.usage.inputTokens ?? null,
    output_tokens: input.usage.outputTokens ?? null,
    cost_microusd: input.usage.costMicrousd ?? null,
    route: input.route
  })

  if (error && !isMissingRelation(error)) {
    console.error('[TutorUsage] Failed to record usage event:', error.message)
  }
}

export async function getTutorUsageSummary(userId: string, hours = 24) {
  const client = createSupabaseServerClient()
  if (!client) return { totalInputTokens: 0, totalOutputTokens: 0, totalCostMicrousd: 0 }

  const since = new Date(Date.now() - Math.max(1, hours) * 60 * 60 * 1000).toISOString()
  const { data, error } = await client
    .from('tutor_usage_events')
    .select('input_tokens, output_tokens, cost_microusd')
    .eq('user_id', userId)
    .gte('created_at', since)

  if (error || !data) {
    return { totalInputTokens: 0, totalOutputTokens: 0, totalCostMicrousd: 0 }
  }

  return data.reduce((acc, row: any) => {
    acc.totalInputTokens += Number(row.input_tokens || 0)
    acc.totalOutputTokens += Number(row.output_tokens || 0)
    acc.totalCostMicrousd += Number(row.cost_microusd || 0)
    return acc
  }, { totalInputTokens: 0, totalOutputTokens: 0, totalCostMicrousd: 0 })
}

export async function isTutorUsageLimitExceeded(userId: string) {
  const tokenLimit = Number(process.env.TUTOR_DAILY_TOKEN_LIMIT || 0)
  const costLimitMicrousd = Number(process.env.TUTOR_DAILY_COST_LIMIT_MICROUSD || 0)
  if (!Number.isFinite(tokenLimit) && !Number.isFinite(costLimitMicrousd)) return false
  if (tokenLimit <= 0 && costLimitMicrousd <= 0) return false

  const summary = await getTutorUsageSummary(userId, 24)
  const totalTokens = summary.totalInputTokens + summary.totalOutputTokens

  if (tokenLimit > 0 && totalTokens >= tokenLimit) return true
  if (costLimitMicrousd > 0 && summary.totalCostMicrousd >= costLimitMicrousd) return true
  return false
}

export async function saveProviderCredential(input: {
  userId: string
  provider: 'openai' | 'anthropic'
  encryptedApiKey: string
  encryptionIv: string
  encryptionTag: string
  label?: string
}) {
  const client = createSupabaseServerClient()
  if (!client) return false

  const { error } = await client
    .from('tutor_provider_credentials')
    .upsert({
      id: id('cred'),
      user_id: input.userId,
      provider: input.provider,
      label: input.label || 'default',
      encrypted_api_key: input.encryptedApiKey,
      encryption_iv: input.encryptionIv,
      encryption_tag: input.encryptionTag,
      is_active: true
    }, { onConflict: 'user_id,provider,label' })

  return !error
}

export async function deleteProviderCredential(userId: string, provider: 'openai' | 'anthropic', label = 'default') {
  const client = createSupabaseServerClient()
  if (!client) return false
  const { error } = await client
    .from('tutor_provider_credentials')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('label', label)
  return !error
}

export async function listProviderCredentials(userId: string) {
  const client = createSupabaseServerClient()
  if (!client) return []

  const { data, error } = await client
    .from('tutor_provider_credentials')
    .select('provider, label, is_active, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error || !data) return []
  return data
}
