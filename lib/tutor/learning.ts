import type { TutorLearningProfile } from '@/lib/tutor/types'

const misconceptionPatterns: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /conditional expectation|e\[x\|y\]|e\(x\|y\)/i, label: 'conditional expectation framing' },
  { pattern: /independence|independent/i, label: 'independence assumptions' },
  { pattern: /markov|state transition/i, label: 'Markov transition structure' },
  { pattern: /glm|logit|poisson/i, label: 'GLM link and distribution mapping' }
]

function uniqueKeepRecent(values: string[], limit = 12) {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const v of values) {
    const key = v.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    ordered.push(key)
    if (ordered.length >= limit) break
  }
  return ordered
}

export function buildLearningHints(profile: TutorLearningProfile) {
  const hints: string[] = []

  hints.push(`Preferred explanation depth: ${profile.preferred_depth}.`)
  hints.push(`Hint style: ${profile.hint_style}.`)

  if (profile.repeated_misconceptions.length) {
    hints.push(`Repeated misconceptions to watch: ${profile.repeated_misconceptions.slice(0, 4).join(', ')}.`)
  }

  if (profile.recent_topics.length) {
    hints.push(`Recently studied topics: ${profile.recent_topics.slice(0, 6).join(', ')}.`)
  }

  if (profile.successful_approaches.length) {
    hints.push(`Approaches that worked well: ${profile.successful_approaches.slice(0, 4).join(', ')}.`)
  }

  if (profile.struggling_approaches.length) {
    hints.push(`Approaches that previously failed: ${profile.struggling_approaches.slice(0, 4).join(', ')}.`)
  }

  return hints.join(' ')
}

export function deriveProfilePatch(input: {
  profile: TutorLearningProfile
  userMessage: string
  assistantMessage: string
  topic?: string
}): Partial<TutorLearningProfile> {
  const nextTopics = uniqueKeepRecent([
    input.topic || '',
    ...input.profile.recent_topics,
    ...input.userMessage.split(/[,.!?]/).map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 3).slice(0, 3)
  ])

  const misconceptionHits = misconceptionPatterns
    .filter((candidate) => candidate.pattern.test(input.userMessage))
    .map((candidate) => candidate.label)

  const repeatedMisconceptions = uniqueKeepRecent([
    ...misconceptionHits,
    ...input.profile.repeated_misconceptions
  ])

  const asksForHint = /(hint|nudge|dont tell me|don't tell me|guide me)/i.test(input.userMessage)
  const asksForDepth = /(full derivation|prove|step by step|in detail)/i.test(input.userMessage)

  return {
    recent_topics: nextTopics,
    repeated_misconceptions: repeatedMisconceptions,
    hint_style: asksForHint ? 'progressive' : input.profile.hint_style,
    preferred_depth: asksForDepth ? 'deep' : input.profile.preferred_depth,
    successful_approaches: uniqueKeepRecent([
      ...(input.assistantMessage.length > 500 ? ['detailed walkthroughs'] : []),
      ...input.profile.successful_approaches
    ]),
    struggling_approaches: uniqueKeepRecent([
      ...(/confused|dont understand|don't understand|still lost/i.test(input.userMessage) ? ['direct explanation without checkpoints'] : []),
      ...input.profile.struggling_approaches
    ])
  }
}
