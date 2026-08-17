import { promises as fs } from 'fs'
import path from 'path'
import { getFallbackSemesterCalendars, type SemesterCalendar } from '@/lib/semester-calendar'

const OFFICIAL_MONASH_DATES_URL = 'https://www.monash.edu/students/admin/dates/summary-dates'
const CACHE_TTL_MS = 1000 * 60 * 60 * 12

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME)
const CACHE_DIR = IS_SERVERLESS ? path.join('/tmp', 'muksbooks') : path.join(process.cwd(), 'data')
const CACHE_PATH = path.join(CACHE_DIR, 'monash-calendar-cache.json')

interface CalendarCachePayload {
  fetchedAt: string
  sourceUrl: string
  calendars: SemesterCalendar[]
}

export interface CalendarSnapshot {
  calendar: SemesterCalendar
  source: 'official' | 'cache' | 'fallback'
  fetchedAt?: string
  sourceUrl?: string
  stale?: boolean
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function parseIsoDate(value?: string | null) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseAnyDate(rawValue: string, fallbackYear: number) {
  const value = rawValue.trim().replace(/\s+/g, ' ')

  const dmy = value.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2])
    const year = dmy[3] ? Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]) : fallbackYear
    const date = new Date(Date.UTC(year, month - 1, day))
    if (!Number.isNaN(date.getTime())) return toIsoDate(date)
  }

  const named = value.match(/\b(\d{1,2})\s+([A-Za-z]{3,12})(?:\s+(\d{4}))?\b/)
  if (named) {
    const day = Number(named[1])
    const monthToken = named[2].toLowerCase()
    const year = named[3] ? Number(named[3]) : fallbackYear
    const months: Record<string, number> = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      sept: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11
    }

    const month = months[monthToken]
    if (typeof month === 'number') {
      const date = new Date(Date.UTC(year, month, day))
      if (!Number.isNaN(date.getTime())) return toIsoDate(date)
    }
  }

  return null
}

function extractDateForLabel(text: string, labelPattern: RegExp, fallbackYear: number) {
  const line = text
    .split(/\r?\n/)
    .find((entry) => labelPattern.test(entry.toLowerCase()))

  if (!line) return null

  const range = line.match(/(\d{1,2}\/[0-9]{1,2}(?:\/[0-9]{2,4})?|\d{1,2}\s+[A-Za-z]{3,12}(?:\s+\d{4})?)\s*(?:to|\-|–|—)\s*(\d{1,2}\/[0-9]{1,2}(?:\/[0-9]{2,4})?|\d{1,2}\s+[A-Za-z]{3,12}(?:\s+\d{4})?)/i)
  if (range) {
    const start = parseAnyDate(range[1], fallbackYear)
    const end = parseAnyDate(range[2], fallbackYear)
    if (start && end) return { start, end }
  }

  const single = line.match(/(\d{1,2}\/[0-9]{1,2}(?:\/[0-9]{2,4})?|\d{1,2}\s+[A-Za-z]{3,12}(?:\s+\d{4})?)/i)
  if (!single) return null
  const date = parseAnyDate(single[1], fallbackYear)
  if (!date) return null
  return { start: date, end: date }
}

function addDays(isoDate: string, days: number) {
  const date = parseIsoDate(isoDate)
  if (!date) return isoDate
  date.setUTCDate(date.getUTCDate() + days)
  return toIsoDate(date)
}

function buildWeeks(teachingStart: string, weekCount: number, breakRange?: { start: string; end: string }) {
  const weeks: Array<{ label: string; start: string; end: string; phase: 'teaching' }> = []

  let cursor = teachingStart
  let weekNumber = 1

  while (weekNumber <= weekCount) {
    const weekStart = cursor
    const weekEnd = addDays(weekStart, 6)

    if (breakRange) {
      const breakStart = parseIsoDate(breakRange.start)
      const breakEnd = parseIsoDate(breakRange.end)
      const currentStart = parseIsoDate(weekStart)
      const currentEnd = parseIsoDate(weekEnd)
      if (breakStart && breakEnd && currentStart && currentEnd) {
        const overlaps = breakStart <= currentEnd && breakEnd >= currentStart
        if (overlaps) {
          cursor = addDays(breakRange.end, 1)
          continue
        }
      }
    }

    weeks.push({
      label: `Week ${weekNumber}`,
      start: weekStart,
      end: weekEnd,
      phase: 'teaching'
    })

    weekNumber += 1
    cursor = addDays(weekStart, 7)
  }

  return weeks
}

async function loadCache() {
  try {
    const content = await fs.readFile(CACHE_PATH, 'utf8')
    const parsed = JSON.parse(content) as CalendarCachePayload
    if (!Array.isArray(parsed.calendars) || !parsed.calendars.length) return null
    return parsed
  } catch {
    return null
  }
}

async function saveCache(payload: CalendarCachePayload) {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  await fs.writeFile(CACHE_PATH, JSON.stringify(payload, null, 2), 'utf8')
}

function selectCalendar(calendars: SemesterCalendar[], date: Date) {
  const iso = toIsoDate(date)
  const inRange = calendars.find((calendar) => iso >= calendar.teachingStart && iso <= calendar.exams.end)
  if (inRange) return inRange

  const semester = date.getUTCMonth() < 6 ? 'Semester 1' : 'Semester 2'
  const sameYear = calendars.find((calendar) => calendar.year === date.getUTCFullYear() && calendar.semester === semester)
  return sameYear || calendars[0]
}

function buildFallbackSnapshot(date: Date): CalendarSnapshot {
  const fallback = selectCalendar(getFallbackSemesterCalendars(), date)
  return {
    calendar: fallback,
    source: 'fallback'
  }
}

async function fetchOfficialCalendars(): Promise<CalendarCachePayload | null> {
  const response = await fetch(OFFICIAL_MONASH_DATES_URL, {
    headers: {
      'User-Agent': 'MuksBooks/1.0 (+semester-calendar-fetch)'
    },
    cache: 'no-store'
  })

  if (!response.ok) return null
  const html = await response.text()
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
  const lines = html
    .replace(/<br\s*\/?/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const joinedLines = lines.join('\n')

  const detectedYear = Number((text.match(/\b(20\d{2})\b/) || [])[1]) || new Date().getUTCFullYear()

  const teachingStartRange = extractDateForLabel(joinedLines, /(semester\s*2.*teaching.*start|teaching\s*begins.*semester\s*2|semester\s*2\s*starts)/i, detectedYear)
  if (!teachingStartRange?.start) return null

  const breakRange = extractDateForLabel(joinedLines, /(mid\s*semester\s*break|mid-semester break)/i, detectedYear)
  const swotvacRange = extractDateForLabel(joinedLines, /(swotvac|swot\s*vac)/i, detectedYear)
  const examRange = extractDateForLabel(joinedLines, /(exam\s*period|final\s*assessment\s*period|exams)/i, detectedYear)

  const weeks = buildWeeks(teachingStartRange.start, 12, breakRange || undefined)
  const teachingEnd = weeks[weeks.length - 1]?.end || teachingStartRange.start

  const calendar: SemesterCalendar = {
    year: detectedYear,
    semester: 'Semester 2',
    teachingStart: teachingStartRange.start,
    teachingEnd,
    weeks,
    breakRanges: breakRange ? [{ start: breakRange.start, end: breakRange.end, phase: 'break' }] : [],
    swotvac: {
      start: swotvacRange?.start || addDays(teachingEnd, 1),
      end: swotvacRange?.end || addDays(teachingEnd, 5),
      phase: 'swotvac'
    },
    exams: {
      start: examRange?.start || addDays(teachingEnd, 7),
      end: examRange?.end || addDays(teachingEnd, 21),
      phase: 'exams'
    }
  }

  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl: OFFICIAL_MONASH_DATES_URL,
    calendars: [calendar]
  }
}

export async function getSemesterCalendarSnapshot(date = new Date(), options?: { forceRefresh?: boolean; allowRefresh?: boolean }): Promise<CalendarSnapshot> {
  const cache = await loadCache()
  const cacheAgeMs = cache ? Date.now() - new Date(cache.fetchedAt).getTime() : Number.POSITIVE_INFINITY
  const isStale = !cache || !Number.isFinite(cacheAgeMs) || cacheAgeMs > CACHE_TTL_MS

  if (!options?.forceRefresh && cache?.calendars?.length) {
    if (!isStale || options?.allowRefresh === false) {
      return {
        calendar: selectCalendar(cache.calendars, date),
        source: 'cache',
        fetchedAt: cache.fetchedAt,
        sourceUrl: cache.sourceUrl,
        stale: isStale
      }
    }
  }

  if (options?.allowRefresh !== false) {
    try {
      const fetched = await fetchOfficialCalendars()
      if (fetched?.calendars?.length) {
        await saveCache(fetched)
        return {
          calendar: selectCalendar(fetched.calendars, date),
          source: 'official',
          fetchedAt: fetched.fetchedAt,
          sourceUrl: fetched.sourceUrl,
          stale: false
        }
      }
    } catch {
      // Fall through to cache/fallback when official fetch is unavailable.
    }
  }

  if (cache?.calendars?.length) {
    return {
      calendar: selectCalendar(cache.calendars, date),
      source: 'cache',
      fetchedAt: cache.fetchedAt,
      sourceUrl: cache.sourceUrl,
      stale: true
    }
  }

  return buildFallbackSnapshot(date)
}
