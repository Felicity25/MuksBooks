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

export function getCurrentSemesterWeek(date = new Date(), calendarOverride?: SemesterCalendar | null) {
  const calendar = calendarOverride || getCurrentMonashCalendar(date)
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

export function getSemesterTimeline(date = new Date(), calendarOverride?: SemesterCalendar | null): SemesterTimelineEntry[] {
  const calendar = calendarOverride || getCurrentMonashCalendar(date)
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
