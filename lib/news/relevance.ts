import type { NewsCategory, NewsImportance } from './types'

const CATEGORY_FRAMING: Record<NewsCategory, string> = {
  REGULATION:
    'Possible actuarial implication: regulatory changes like this can affect assumptions, capital modelling, valuation bases or reporting requirements for actuaries.',
  SUPERANNUATION_PENSIONS:
    'Possible actuarial implication: this may affect retirement outcome projections, longevity/sequencing risk assumptions, or fund investment and insurance design.',
  CLIMATE_RISK:
    'Possible actuarial implication: this may affect catastrophe pricing, reinsurance capacity, reserving or capital for exposed insurers.',
  AI: 'Possible actuarial implication: this may affect underwriting, pricing models, model governance or regulatory expectations around explainability.',
  RISK_MANAGEMENT:
    'Possible actuarial implication: this may flow through to claims costs, pricing, or capital via the underlying risk transmission mechanism described above.',
  FINANCIAL_MARKETS:
    'Possible actuarial implication: this may affect liability discount rates, asset returns, or asset-liability matching for insurers and funds.',
  INSURANCE:
    'Possible actuarial implication: this may affect pricing, reserving, claims cost assumptions or capital for the relevant insurance line.',
  CAREERS: 'Relevant for actuarial students and early-career actuaries tracking the profession and job market.',
  RESEARCH: 'Relevant to actuarial theory and practice — see the key finding below for what the study actually shows.'
}

/** Grounded, template-based "why this matters" — never asserts a fabricated fact, always frames interpretation explicitly. */
export function generateWhyItMatters(category: NewsCategory, title: string, summary: string): string {
  return CATEGORY_FRAMING[category]
}

export function generateActuarialImpact(concepts: string[], practiceAreas: string[]): string | undefined {
  if (concepts.length === 0 && practiceAreas.length === 0) return undefined
  const parts: string[] = []
  if (concepts.length) parts.push(`Actuarial concepts touched: ${concepts.join(', ')}.`)
  if (practiceAreas.length) parts.push(`Practice areas affected: ${practiceAreas.join(', ')}.`)
  return parts.join(' ')
}

const METRIC_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'Combined ratio', regex: /combined ratio[^\d%]{0,10}(\d{1,3}(?:\.\d+)?%)/i },
  { label: 'Claims inflation', regex: /claims? inflation[^\d%+-]{0,10}([+-]?\d{1,3}(?:\.\d+)?%)/i },
  { label: 'Premium growth', regex: /premium (?:growth|increase)[^\d%+-]{0,10}([+-]?\d{1,3}(?:\.\d+)?%)/i },
  { label: 'Catastrophe losses', regex: /catastrophe losses?[^$]{0,10}(\$\s?\d[\d,.]*\s?(?:million|billion|m|bn)?)/i }
]

/** Extracts headline actuarial metrics explicitly present in the source text — never infers values that aren't stated. */
export function extractMetrics(title: string, summary: string): Array<{ label: string; value: string }> {
  const text = `${title} ${summary}`
  const found: Array<{ label: string; value: string }> = []
  for (const { label, regex } of METRIC_PATTERNS) {
    const match = text.match(regex)
    if (match?.[1]) found.push({ label, value: match[1].trim() })
  }
  return found
}

export function riskTransmissionChain(title: string, summary: string): string | undefined {
  const text = `${title} ${summary}`.toLowerCase()
  if (text.includes('shipping') && (text.includes('disrupt') || text.includes('red sea'))) {
    return 'Shipping disruption → higher transport costs → inflation pressure → claims cost increases → potential premium repricing.'
  }
  if (text.includes('interest rate') || text.includes('cash rate')) {
    return 'Rate change → shifts in liability discount rates and asset returns → potential change in funding/solvency positions.'
  }
  return undefined
}

const AI_ENRICHMENT_ENABLED = process.env.NEWS_AI_ENRICHMENT === 'true'

/**
 * Optional AI enrichment layer — disabled by default (opt-in via NEWS_AI_ENRICHMENT=true) so the pipeline
 * never depends on a working API key/network. When enabled, output is strictly grounded in the passed
 * title/summary and framed as MuksBooks' interpretation, matching the demo-mode-fallback pattern used by
 * the AI Tutor feature.
 */
export async function maybeEnrichWhyItMatters(category: NewsCategory, title: string, summary: string, fallback: string): Promise<string> {
  if (!AI_ENRICHMENT_ENABLED) return fallback
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return fallback
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620'
    const prompt = `You are writing a one or two sentence "Why this matters" note for an actuarial student reading a news item. Only use facts present in the text below — do not invent numbers, dates, or outcomes. If you are interpreting rather than stating a fact, say "Possible actuarial implication:".\n\nCategory: ${category}\nTitle: ${title}\nSummary: ${summary}\n\nWrite only the note, no preamble.`
    const response = await client.messages.create({
      model,
      max_tokens: 150,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    })
    const text = response.content?.[0]?.type === 'text' ? response.content[0].text?.trim() : ''
    return text || fallback
  } catch {
    return fallback
  }
}
