export interface PlannerTaskRecord {
  id: string
  title: string
  description?: string | null
  course_code?: string | null
  task_type?: string | null
  planned_date?: string | null
  due_date?: string | null
  estimated_minutes?: number | null
  completed?: number | boolean
  generated_by?: string | null
  assessment_id?: string | null
}

export const UNTIMED_MARKER = '[muksbooks:untimed]'

export interface PlannerDraft {
  id: string
  title: string
  date: string
  startTime: string | null
  estimatedMinutes: number
  taskType: string
  courseCode: string | null
  assessmentId: string | null
  rationale: string
  conflict?: string | null
}

export const DEFAULT_TIMEZONE = 'Australia/Melbourne'

export function dateKey(value: Date | string, timezone = DEFAULT_TIMEZONE) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`
}

export function todayKey(timezone = DEFAULT_TIMEZONE) {
  return dateKey(new Date(), timezone)
}

export function shiftDateKey(key: string, days: number) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days, 12))
  return date.toISOString().slice(0, 10)
}

export function localDateTime(date: string, time: string | null, timezone = DEFAULT_TIMEZONE) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = (time || '12:00').split(':').map(Number)
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute)
  let instant = targetAsUtc
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-AU', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(instant))
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    const representedAsUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour) % 24, Number(values.minute))
    instant += targetAsUtc - representedAsUtc
  }
  return new Date(instant).toISOString()
}

export function taskDateKey(task: Pick<PlannerTaskRecord, 'planned_date' | 'due_date'>, timezone = DEFAULT_TIMEZONE) {
  const value = task.planned_date || task.due_date
  return value ? dateKey(value, timezone) : ''
}

export function tasksForDate(tasks: PlannerTaskRecord[], date: string, timezone = DEFAULT_TIMEZONE) {
  return tasks.filter((task) => taskDateKey(task, timezone) === date)
}

export function isUntimedTask(task: Pick<PlannerTaskRecord, 'planned_date' | 'description'>) {
  return !task.planned_date || task.description === UNTIMED_MARKER
}

export function timeLabel(value?: string | null, timezone = DEFAULT_TIMEZONE) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: timezone })
}

export function timeKey(value: Date | string, timezone = DEFAULT_TIMEZONE) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date)
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${valueByType.hour}:${valueByType.minute}`
}

export function durationLabel(minutes?: number | null) {
  const value = Math.max(0, Number(minutes || 0))
  if (!value) return ''
  const hours = Math.floor(value / 60)
  const remainder = value % 60
  return [hours ? `${hours}h` : '', remainder ? `${remainder}m` : ''].filter(Boolean).join(' ')
}

function minuteOfDay(time: string | null) {
  if (!time) return null
  const match = time.match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return minutes >= 0 && minutes < 1440 ? minutes : null
}

export function validatePlannerDrafts(value: unknown, selectedDate: string, occupied: Array<{ startTime: string; estimatedMinutes: number }>) {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { summary?: unknown; items?: unknown }
  if (!Array.isArray(candidate.items) || candidate.items.length > 20) return null
  const intervals = occupied
    .map((item) => ({ start: minuteOfDay(item.startTime), end: (minuteOfDay(item.startTime) ?? 0) + Math.max(1, item.estimatedMinutes) }))
    .filter((item): item is { start: number; end: number } => item.start !== null)
  const items: PlannerDraft[] = []

  for (const [index, raw] of candidate.items.entries()) {
    if (!raw || typeof raw !== 'object') return null
    const item = raw as Record<string, unknown>
    const title = typeof item.title === 'string' ? item.title.trim() : ''
    const date = typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : selectedDate
    const startTime = item.startTime === null || item.startTime === undefined || item.startTime === '' ? null : String(item.startTime)
    const start = minuteOfDay(startTime)
    const estimatedMinutes = Math.min(480, Math.max(5, Math.round(Number(item.estimatedMinutes) || 45)))
    if (!title || (startTime !== null && start === null)) return null
    const overlap = start === null ? null : intervals.find((entry) => start < entry.end && start + estimatedMinutes > entry.start)
    const conflict = overlap ? `Overlaps an existing item between ${String(Math.floor(overlap.start / 60)).padStart(2, '0')}:${String(overlap.start % 60).padStart(2, '0')} and ${String(Math.floor(overlap.end / 60)).padStart(2, '0')}:${String(overlap.end % 60).padStart(2, '0')}.` : null
    items.push({
      id: `draft-${index}-${date}-${startTime || 'untimed'}`,
      title,
      date,
      startTime,
      estimatedMinutes,
      taskType: typeof item.taskType === 'string' ? item.taskType : 'personal',
      courseCode: typeof item.courseCode === 'string' && item.courseCode.trim() ? item.courseCode.trim().toUpperCase() : null,
      assessmentId: typeof item.assessmentId === 'string' && item.assessmentId ? item.assessmentId : null,
      rationale: typeof item.rationale === 'string' ? item.rationale : 'Suggested from your planning request.',
      conflict
    })
    if (start !== null) intervals.push({ start, end: start + estimatedMinutes })
  }

  return { summary: typeof candidate.summary === 'string' ? candidate.summary : 'Review this proposed plan before adding it.', items }
}

export function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const source = fenced || text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  if (!source) return null
  try { return JSON.parse(source) as unknown } catch { return null }
}
