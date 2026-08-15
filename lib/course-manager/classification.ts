export type ResourceType =
  | 'LECTURE'
  | 'LECTURE_SLIDES'
  | 'TUTORIAL'
  | 'TUTORIAL_SOLUTIONS'
  | 'WORKSHOP'
  | 'WORKSHOP_SOLUTIONS'
  | 'READING'
  | 'TEXTBOOK_CHAPTER'
  | 'FORMULA_SHEET'
  | 'ASSIGNMENT'
  | 'ASSIGNMENT_INSTRUCTIONS'
  | 'ASSIGNMENT_SOLUTIONS'
  | 'PAST_EXAM'
  | 'PRACTICE_EXAM'
  | 'EXAM_SOLUTIONS'
  | 'UNIT_GUIDE'
  | 'DATASET'
  | 'NOTES'
  | 'REFERENCE_MATERIAL'
  | 'OTHER'

export interface ClassificationResult {
  resourceType: ResourceType
  confidence: number
  week?: number
  topic?: string
  semester?: string
  academicYear?: number
}

function normalize(value?: string) {
  return (value || '').toLowerCase()
}

function detectWeek(value: string) {
  const weekMatch = value.match(/\bweek\s*0?(\d{1,2})\b/i)
  if (weekMatch?.[1]) return Number(weekMatch[1])

  const lectureMatch = value.match(/\b(?:lecture|lec|l)\s*0?(\d{1,2})\b/i)
  if (lectureMatch?.[1]) return Number(lectureMatch[1])

  const tutorialMatch = value.match(/\b(?:tutorial|tute|tut)\s*0?(\d{1,2})\b/i)
  if (tutorialMatch?.[1]) return Number(tutorialMatch[1])

  return undefined
}

function detectSemester(value: string) {
  const semester = value.match(/\b(?:semester\s*([12])|s([12]))\b/i)
  if (!semester) return undefined
  return `S${semester[1] || semester[2]}`
}

function detectAcademicYear(value: string) {
  const year = value.match(/\b(20\d{2})\b/)
  if (!year) return undefined
  return Number(year[1])
}

function detectTopic(value: string) {
  const separators = value.replace(/[_\-]/g, ' ').split(/\s{2,}|\|/)
  const cleaned = separators
    .map((part) => part.replace(/\.[a-z0-9]+$/i, '').trim())
    .find((part) => part.length > 6 && !/lecture|tutorial|week|exam|assignment|unit guide|slides?/i.test(part))
  return cleaned || undefined
}

export function classifyResource(input: {
  fileName: string
  relativePath?: string
  extractedText?: string
}): ClassificationResult {
  const file = normalize(input.fileName)
  const rel = normalize(input.relativePath)
  const text = normalize((input.extractedText || '').slice(0, 2000))
  const source = `${file} ${rel} ${text}`

  const rules: Array<{ type: ResourceType; confidence: number; test: RegExp }> = [
    { type: 'UNIT_GUIDE', confidence: 0.98, test: /unit\s*(guide|outline|handbook)/i },
    { type: 'FORMULA_SHEET', confidence: 0.95, test: /formula\s*(sheet|summary)|cheat\s*sheet/i },
    { type: 'PAST_EXAM', confidence: 0.95, test: /past\s*exam|final\s*exam|exam\s*20\d{2}/i },
    { type: 'PRACTICE_EXAM', confidence: 0.9, test: /practice\s*exam|mock\s*exam/i },
    { type: 'EXAM_SOLUTIONS', confidence: 0.95, test: /exam\s*(solution|answers?)/i },
    { type: 'ASSIGNMENT_SOLUTIONS', confidence: 0.93, test: /assignment\s*\d*\s*(solution|answers?)/i },
    { type: 'ASSIGNMENT_INSTRUCTIONS', confidence: 0.9, test: /assignment\s*\d*\s*(brief|instructions?|specification)/i },
    { type: 'ASSIGNMENT', confidence: 0.85, test: /assignment\s*\d*/i },
    { type: 'TUTORIAL_SOLUTIONS', confidence: 0.92, test: /(tutorial|tute|tut)\s*\d*\s*(solution|answers?)/i },
    { type: 'TUTORIAL', confidence: 0.82, test: /(tutorial|tute|tut)\s*\d*/i },
    { type: 'WORKSHOP_SOLUTIONS', confidence: 0.9, test: /workshop\s*\d*\s*(solution|answers?)/i },
    { type: 'WORKSHOP', confidence: 0.8, test: /workshop\s*\d*/i },
    { type: 'LECTURE_SLIDES', confidence: 0.9, test: /lecture\s*\d*.*(slides?|deck)|slides?/i },
    { type: 'LECTURE', confidence: 0.8, test: /(lecture|lec)\s*\d*/i },
    { type: 'TEXTBOOK_CHAPTER', confidence: 0.88, test: /textbook|chapter\s*\d+|isbn/i },
    { type: 'READING', confidence: 0.78, test: /reading|journal|paper|article/i },
    { type: 'DATASET', confidence: 0.9, test: /dataset|\.csv\b|\.xlsx\b|\.xls\b/i },
    { type: 'NOTES', confidence: 0.72, test: /notes?|handwritten/i },
    { type: 'REFERENCE_MATERIAL', confidence: 0.7, test: /reference|appendix|supplement/i }
  ]

  for (const rule of rules) {
    if (rule.test.test(source)) {
      return {
        resourceType: rule.type,
        confidence: rule.confidence,
        week: detectWeek(`${input.fileName} ${input.relativePath || ''}`),
        topic: detectTopic(input.fileName),
        semester: detectSemester(source),
        academicYear: detectAcademicYear(source)
      }
    }
  }

  return {
    resourceType: 'OTHER',
    confidence: 0.25,
    week: detectWeek(`${input.fileName} ${input.relativePath || ''}`),
    topic: detectTopic(input.fileName),
    semester: detectSemester(source),
    academicYear: detectAcademicYear(source)
  }
}
