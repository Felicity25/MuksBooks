import type { ExtractedAssessmentProposal, ExtractedScheduleEntry, ScheduleExtractionResult } from './schedule-extractor'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 12 && value.every((item) => typeof item === 'string' && item.length <= 300)
}

export function validateAiSchedule(value: unknown): Pick<ScheduleExtractionResult, 'entries' | 'assessments'> | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (!Array.isArray(candidate.entries) || candidate.entries.length > 40) return null

  const entries: ExtractedScheduleEntry[] = []
  for (const raw of candidate.entries) {
    if (!raw || typeof raw !== 'object') return null
    const entry = raw as Record<string, unknown>
    const weekNumber = Number(entry.weekNumber)
    if (!Number.isInteger(weekNumber) || weekNumber < 0 || weekNumber > 30 || typeof entry.topic !== 'string' || !entry.topic.trim()) return null
    if (!isStringArray(entry.additionalTopics || []) || !isStringArray(entry.activities || []) || !isStringArray(entry.assessmentReferences || [])) return null
    entries.push({
      weekNumber,
      periodKind: 'week',
      periodLabel: typeof entry.periodLabel === 'string' ? entry.periodLabel : `Week ${weekNumber}`,
      topic: entry.topic.trim(),
      additionalTopics: entry.additionalTopics as string[],
      activities: entry.activities as string[],
      assessmentReferences: entry.assessmentReferences as string[],
      isBreak: Boolean(entry.isBreak),
      confidence: 0.72
    })
  }

  const assessments: ExtractedAssessmentProposal[] = []
  if (candidate.assessments !== undefined && !Array.isArray(candidate.assessments)) return null
  for (const raw of (candidate.assessments as unknown[] | undefined) || []) {
    if (!raw || typeof raw !== 'object') return null
    const assessment = raw as Record<string, unknown>
    if (typeof assessment.title !== 'string' || !assessment.title.trim()) return null
    const weighting = assessment.weighting === null || assessment.weighting === undefined ? null : Number(assessment.weighting)
    if (weighting !== null && (!Number.isFinite(weighting) || weighting < 0 || weighting > 100)) return null
    assessments.push({
      title: assessment.title.trim(),
      weighting,
      dueDateText: typeof assessment.dueDateText === 'string' ? assessment.dueDateText : null,
      sourceText: typeof assessment.sourceText === 'string' ? assessment.sourceText : assessment.title.trim()
    })
  }
  return { entries, assessments }
}

export async function extractScheduleWithAi(fileName: string, text: string) {
  const prompt = `Extract the teaching schedule and assessment summary from this document as JSON. Do not treat tutorials, quizzes, presentations, readings, or due dates as academic topics when they are activity/assessment columns. Support Week 0. Return {"entries":[{"weekNumber":0,"periodLabel":"Week 0","topic":"","additionalTopics":[],"activities":[],"assessmentReferences":[],"isBreak":false}],"assessments":[{"title":"","weighting":null,"dueDateText":null,"sourceText":""}]}. File: ${fileName}\n\n${text.slice(0, 30000)}`
  let raw: string | null = null

  if (process.env.ANTHROPIC_API_KEY && !/placeholder|your[_-]?key/i.test(process.env.ANTHROPIC_API_KEY)) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({ model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620', max_tokens: 3000, temperature: 0, messages: [{ role: 'user', content: prompt }] })
    raw = response.content.find((block) => block.type === 'text')?.text || null
  } else if (process.env.OPENAI_API_KEY && !/placeholder|your[_-]?key/i.test(process.env.OPENAI_API_KEY)) {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await client.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] })
    raw = response.choices[0]?.message?.content || null
  }

  if (!raw) return null
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) return null
  try {
    return validateAiSchedule(JSON.parse(jsonText))
  } catch {
    return null
  }
}