export type SemesterPhase = 'teaching' | 'break' | 'swotvac' | 'exams' | 'orientation' | 'other'

export interface SemesterWeekRange {
  label: string
  start: string
  end: string
  phase: SemesterPhase
}

export interface SemesterTimelineEntry extends SemesterWeekRange {
  weekNumber?: number
}

export interface SemesterCalendar {
  year: number
  semester: 'Semester 1' | 'Semester 2'
  teachingStart: string
  teachingEnd: string
  weeks: SemesterWeekRange[]
  breakRanges: Array<Omit<SemesterWeekRange, 'label'>>
  swotvac: Omit<SemesterWeekRange, 'label'>
  exams: Omit<SemesterWeekRange, 'label'>
}

const MONASH_SEMESTER_2_2026: SemesterCalendar = {
  year: 2026,
  semester: 'Semester 2',
  teachingStart: '2026-07-27',
  teachingEnd: '2026-11-18',
  weeks: [
    { label: 'Week 1', start: '2026-07-27', end: '2026-08-02', phase: 'teaching' },
    { label: 'Week 2', start: '2026-08-03', end: '2026-08-09', phase: 'teaching' },
    { label: 'Week 3', start: '2026-08-10', end: '2026-08-16', phase: 'teaching' },
    { label: 'Week 4', start: '2026-08-17', end: '2026-08-23', phase: 'teaching' },
    { label: 'Week 5', start: '2026-08-24', end: '2026-08-30', phase: 'teaching' },
    { label: 'Week 6', start: '2026-08-31', end: '2026-09-06', phase: 'teaching' },
    { label: 'Week 7', start: '2026-09-07', end: '2026-09-13', phase: 'teaching' },
    { label: 'Week 8', start: '2026-09-14', end: '2026-09-20', phase: 'teaching' },
    { label: 'Week 9', start: '2026-09-28', end: '2026-10-04', phase: 'teaching' },
    { label: 'Week 10', start: '2026-10-05', end: '2026-10-11', phase: 'teaching' },
    { label: 'Week 11', start: '2026-10-12', end: '2026-10-18', phase: 'teaching' },
    { label: 'Week 12', start: '2026-10-19', end: '2026-10-25', phase: 'teaching' }
  ],
  breakRanges: [
    { start: '2026-09-21', end: '2026-09-27', phase: 'break' }
  ],
  swotvac: {
    start: '2026-10-26',
    end: '2026-10-30',
    phase: 'swotvac'
  },
  exams: {
    start: '2026-11-02',
    end: '2026-11-18',
    phase: 'exams'
  }
}

const CALENDARS = [MONASH_SEMESTER_2_2026]

export function matchesMonashUniversity(universityName?: string | null) {
  const value = (universityName || '').toLowerCase()
  return value.includes('monash')
}

export function getGenericSemesterCalendar(date = new Date()): SemesterCalendar {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const semester: SemesterCalendar['semester'] = month < 6 ? 'Semester 1' : 'Semester 2'
  const teachingStart = semester === 'Semester 1' ? `${year}-03-01` : `${year}-08-01`

  const weeks: SemesterWeekRange[] = Array.from({ length: 12 }, (_, index) => {
    const start = new Date(`${teachingStart}T00:00:00Z`)
    start.setUTCDate(start.getUTCDate() + index * 7)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 6)
    const isoStart = start.toISOString().slice(0, 10)
    const isoEnd = end.toISOString().slice(0, 10)
    return { label: `Week ${index + 1}`, start: isoStart, end: isoEnd, phase: 'teaching' }
  })

  const breakStart = weeks[7]?.end || teachingStart
  const breakEndDate = new Date(`${breakStart}T00:00:00Z`)
  breakEndDate.setUTCDate(breakEndDate.getUTCDate() + 7)
  const breakEnd = breakEndDate.toISOString().slice(0, 10)
  const swotvacStart = weeks[11]?.end || breakEnd
  const swotvacEndDate = new Date(`${swotvacStart}T00:00:00Z`)
  swotvacEndDate.setUTCDate(swotvacEndDate.getUTCDate() + 5)
  const swotvacEnd = swotvacEndDate.toISOString().slice(0, 10)
  const examStartDate = new Date(`${swotvacEnd}T00:00:00Z`)
  examStartDate.setUTCDate(examStartDate.getUTCDate() + 2)
  const examEndDate = new Date(examStartDate)
  examEndDate.setUTCDate(examEndDate.getUTCDate() + 20)

  return {
    year,
    semester,
    teachingStart,
    teachingEnd: weeks[11]?.end || teachingStart,
    weeks,
    breakRanges: [{ start: breakStart, end: breakEnd, phase: 'break' }],
    swotvac: { start: swotvacStart, end: swotvacEnd, phase: 'swotvac' },
    exams: { start: examStartDate.toISOString().slice(0, 10), end: examEndDate.toISOString().slice(0, 10), phase: 'exams' }
  }
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function isWithin(date: Date, start: string, end: string) {
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  if (!startDate || !endDate) return false
  return date >= startDate && date <= endDate
}

export function getCurrentMonashCalendar(date = new Date()): SemesterCalendar | null {
  return CALENDARS.find((calendar) => {
    const start = parseDate(calendar.teachingStart)
    const end = parseDate(calendar.teachingEnd)
    if (!start || !end) return false
    return date >= start && date <= end
  }) || CALENDARS[0] || null
}

export function getCurrentUniversityCalendar(date = new Date(), universityName?: string | null): SemesterCalendar | null {
  if (matchesMonashUniversity(universityName)) return getCurrentMonashCalendar(date)
  return getGenericSemesterCalendar(date)
}

export function getCurrentSemesterWeek(date = new Date(), calendarOverride?: SemesterCalendar | null, universityName?: string | null) {
  const calendar = calendarOverride || getCurrentUniversityCalendar(date, universityName)
  if (!calendar) return null

  for (const week of calendar.weeks) {
    if (isWithin(date, week.start, week.end)) {
      const weekNumber = Number(week.label.replace(/[^\d]/g, '')) || undefined
      return { calendar, ...week, weekNumber }
    }
  }

  for (const breakRange of calendar.breakRanges) {
    if (isWithin(date, breakRange.start, breakRange.end)) {
      return {
        calendar,
        label: 'Mid-semester break',
        ...breakRange,
        weekNumber: undefined
      }
    }
  }

  if (isWithin(date, calendar.swotvac.start, calendar.swotvac.end)) {
    return {
      calendar,
      label: 'SWOTVAC',
      ...calendar.swotvac,
      weekNumber: undefined
    }
  }

  if (isWithin(date, calendar.exams.start, calendar.exams.end)) {
    return {
      calendar,
      label: 'Exams',
      ...calendar.exams,
      weekNumber: undefined
    }
  }

  return { calendar, label: 'Out of semester', start: calendar.teachingStart, end: calendar.teachingEnd, phase: 'other' as SemesterPhase, weekNumber: undefined }
}

export function getSemesterTimeline(date = new Date(), calendarOverride?: SemesterCalendar | null, universityName?: string | null): SemesterTimelineEntry[] {
  const calendar = calendarOverride || getCurrentUniversityCalendar(date, universityName)
  if (!calendar) return []

  const timeline: SemesterTimelineEntry[] = calendar.weeks.map((week) => ({
    ...week,
    weekNumber: Number(week.label.replace(/[^\d]/g, '')) || undefined
  }))

  for (const breakRange of calendar.breakRanges) {
    timeline.push({
      label: 'Mid-semester break',
      start: breakRange.start,
      end: breakRange.end,
      phase: breakRange.phase
    })
  }

  timeline.push({
    label: 'SWOTVAC',
    start: calendar.swotvac.start,
    end: calendar.swotvac.end,
    phase: calendar.swotvac.phase
  })

  timeline.push({
    label: 'Exams',
    start: calendar.exams.start,
    end: calendar.exams.end,
    phase: calendar.exams.phase
  })

  return timeline.sort((left, right) => left.start.localeCompare(right.start))
}

export function formatSemesterRange(start: string, end: string) {
  const startDate = parseDate(start)
  const endDate = parseDate(end)
  if (!startDate || !endDate) return `${start} - ${end}`

  return `${startDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
}

export function getWeekLabel(current: ReturnType<typeof getCurrentSemesterWeek>) {
  if (!current) return 'No semester data'
  if (current.label.startsWith('Week ')) return current.label
  return current.label
}

export function getFallbackSemesterCalendars() {
  return CALENDARS
}
