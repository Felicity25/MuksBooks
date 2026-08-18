import ical from 'node-ical'

export interface CalendarUnit {
  id: string
  code: string
  name?: string | null
}

export interface ParsedCalendarEvent {
  sourceUid: string
  recurrenceId: string | null
  title: string
  description: string | null
  location: string | null
  startsAt: string
  endsAt: string
  timezone: string | null
  unitId: string | null
  unitCode: string | null
  activityType: string | null
  isAssessment: boolean
  source: 'ical'
}

const UNIT_CODE = /\b([A-Z]{2,4}\d{4})\b/i

function inferActivityType(text: string) {
  const rules: Array<[RegExp, string]> = [
    [/\b(?:lecture|lec)\b/i, 'Lecture'],
    [/\b(?:tutorial|tute|tut)\b/i, 'Tutorial'],
    [/\b(?:workshop|wrk)\b/i, 'Workshop'],
    [/\b(?:laboratory|lab)\b/i, 'Laboratory'],
    [/\bseminar\b/i, 'Seminar']
  ]
  return rules.find(([pattern]) => pattern.test(text))?.[1] || null
}

function matchUnit(text: string, units: CalendarUnit[]) {
  const detectedCode = text.match(UNIT_CODE)?.[1]?.toUpperCase() || null
  if (detectedCode) {
    const exact = units.find((unit) => unit.code.toUpperCase() === detectedCode)
    if (exact) return { unitId: exact.id, unitCode: exact.code.toUpperCase() }
  }

  const normalized = text.toLowerCase()
  const byName = units.find((unit) => unit.name && unit.name.length >= 6 && normalized.includes(unit.name.toLowerCase()))
  return byName ? { unitId: byName.id, unitCode: byName.code.toUpperCase() } : { unitId: null, unitCode: detectedCode }
}

function addOccurrence(params: {
  output: ParsedCalendarEvent[]
  event: any
  start: Date
  end: Date
  recurrenceId?: string | null
  units: CalendarUnit[]
}) {
  const { output, event, start, end, units } = params
  const title = String(event.summary || 'Untitled class').trim()
  const description = event.description ? String(event.description).trim() : null
  const location = event.location ? String(event.location).trim() : null
  const searchable = [title, description, location].filter(Boolean).join(' ')
  const matched = matchUnit(searchable, units)

  output.push({
    sourceUid: String(event.uid || '').trim(),
    recurrenceId: params.recurrenceId || null,
    title,
    description,
    location,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    timezone: event.start?.tz || event.start?.timezone || null,
    unitId: matched.unitId,
    unitCode: matched.unitCode,
    activityType: inferActivityType(searchable),
    isAssessment: /\b(?:assessment|assignment|exam|quiz|test)\b/i.test(searchable),
    source: 'ical'
  })
}

export function parseICalendar(input: string, units: CalendarUnit[], range: { start: Date; end: Date }): ParsedCalendarEvent[] {
  const parsed = ical.sync.parseICS(input)
  const output: ParsedCalendarEvent[] = []

  Object.values(parsed).forEach((component: any) => {
    if (component?.type !== 'VEVENT' || !component.uid || !(component.start instanceof Date) || !(component.end instanceof Date)) return
    const duration = component.end.getTime() - component.start.getTime()

    if (component.rrule) {
      const occurrences = component.rrule.between(range.start, range.end, true)
      occurrences.forEach((occurrence: Date) => {
        const recurrenceKey = occurrence.toISOString()
        const override = component.recurrences?.[recurrenceKey] || component.recurrences?.[occurrence.toISOString().replace(/[-:]/g, '').replace('.000', '')]
        const occurrenceEvent = override || component
        const start = override?.start instanceof Date ? override.start : occurrence
        const end = override?.end instanceof Date ? override.end : new Date(start.getTime() + duration)
        if (component.exdate?.[recurrenceKey]) return
        addOccurrence({ output, event: occurrenceEvent, start, end, recurrenceId: recurrenceKey, units })
      })
      return
    }

    if (component.start <= range.end && component.end >= range.start) {
      addOccurrence({ output, event: component, start: component.start, end: component.end, units })
    }
  })

  const deduplicated = new Map<string, ParsedCalendarEvent>()
  output.forEach((event) => deduplicated.set(`${event.sourceUid}::${event.startsAt}`, event))
  return Array.from(deduplicated.values()).sort((left, right) => left.startsAt.localeCompare(right.startsAt))
}