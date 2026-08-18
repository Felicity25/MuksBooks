/** Extracts teaching periods from text without depending on a particular unit-guide template. */

export type TeachingPeriodKind = 'week' | 'module' | 'date' | 'range'

export interface ExtractedAssessmentProposal {
  title: string
  weighting: number | null
  dueDateText: string | null
  sourceText: string
}

export interface ExtractedScheduleEntry {
  weekNumber: number
  periodKind: TeachingPeriodKind
  periodLabel: string
  topic: string
  additionalTopics: string[]
  activities: string[]
  assessmentReferences: string[]
  isBreak: boolean
  confidence: number
}

export interface ScheduleExtractionResult {
  entries: ExtractedScheduleEntry[]
  detectedUnitCodes: string[]
  isLikelySchedule: boolean
  confidence: number
  assessments: ExtractedAssessmentProposal[]
  parser: 'structural' | 'heading' | 'none'
}

const WEEK_HEADING = /^(?:teaching\s+week|week|wk|module|topic|lecture)\s*0?(\d{1,2})\b\s*[:\-–—.]?\s*(.*)$/i
const PERIOD_HEADER = /^(?:teaching\s+)?(?:week|wk|period|module|date|lecture)s?$/i
const CONTENT_HEADER = /topic|content|concept|material|curriculum|learning|lecture/i
const ACTIVITY_HEADER = /activit|tutorial|workshop|presentation|reading|exercise|quiz/i
const ASSESSMENT_HEADER = /assessment|due|weight|submission|exam|assignment|quiz/i
const ASSESSMENT_TEXT = /\b(?:assessment|assignment|exam|quiz(?:zes)?|presentations?|submission)\b/i
const DATE_TEXT = /\b(?:\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/i
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
const CELL_SEPARATOR = /\s*(?:\||\t| {2,})\s*/

function cleanTopic(text: string) {
  return text.replace(/\s+/g, ' ').replace(/^[-:.\s]+|[-:.\s]+$/g, '').trim()
}

function detectNonTeaching(line: string): string | null {
  for (const { pattern, label } of NON_TEACHING_PATTERNS) {
    if (pattern.test(line)) return label
  }
  return null
}

function splitCells(line: string) {
  return line.split(CELL_SEPARATOR).map(cleanTopic).filter(Boolean)
}

function splitItems(value: string) {
  return value
    .split(/\s*(?:;|•|\u2022|\s[–—]\s)\s*/)
    .map(cleanTopic)
    .filter(Boolean)
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(cleanTopic).filter(Boolean)))
}

function parseAssessment(sourceText: string): ExtractedAssessmentProposal | null {
  if (!ASSESSMENT_TEXT.test(sourceText)) return null
  const weightingMatch = sourceText.match(/\b(100|\d{1,2}(?:\.\d+)?)\s*%/)
  const dueDateMatch = sourceText.match(DATE_TEXT)
  const title = cleanTopic(sourceText
    .replace(/\b(100|\d{1,2}(?:\.\d+)?)\s*%/g, '')
    .replace(DATE_TEXT, '')
    .replace(/\b(?:due|weight(?:ing)?|date)\b\s*[:\-]?/gi, ''))
  if (!title) return null
  return {
    title,
    weighting: weightingMatch ? Number(weightingMatch[1]) : null,
    dueDateText: dueDateMatch?.[0] || null,
    sourceText
  }
}

function makeEntry(weekNumber: number, content: string[], activities: string[], assessmentReferences: string[], confidence: number): ExtractedScheduleEntry {
  const topics = unique(content)
  const breakLabel = topics.map(detectNonTeaching).find(Boolean) || null
  return {
    weekNumber,
    periodKind: 'week',
    periodLabel: `Week ${weekNumber}`,
    topic: breakLabel || topics[0] || 'Topic to be confirmed',
    additionalTopics: breakLabel ? [] : topics.slice(1),
    activities: unique(activities),
    assessmentReferences: unique(assessmentReferences),
    isBreak: Boolean(breakLabel),
    confidence
  }
}

function parseStructuralRows(lines: string[]) {
  const entries: ExtractedScheduleEntry[] = []
  let header: string[] | null = null
  let structuralRows = 0

  for (const line of lines) {
    const cells = splitCells(line)
    if (cells.length > 1 && cells.some((cell) => PERIOD_HEADER.test(cell)) && cells.some((cell) => CONTENT_HEADER.test(cell))) {
      header = cells
      continue
    }

    const firstCell = cells[0] || ''
    const periodMatch = firstCell.match(/^(?:week|wk|module)?\s*0?(\d{1,2})(?:\s*[-–]\s*0?(\d{1,2}))?$/i)
      || (header ? null : line.match(/^0?(\d{1,2})(?:\s*[-–]\s*0?(\d{1,2}))?\s+(.+)$/i))
    if (!periodMatch) continue

    const weekNumber = Number(periodMatch[1])
    if (!Number.isFinite(weekNumber) || weekNumber < 0 || weekNumber > 30) continue

    const rowCells = cells.length > 1 ? cells.slice(1) : [periodMatch[3] || '']
    const content: string[] = []
    const activities: string[] = []
    const assessmentReferences: string[] = []

    rowCells.forEach((cell, index) => {
      const column = header?.[index + 1] || ''
      const items = splitItems(cell)
      if (ASSESSMENT_HEADER.test(column)) assessmentReferences.push(...items)
      else if (ACTIVITY_HEADER.test(column)) activities.push(...items)
      else if (CONTENT_HEADER.test(column) || !header) content.push(...items)
    })

    if (!content.length && !activities.length && !assessmentReferences.length) continue
    entries.push(makeEntry(weekNumber, content, activities, assessmentReferences, header ? 0.94 : 0.78))
    structuralRows += 1
  }

  return { entries, structuralRows }
}

/** Quick heuristic check on whether a document appears to contain a weekly teaching schedule. */
export function looksLikeUnitSchedule(fileName: string, text: string): boolean {
  const haystack = `${fileName}\n${text}`.toLowerCase()
  const keywordHits = SCHEDULE_KEYWORDS.filter((keyword) => haystack.includes(keyword)).length
  const weekHeadingHits = (text.match(/\b(?:teaching\s+week|week|module|topic)\s*0?\d{1,2}\b/gi) || []).length
  const numericPeriodRows = text.split(/\r?\n/).filter((line) => /^\s*0?\d{1,2}(?:\s*[-–]\s*0?\d{1,2})?(?:\s*\||\t|\s{2,})/.test(line)).length
  return keywordHits >= 1 || weekHeadingHits >= 3 || numericPeriodRows >= 3
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

  const structural = parseStructuralRows(lines)
  const entries: ExtractedScheduleEntry[] = [...structural.entries]
  const assessments = unique(lines.filter((line) => ASSESSMENT_TEXT.test(line) && (/%/.test(line) || DATE_TEXT.test(line))))
    .map(parseAssessment)
    .filter((assessment): assessment is ExtractedAssessmentProposal => assessment !== null)
  let current: ExtractedScheduleEntry | null = null

  for (const line of lines) {
    const headingMatch = line.match(WEEK_HEADING)
    const nonTeachingLabel = detectNonTeaching(line)

    if (headingMatch?.[1]) {
      const weekNumber = Number(headingMatch[1])
      if (!Number.isFinite(weekNumber) || weekNumber < 0 || weekNumber > 30) continue

      const inlineTopic = cleanTopic(headingMatch[2] || '')
      current = makeEntry(weekNumber, inlineTopic ? [inlineTopic] : [], [], [], inlineTopic ? 0.85 : 0.55)
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

    if (!current || structural.structuralRows >= 3) continue

    // A short bullet-like continuation line belongs to the current week as an additional topic.
    const bullet = cleanTopic(line.replace(/^[-•*]\s*/, ''))
    if (!bullet || bullet.length > 160) continue

    if (ASSESSMENT_TEXT.test(bullet)) {
      current.assessmentReferences.push(bullet)
    } else if (current.topic === 'Topic to be confirmed') {
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
    existing.activities.push(...entry.activities)
    existing.assessmentReferences.push(...entry.assessmentReferences)
    existing.confidence = Math.max(existing.confidence, entry.confidence)
  }

  const finalEntries = Array.from(merged.values()).sort((a, b) => a.weekNumber - b.weekNumber)
  const detectedUnitCodes = detectUnitCodes(fileName, text)
  finalEntries.forEach((entry) => {
    entry.additionalTopics = unique(entry.additionalTopics).filter((topic) => topic.toLowerCase() !== entry.topic.toLowerCase())
    entry.activities = unique(entry.activities)
    entry.assessmentReferences = unique(entry.assessmentReferences)
  })
  const isLikelySchedule = (looksLikeUnitSchedule(fileName, text) || structural.structuralRows >= 3) && finalEntries.length > 0
  const confidence = finalEntries.length === 0
    ? 0
    : finalEntries.reduce((sum, entry) => sum + entry.confidence, 0) / finalEntries.length

  return {
    entries: finalEntries,
    detectedUnitCodes,
    isLikelySchedule,
    confidence,
    assessments,
    parser: structural.structuralRows >= 3 ? 'structural' : finalEntries.length ? 'heading' : 'none'
  }
}
