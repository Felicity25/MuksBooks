export interface KnowledgeChunk {
  id: string
  fileId: string
  unit?: string
  topic?: string
  category: string
  source: string
  summary: string
  text: string
  page?: number
}

export function splitTextIntoChunks(text: string, maxChars = 400) {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const slice = text.slice(start, start + maxChars)
    const boundary = slice.lastIndexOf('.')
    if (boundary > 0 && start + boundary < text.length) {
      chunks.push(slice.slice(0, boundary + 1).trim())
      start += boundary + 1
    } else {
      chunks.push(slice.trim())
      start += maxChars
    }
  }

  return chunks.filter(Boolean)
}

export function buildKnowledgeSummary(fileName: string, category: string, unit?: string, extractedText?: string) {
  const base = `Source: ${fileName}. Category: ${category}. ${unit ? `Unit: ${unit}. ` : ''}`
  if (!extractedText) {
    return `${base}This file is stored as part of your study materials and can be used for unit-specific reasoning.`
  }
  const snippet = extractedText.slice(0, 400).replace(/\s+/g, ' ').trim()
  return `${base}Content summary: ${snippet}${extractedText.length > 400 ? '...' : ''}`
}

export function getRelevantChunks(chunks: KnowledgeChunk[], unit?: string, topic?: string) {
  if (!chunks?.length) return []
  if (!unit && !topic) {
    return chunks.slice(0, 5)
  }

  const normalized = (value = '') => value.toLowerCase()
  const target = `${unit || ''} ${topic || ''}`.toLowerCase().trim()
  const keywords = Array.from(new Set(target.split(/\W+/).filter(Boolean)))

  const scored = chunks.map((chunk) => {
    const haystack = [chunk.unit, chunk.topic, chunk.category, chunk.summary, chunk.text]
      .filter(Boolean)
      .map((field) => normalized(field as string))
      .join(' ')

    const score = keywords.reduce((acc, word) => acc + (haystack.includes(word) ? 1 : 0), 0)
    const lengthFactor = Math.min(1, (chunk.text?.length || 0) / 700)
    return { chunk, score: score + lengthFactor * 0.1 }
  })

  const ranked = scored.sort((a, b) => b.score - a.score)
  const matched = ranked.filter((item) => item.score > 0).map((item) => item.chunk).slice(0, 5)
  return matched.length ? matched : ranked.slice(0, 5).map((item) => item.chunk)
}
