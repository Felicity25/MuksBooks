/**
 * Extracts a structured weekly schedule (week number -> topic(s)) from raw unit-guide text.
 * Handles varied headings (Week/Teaching Week/Module/Topic/Lecture), multi-topic weeks,
 * and non-teaching weeks (mid-semester break, SWOTVAC, public holidays).
 */

export interface ExtractedScheduleEntry {
  weekNumber: number
  topic: string
  additionalTopics: string[]
  isBreak: boolean
  confidence: number
}

export interface ScheduleExtractionResult {
  entries: ExtractedScheduleEntry[]
  detectedUnitCodes: string[]
  isLikelySchedule: boolean
  confidence: number
}

const WEEK_HEADING = /^(?:teaching\s+week|week|wk|module|topic|lecture)\s*0?(\d{1,2})\b\s*[:\-–—.]?\s*(.*)$/i
const NON_TEACHING_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /mid[\s-]*semester\s*break/i, label: 'Mid-semester break' },
  { pattern: /\bswotvac\b/i, label: 'SWOTVAC' },
  { pattern: /\bpublic\s+holiday\b/i, label: 'Public holiday' },
  { pattern: /\brevision\s*week\b/i, label: 'Revision week' },
  { pattern: /\bno\s*class(es)?\b/i, label: 'No class' }
]

const SCHEDULE_KEYWORDS = [
  'teaching week', 'weekly schedule', 'semester schedule', 'course schedule', 'learning schedule',
  'lecture schedule', 'unit guide', 'unit outline', 'teaching calendar', 'week 1', 'topic 1', 'module 1'
]

const UNIT_CODE_PATTERN = /\b[A-Z]{2,4}\d{4}\b/g

function cleanTopic(text: string) {
  return text.replace(/\s+/g, ' ').replace(/^[-:.\s]+|[-:.\s]+$/g, '').trim()
}

function detectNonTeaching(line: string): string | null {
  for (const { pattern, label } of NON_TEACHING_PATTERNS) {
    if (pattern.test(line)) return label
  }
  return null
}

/** Quick heuristic check on whether a document appears to contain a weekly teaching schedule. */
export function looksLikeUnitSchedule(fileName: string, text: string): boolean {
  const haystack = `${fileName}\n${text}`.toLowerCase()
  const keywordHits = SCHEDULE_KEYWORDS.filter((keyword) => haystack.includes(keyword)).length
  const weekHeadingHits = (text.match(/\b(?:teaching\s+week|week|module|topic)\s*0?\d{1,2}\b/gi) || []).length
  return keywordHits >= 1 || weekHeadingHits >= 3
}

/** Extract candidate unit codes (e.g. ETC3420) mentioned in a filename or document text. */
export function detectUnitCodes(fileName: string, text: string): string[] {
  const haystack = `${fileName}\n${text}`.toUpperCase()
  const matches = haystack.match(UNIT_CODE_PATTERN) || []
  return Array.from(new Set(matches))
}

/**
 * Parse weekly schedule entries from document text. Groups consecutive non-heading lines
 * under the most recent week heading as "additional topics" for that week, so that a week
 * with multiple bullet points (e.g. Martingales / Brownian Motion / Stochastic Processes)
 * stays one entry rather than being split into separate weeks.
 */
export function extractScheduleFromText(fileName: string, text: string): ScheduleExtractionResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const entries: ExtractedScheduleEntry[] = []
  let current: ExtractedScheduleEntry | null = null

  for (const line of lines) {
    const headingMatch = line.match(WEEK_HEADING)
    const nonTeachingLabel = detectNonTeaching(line)

    if (headingMatch?.[1]) {
      const weekNumber = Number(headingMatch[1])
      if (!Number.isFinite(weekNumber) || weekNumber < 1 || weekNumber > 30) continue

      const inlineTopic = cleanTopic(headingMatch[2] || '')
      current = {
        weekNumber,
        topic: inlineTopic || 'Topic to be confirmed',
        additionalTopics: [],
        isBreak: false,
        confidence: inlineTopic ? 0.85 : 0.55
      }
      entries.push(current)
      continue
    }

    if (nonTeachingLabel && !current) {
      continue
    }

    if (nonTeachingLabel) {
      // Non-teaching note attached to the current week context (e.g. "Week 8 — Mid-semester break")
      if (current && (current.topic === 'Topic to be confirmed' || current.topic === '')) {
        current.topic = nonTeachingLabel
        current.isBreak = true
        current.confidence = 0.8
      }
      continue
    }

    if (!current) continue

    // A short bullet-like continuation line belongs to the current week as an additional topic.
    const bullet = cleanTopic(line.replace(/^[-•*]\s*/, ''))
    if (!bullet || bullet.length > 160) continue

    if (current.topic === 'Topic to be confirmed') {
      current.topic = bullet
      current.confidence = Math.max(current.confidence, 0.7)
    } else if (bullet.toLowerCase() !== current.topic.toLowerCase() && current.additionalTopics.length < 6) {
      current.additionalTopics.push(bullet)
    }
  }

  // Merge duplicate week numbers (keep the richest entry, fold others into additionalTopics)
  const merged = new Map<number, ExtractedScheduleEntry>()
  for (const entry of entries) {
    const existing = merged.get(entry.weekNumber)
    if (!existing) {
      merged.set(entry.weekNumber, entry)
      continue
    }
    if (entry.topic && entry.topic !== 'Topic to be confirmed' && entry.topic.toLowerCase() !== existing.topic.toLowerCase()) {
      existing.additionalTopics.push(entry.topic)
    }
    existing.additionalTopics.push(...entry.additionalTopics)
    existing.confidence = Math.max(existing.confidence, entry.confidence)
  }

  const finalEntries = Array.from(merged.values()).sort((a, b) => a.weekNumber - b.weekNumber)
  const detectedUnitCodes = detectUnitCodes(fileName, text)
  const isLikelySchedule = looksLikeUnitSchedule(fileName, text) && finalEntries.length > 0
  const confidence = finalEntries.length === 0
    ? 0
    : finalEntries.reduce((sum, entry) => sum + entry.confidence, 0) / finalEntries.length

  return { entries: finalEntries, detectedUnitCodes, isLikelySchedule, confidence }
}
