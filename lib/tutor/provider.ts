import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { appendLog } from '@/lib/logging'
import { decryptSecret } from '@/lib/tutor/crypto'
import type { TutorProviderConfig, TutorReplyPayload, TutorUsageRecord } from '@/lib/tutor/types'

type ProviderName = 'anthropic' | 'openai'

const DEFAULT_PROVIDER = (process.env.AI_PROVIDER || 'anthropic') as ProviderName

function resolveDefaultModel(provider: ProviderName) {
  return provider === 'openai'
    ? (process.env.OPENAI_MODEL || 'gpt-4o-mini')
    : (process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620')
}

function buildNoProviderMessage(provider: ProviderName) {
  const missing = provider === 'openai'
    ? 'OPENAI_API_KEY'
    : 'ANTHROPIC_API_KEY'
  return `Missing server AI credentials. Please configure ${missing} or set up BYOK for your account.`
}

async function getStoredProviderKey(userId: string, provider: ProviderName): Promise<string | null> {
  const client = createSupabaseServerClient()
  if (!client) return null

  const { data, error } = await client
    .from('tutor_provider_credentials')
    .select('encrypted_api_key, encryption_iv, encryption_tag')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  try {
    return decryptSecret({
      encrypted: String((data as any).encrypted_api_key || ''),
      iv: String((data as any).encryption_iv || ''),
      authTag: String((data as any).encryption_tag || '')
    })
  } catch {
    return null
  }
}

export async function resolveTutorProvider(userId?: string): Promise<TutorProviderConfig & { apiKey?: string }> {
  const provider = DEFAULT_PROVIDER
  const defaultOpenAIKey = process.env.OPENAI_API_KEY || ''
  const defaultAnthropicKey = process.env.ANTHROPIC_API_KEY || ''

  if (userId) {
    const byokKey = await getStoredProviderKey(userId, provider)
    if (byokKey) {
      return {
        provider,
        model: resolveDefaultModel(provider),
        byok: true,
        apiKey: byokKey
      }
    }
  }

  if (provider === 'openai' && defaultOpenAIKey) {
    return { provider, model: resolveDefaultModel(provider), byok: false, apiKey: defaultOpenAIKey }
  }

  if (provider === 'anthropic' && defaultAnthropicKey) {
    return { provider, model: resolveDefaultModel(provider), byok: false, apiKey: defaultAnthropicKey }
  }

  // Fallback to openai if default provider has no key.
  if (defaultOpenAIKey) {
    return { provider: 'openai', model: resolveDefaultModel('openai'), byok: false, apiKey: defaultOpenAIKey }
  }
  if (defaultAnthropicKey) {
    return { provider: 'anthropic', model: resolveDefaultModel('anthropic'), byok: false, apiKey: defaultAnthropicKey }
  }

  return { provider, model: resolveDefaultModel(provider), byok: false }
}

export async function generateTutorReply(input: {
  systemPrompt: string
  userPrompt: string
  userId?: string
}): Promise<TutorReplyPayload | null> {
  const resolved = await resolveTutorProvider(input.userId)
  await appendLog('retrievals', 'Tutor provider resolved (sync)', {
    provider: resolved.provider,
    model: resolved.model,
    byok: resolved.byok,
    hasApiKey: Boolean(resolved.apiKey)
  }).catch(() => {})
  if (!resolved.apiKey) {
    throw new Error(buildNoProviderMessage(resolved.provider))
  }

  if (resolved.provider === 'openai') {
    const openai = new OpenAI({ apiKey: resolved.apiKey })
    const completion = await openai.chat.completions.create({
      model: resolved.model,
      temperature: 0.2,
      max_tokens: 2200,
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt }
      ]
    })

    const usage: TutorUsageRecord = {
      provider: 'openai',
      model: resolved.model,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens
    }

    return {
      text: completion.choices?.[0]?.message?.content?.trim() || '',
      citations: [],
      provider: 'openai',
      model: resolved.model,
      usage
    }
  }

  const anthropic = new Anthropic({ apiKey: resolved.apiKey })
  const response = await anthropic.messages.create({
    model: resolved.model,
    max_tokens: 2200,
    temperature: 0.2,
    messages: [{ role: 'user', content: `${input.systemPrompt}\n\n${input.userPrompt}` }]
  })

  const text = response.content?.[0]?.type === 'text' ? response.content[0].text?.trim() || '' : ''
  const usage: TutorUsageRecord = {
    provider: 'anthropic',
    model: resolved.model,
    inputTokens: (response as any).usage?.input_tokens,
    outputTokens: (response as any).usage?.output_tokens
  }

  return {
    text,
    citations: [],
    provider: 'anthropic',
    model: resolved.model,
    usage
  }
}

export async function streamTutorReply(input: {
  systemPrompt: string
  userPrompt: string
  userId?: string
  onText: (chunk: string) => Promise<void> | void
}): Promise<{ provider: string; model: string; usage?: TutorUsageRecord; fullText: string }> {
  const resolved = await resolveTutorProvider(input.userId)
  await appendLog('retrievals', 'Tutor provider resolved (stream)', {
    provider: resolved.provider,
    model: resolved.model,
    byok: resolved.byok,
    hasApiKey: Boolean(resolved.apiKey)
  }).catch(() => {})
  if (!resolved.apiKey) {
    throw new Error(buildNoProviderMessage(resolved.provider))
  }

  if (resolved.provider === 'openai') {
    const openai = new OpenAI({ apiKey: resolved.apiKey })
    const stream = await openai.chat.completions.create({
      model: resolved.model,
      temperature: 0.2,
      max_tokens: 2200,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt }
      ]
    })

    let fullText = ''
    let usage: TutorUsageRecord | undefined
    for await (const part of stream) {
      const delta = part.choices?.[0]?.delta?.content || ''
      if (delta) {
        fullText += delta
        await input.onText(delta)
      }
      const streamUsage = (part as any).usage
      if (streamUsage) {
        usage = {
          provider: 'openai',
          model: resolved.model,
          inputTokens: streamUsage.prompt_tokens,
          outputTokens: streamUsage.completion_tokens
        }
      }
    }

    if (!fullText.trim()) {
      throw new Error(`The ${resolved.provider} provider returned an empty Tutor response.`)
    }

    return {
      provider: 'openai',
      model: resolved.model,
      fullText,
      usage
    }
  }

  // Anthropic fallback: generate once, then stream in small chunks to preserve progressive UX.
  const anthropic = new Anthropic({ apiKey: resolved.apiKey })
  const response = await anthropic.messages.create({
    model: resolved.model,
    max_tokens: 2200,
    temperature: 0.2,
    messages: [{ role: 'user', content: `${input.systemPrompt}\n\n${input.userPrompt}` }]
  })
  const text = response.content?.[0]?.type === 'text' ? response.content[0].text?.trim() || '' : ''

  if (!text) {
    throw new Error(`The ${resolved.provider} provider returned an empty Tutor response.`)
  }

  let cursor = 0
  const chunkSize = 180
  while (cursor < text.length) {
    const chunk = text.slice(cursor, cursor + chunkSize)
    cursor += chunkSize
    await input.onText(chunk)
  }

  return {
    provider: 'anthropic',
    model: resolved.model,
    fullText: text,
    usage: {
      provider: 'anthropic',
      model: resolved.model,
      inputTokens: (response as any).usage?.input_tokens,
      outputTokens: (response as any).usage?.output_tokens
    }
  }
}
