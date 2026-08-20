'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, ChevronLeft, ChevronRight, EyeOff, Upload } from 'lucide-react'
import { formatSemesterRange } from '@/lib/semester-calendar'

interface TimelineEntry {
  label: string
  start: string
  end: string
  phase: string
  weekNumber?: number
}

interface CurrentEntry extends TimelineEntry {}

interface SemesterCalendarPayload {
  ok?: boolean
  source?: 'official' | 'cache' | 'fallback'
  stale?: boolean
  current?: CurrentEntry | null
  timeline?: TimelineEntry[]
}

interface ClassEvent {
  id: string
  title: string
  location?: string | null
  starts_at: string
  ends_at: string
  unit_code?: string | null
  activity_type?: string | null
  is_assessment: boolean
}

interface Course {
  id: string
  course_code: string
  course_name?: string | null
  color?: string | null
}

interface PlannerTask {
  id: string
  course_id?: string | null
  course_code?: string | null
  course_name?: string | null
  title: string
  description?: string | null
  task_type?: string | null
  priority?: number | null
  planned_date?: string | null
  due_date?: string | null
  estimated_minutes?: number | null
  completed?: number | boolean
  assessment_id?: string | null
}

interface Assessment {
  id: string
  unitId: string
  unitCode?: string | null
  unitName?: string | null
  name: string
  assessmentType: string
  dueDate?: string | null
  weighting?: number | null
  status?: string | null
}

interface UnitScheduleEntry {
  id?: string
  week_number: number
  start_date?: string | null
  end_date?: string | null
  topic?: string
  additional_topics?: string[]
  activities?: string[]
  is_break?: boolean
}

type CalendarView = 'month' | 'week' | 'day' | 'agenda'
type CalendarSource = 'class' | 'assessment' | 'planner' | 'unit_schedule' | 'semester'

interface CalendarEventItem {
  id: string
  source: CalendarSource
  sourceId: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  unitId?: string | null
  unitCode?: string | null
  location?: string | null
  color?: string | null
  notes?: string | null
  meta?: string | null
}

interface CalendarSettings {
  enabledSources: Record<CalendarSource, boolean>
  selectedUnitIds: string[]
  hiddenEventIds: string[]
  preferredView: CalendarView
}

const CALENDAR_SETTINGS_KEY = 'muksbooks:semester-calendar:settings:v1'
const SOURCE_LABELS: Record<CalendarSource, string> = {
  class: 'Classes',
  assessment: 'Assessments',
  planner: 'Planner tasks',
  unit_schedule: 'Unit topics',
  semester: 'Semester phases'
}

const DEFAULT_SETTINGS: CalendarSettings = {
  enabledSources: {
    class: true,
    assessment: true,
    planner: true,
    unit_schedule: true,
    semester: true
  },
  selectedUnitIds: [],
  hiddenEventIds: [],
  preferredView: 'week'
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const UNIT_COLOR_HEX: Record<string, string> = {
  sky: '#0ea5e9',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  indigo: '#6366f1',
  slate: '#64748b'
}

function toDateOnlyISO(value: Date) {
  const yyyy = value.getFullYear()
  const mm = `${value.getMonth() + 1}`.padStart(2, '0')
  const dd = `${value.getDate()}`.padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeekMonday(date: Date) {
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  return startOfDay(addDays(date, offset))
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function parseMaybeDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeUnitColor(color?: string | null) {
  if (!color) return ''
  const trimmed = color.trim().toLowerCase()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return trimmed
  return UNIT_COLOR_HEX[trimmed] || ''
}

function hexToRgba(color: string, alpha: number) {
  const normalized = normalizeUnitColor(color)
  if (!normalized) return ''
  const hex = normalized.length === 4
    ? `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
    : normalized
  const red = Number.parseInt(hex.slice(1, 3), 16)
  const green = Number.parseInt(hex.slice(3, 5), 16)
  const blue = Number.parseInt(hex.slice(5, 7), 16)
  if ([red, green, blue].some((channel) => Number.isNaN(channel))) return ''
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function eventSurfaceStyle(color?: string | null): CSSProperties | undefined {
  const base = normalizeUnitColor(color)
  if (!base) return undefined
  return {
    borderColor: hexToRgba(base, 0.3),
    backgroundColor: hexToRgba(base, 0.12)
  }
}

function colorDotStyle(color?: string | null): CSSProperties | undefined {
  const base = normalizeUnitColor(color)
  if (!base) return undefined
  return { backgroundColor: base }
}

function compactTopicPreview(event: CalendarEventItem) {
  const unitPrefix = event.unitCode ? `${event.unitCode} ` : ''
  const cleanedTitle = event.title.startsWith(unitPrefix) ? event.title.slice(unitPrefix.length) : event.title
  return cleanedTitle.trim() || 'Weekly topic'
}

function buildUnitColorMap(courses: Course[]) {
  const map = new Map<string, string>()
  for (const course of courses) {
    if (!course.id) continue
    map.set(course.id, course.color || '')
  }
  return map
}

function tintClassName(color: string | null | undefined) {
  switch (color) {
    case 'sky':
      return 'border-sky-200 bg-sky-50'
    case 'emerald':
      return 'border-emerald-200 bg-emerald-50'
    case 'rose':
      return 'border-rose-200 bg-rose-50'
    case 'amber':
      return 'border-amber-200 bg-amber-50'
    case 'violet':
      return 'border-violet-200 bg-violet-50'
    case 'indigo':
      return 'border-indigo-200 bg-indigo-50'
    default:
      return 'border-slate-200 bg-slate-50'
  }
}

function sourcePillClassName(source: CalendarSource) {
  switch (source) {
    case 'class':
      return 'bg-sky-100 text-sky-700'
    case 'assessment':
      return 'bg-rose-100 text-rose-700'
    case 'planner':
      return 'bg-emerald-100 text-emerald-700'
    case 'unit_schedule':
      return 'bg-amber-100 text-amber-700'
    case 'semester':
      return 'bg-indigo-100 text-indigo-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function formatTimeRange(event: CalendarEventItem) {
  if (event.allDay) return 'All day'
  return `${event.start.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
}

function dateKey(date: Date) {
  return toDateOnlyISO(startOfDay(date))
}

function overlapsDay(event: CalendarEventItem, day: Date) {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  return event.start <= dayEnd && event.end >= dayStart
}

export function SemesterTimeline() {
  const calendarRef = useRef<HTMLDivElement | null>(null)
  const [current, setCurrent] = useState<CurrentEntry | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [source, setSource] = useState<'official' | 'cache' | 'fallback' | null>(null)
  const [stale, setStale] = useState(false)
  const [events, setEvents] = useState<ClassEvent[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [plannerTasks, setPlannerTasks] = useState<PlannerTask[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [unitScheduleByUnit, setUnitScheduleByUnit] = useState<Record<string, UnitScheduleEntry[]>>({})
  const [showDetailedCalendar, setShowDetailedCalendar] = useState(false)
  const [calendarView, setCalendarView] = useState<CalendarView>('week')
  const [focusDate, setFocusDate] = useState<Date>(new Date())
  const [settingsReady, setSettingsReady] = useState(false)
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS)
  const [topicDetailEvent, setTopicDetailEvent] = useState<CalendarEventItem | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/calendar-events', { cache: 'no-store' })
      const payload = await response.json()
      if (response.ok && payload?.ok) setEvents(payload.events || [])
    } catch {
      setEvents([])
    }
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CALENDAR_SETTINGS_KEY)
      const parsed = raw ? JSON.parse(raw) as Partial<CalendarSettings> : null
      const mobileDefaultView = window.innerWidth < 768 ? 'day' : 'week'
      const loaded: CalendarSettings = {
        enabledSources: {
          ...DEFAULT_SETTINGS.enabledSources,
          ...(parsed?.enabledSources || {})
        },
        selectedUnitIds: Array.isArray(parsed?.selectedUnitIds) ? parsed!.selectedUnitIds : [],
        hiddenEventIds: Array.isArray(parsed?.hiddenEventIds) ? parsed!.hiddenEventIds : [],
        preferredView: parsed?.preferredView || mobileDefaultView
      }
      setCalendarSettings(loaded)
      setCalendarView(loaded.preferredView)
    } catch {
      setCalendarSettings(DEFAULT_SETTINGS)
    } finally {
      setSettingsReady(true)
    }
  }, [])

  useEffect(() => {
    if (!settingsReady) return
    try {
      window.localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify({
        ...calendarSettings,
        preferredView: calendarView
      }))
    } catch {
      // Ignore local storage write errors in private browsing contexts.
    }
  }, [calendarSettings, calendarView, settingsReady])

  useEffect(() => {
    const load = async () => {
      try {
        const [calendarRes, coursesRes, plannerRes, assessmentsRes] = await Promise.all([
          fetch('/api/semester-calendar', { cache: 'no-store' }),
          fetch('/api/app-state/courses', { cache: 'no-store' }),
          fetch('/api/app-state/planner-tasks', { cache: 'no-store' }),
          fetch('/api/app-state/assessments', { cache: 'no-store' })
        ])

        const calendarPayload = (await calendarRes.json().catch(() => null)) as SemesterCalendarPayload | null
        if (calendarRes.ok && calendarPayload?.ok) {
          setCurrent(calendarPayload.current || null)
          setTimeline(Array.isArray(calendarPayload.timeline) ? calendarPayload.timeline : [])
          setSource(calendarPayload.source || null)
          setStale(Boolean(calendarPayload.stale))
        }

        const coursesPayload = await coursesRes.json().catch(() => null)
        const loadedCourses = coursesRes.ok && coursesPayload?.ok && Array.isArray(coursesPayload.courses)
          ? coursesPayload.courses
          : []
        setCourses(loadedCourses)

        const plannerPayload = await plannerRes.json().catch(() => null)
        setPlannerTasks(plannerRes.ok && plannerPayload?.ok && Array.isArray(plannerPayload.tasks) ? plannerPayload.tasks : [])

        const assessmentsPayload = await assessmentsRes.json().catch(() => null)
        setAssessments(assessmentsRes.ok && assessmentsPayload?.ok && Array.isArray(assessmentsPayload.assessments) ? assessmentsPayload.assessments : [])

        if (Array.isArray(loadedCourses) && loadedCourses.length) {
          const schedulePairs = await Promise.all(loadedCourses.map(async (course: Course) => {
            try {
              const response = await fetch(`/api/app-state/unit-schedule?unitId=${encodeURIComponent(course.id)}`, { cache: 'no-store' })
              const payload = await response.json().catch(() => null)
              if (!response.ok || !payload?.ok || !Array.isArray(payload.entries)) return [course.id, [] as UnitScheduleEntry[]] as const
              return [course.id, payload.entries as UnitScheduleEntry[]] as const
            } catch {
              return [course.id, [] as UnitScheduleEntry[]] as const
            }
          }))
          const mapped: Record<string, UnitScheduleEntry[]> = {}
          for (const [unitId, entries] of schedulePairs) {
            mapped[unitId] = entries
          }
          setUnitScheduleByUnit(mapped)
        } else {
          setUnitScheduleByUnit({})
        }
      } catch {
        setCurrent(null)
        setTimeline([])
      }
    }

    void load()
    void loadEvents()
  }, [])

  const unitColorMap = useMemo(() => buildUnitColorMap(courses), [courses])

  const weekByNumber = useMemo(() => {
    const map = new Map<number, TimelineEntry>()
    for (const item of timeline) {
      if (item.phase === 'teaching' && typeof item.weekNumber === 'number') {
        map.set(item.weekNumber, item)
      }
    }
    return map
  }, [timeline])

  const aggregatedEvents = useMemo(() => {
    const normalized: CalendarEventItem[] = []

    for (const event of events) {
      const start = parseMaybeDate(event.starts_at)
      const end = parseMaybeDate(event.ends_at)
      if (!start || !end) continue
      normalized.push({
        id: `class-${event.id}`,
        source: event.is_assessment ? 'assessment' : 'class',
        sourceId: event.id,
        title: event.title,
        start,
        end,
        allDay: false,
        unitCode: event.unit_code || null,
        location: event.location || null,
        notes: event.activity_type || null,
        meta: event.activity_type || null
      })
    }

    for (const task of plannerTasks) {
      const start = parseMaybeDate(task.planned_date || task.due_date || null)
      if (!start) continue
      const duration = Math.max(15, Number(task.estimated_minutes || 45))
      const end = new Date(start.getTime() + duration * 60000)
      const done = task.completed === true || task.completed === 1
      normalized.push({
        id: `planner-${task.id}`,
        source: 'planner',
        sourceId: task.id,
        title: done ? `${task.title} (completed)` : task.title,
        start,
        end,
        allDay: false,
        unitId: task.course_id || null,
        unitCode: task.course_code || null,
        color: task.course_id ? unitColorMap.get(task.course_id) || null : null,
        notes: task.description || null,
        meta: task.task_type || null
      })
    }

    for (const assessment of assessments) {
      const due = parseMaybeDate(assessment.dueDate || null)
      if (!due) continue
      normalized.push({
        id: `assessment-${assessment.id}`,
        source: 'assessment',
        sourceId: assessment.id,
        title: assessment.name,
        start: due,
        end: new Date(due.getTime() + 60 * 60000),
        allDay: false,
        unitId: assessment.unitId,
        unitCode: assessment.unitCode || null,
        color: assessment.unitId ? unitColorMap.get(assessment.unitId) || null : null,
        meta: assessment.assessmentType
      })
    }

    for (const course of courses) {
      const entries = unitScheduleByUnit[course.id] || []
      for (const entry of entries) {
        const fromWeek = weekByNumber.get(entry.week_number)
        const fallbackStart = parseMaybeDate(fromWeek?.start || null)
        const start = parseMaybeDate(entry.start_date || null) || fallbackStart
        const end = parseMaybeDate(entry.end_date || null) || (start ? endOfDay(start) : null)
        if (!start || !end) continue

        const detailParts = [
          ...(Array.isArray(entry.additional_topics) ? entry.additional_topics : []),
          ...(Array.isArray(entry.activities) ? entry.activities : [])
        ].filter(Boolean)

        normalized.push({
          id: `unit-schedule-${course.id}-${entry.id || entry.week_number}`,
          source: 'unit_schedule',
          sourceId: entry.id || `${course.id}:${entry.week_number}`,
          title: entry.is_break ? `${course.course_code} Break / Buffer` : `${course.course_code} ${entry.topic || 'Weekly topic'}`,
          start,
          end,
          allDay: true,
          unitId: course.id,
          unitCode: course.course_code,
          color: course.color || null,
          notes: detailParts.length ? detailParts.join(' · ') : null,
          meta: `Week ${entry.week_number}`
        })
      }
    }

    for (const period of timeline) {
      const start = parseMaybeDate(period.start)
      const end = parseMaybeDate(period.end)
      if (!start || !end) continue
      normalized.push({
        id: `semester-${period.label}`,
        source: 'semester',
        sourceId: period.label,
        title: period.label,
        start: startOfDay(start),
        end: endOfDay(end),
        allDay: true,
        meta: period.phase
      })
    }

    return normalized.sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [assessments, courses, events, plannerTasks, timeline, unitColorMap, unitScheduleByUnit, weekByNumber])

  const selectedUnitSet = useMemo(() => new Set(calendarSettings.selectedUnitIds), [calendarSettings.selectedUnitIds])
  const hiddenEventIdSet = useMemo(() => new Set(calendarSettings.hiddenEventIds), [calendarSettings.hiddenEventIds])

  const filteredEvents = useMemo(() => {
    return aggregatedEvents.filter((event) => {
      if (!calendarSettings.enabledSources[event.source]) return false
      if (hiddenEventIdSet.has(event.id)) return false
      if (!selectedUnitSet.size) return true
      if (!event.unitId) return event.source === 'semester'
      return selectedUnitSet.has(event.unitId)
    })
  }, [aggregatedEvents, calendarSettings.enabledSources, hiddenEventIdSet, selectedUnitSet])

  const sourceCounts = useMemo(() => {
    const counts: Record<CalendarSource, number> = {
      class: 0,
      assessment: 0,
      planner: 0,
      unit_schedule: 0,
      semester: 0
    }
    for (const event of aggregatedEvents) counts[event.source] += 1
    return counts
  }, [aggregatedEvents])

  const goToToday = () => {
    setFocusDate(new Date())
    setShowDetailedCalendar(true)
  }

  const shiftWindow = (direction: 'prev' | 'next') => {
    const sign = direction === 'next' ? 1 : -1
    if (calendarView === 'month') {
      setFocusDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + sign, 1))
      return
    }
    if (calendarView === 'week') {
      setFocusDate((prev) => addDays(prev, sign * 7))
      return
    }
    setFocusDate((prev) => addDays(prev, sign))
  }

  const openDetailedCalendar = (initialDate?: Date, initialView?: CalendarView) => {
    if (initialDate) setFocusDate(initialDate)
    if (initialView) setCalendarView(initialView)
    setShowDetailedCalendar(true)
    setTimeout(() => {
      calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const eventsForDay = (day: Date) => filteredEvents
    .filter((event) => overlapsDay(event, day))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const visibleLabel = useMemo(() => {
    if (calendarView === 'month') {
      return focusDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
    }
    if (calendarView === 'week') {
      const start = startOfWeekMonday(focusDate)
      const end = addDays(start, 6)
      return `${start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
    if (calendarView === 'agenda') {
      return `Agenda from ${focusDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
    return focusDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }, [calendarView, focusDate])

  const monthCells = useMemo(() => {
    const monthStart = startOfMonth(focusDate)
    const monthEnd = endOfMonth(focusDate)
    const gridStart = startOfWeekMonday(monthStart)
    const cells: Date[] = []
    let cursor = gridStart
    while (cells.length < 42) {
      cells.push(cursor)
      cursor = addDays(cursor, 1)
    }
    return { monthStart, monthEnd, cells }
  }, [focusDate])

  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(focusDate)
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [focusDate])

  const agendaItems = useMemo(() => {
    const rangeStart = startOfDay(addDays(focusDate, -7))
    const rangeEnd = endOfDay(addDays(focusDate, 45))
    return filteredEvents
      .filter((event) => event.end >= rangeStart && event.start <= rangeEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [filteredEvents, focusDate])

  const toggleSource = (key: CalendarSource) => {
    setCalendarSettings((prev) => ({
      ...prev,
      enabledSources: {
        ...prev.enabledSources,
        [key]: !prev.enabledSources[key]
      }
    }))
  }

  const toggleUnit = (unitId: string) => {
    setCalendarSettings((prev) => {
      const exists = prev.selectedUnitIds.includes(unitId)
      return {
        ...prev,
        selectedUnitIds: exists
          ? prev.selectedUnitIds.filter((item) => item !== unitId)
          : [...prev.selectedUnitIds, unitId]
      }
    })
  }

  const toggleHiddenEvent = (eventId: string) => {
    setCalendarSettings((prev) => {
      const exists = prev.hiddenEventIds.includes(eventId)
      return {
        ...prev,
        hiddenEventIds: exists
          ? prev.hiddenEventIds.filter((item) => item !== eventId)
          : [...prev.hiddenEventIds, eventId]
      }
    })
  }

  const resetVisibility = () => {
    setCalendarSettings((prev) => ({
      ...prev,
      selectedUnitIds: [],
      hiddenEventIds: [],
      enabledSources: { ...DEFAULT_SETTINGS.enabledSources }
    }))
  }

  const routeToSourceEditor = (event: CalendarEventItem) => {
    if (event.source === 'planner') {
      window.location.assign(`/planner?editTask=${encodeURIComponent(event.sourceId)}`)
      return
    }
    if (event.source === 'assessment') {
      window.location.assign(`/planner?assessmentId=${encodeURIComponent(event.sourceId)}`)
      return
    }
    if (event.source === 'unit_schedule') {
      window.location.assign('/semester-timeline#curriculum')
      return
    }
    if (event.source === 'class') {
      window.location.assign('/semester-timeline#calendar-import')
    }
  }

  const EventChip = ({ event }: { event: CalendarEventItem }) => {
    const hidden = hiddenEventIdSet.has(event.id)
    const isTopic = event.source === 'unit_schedule'
    const preview = compactTopicPreview(event)
    return (
      <div
        className={`rounded-xl border text-xs ${isTopic ? 'p-2.5 shadow-sm' : 'p-2'} ${isTopic ? '' : tintClassName(event.color)}`}
        style={eventSurfaceStyle(event.color)}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="text-left"
            onClick={() => {
              if (isTopic) {
                setTopicDetailEvent(event)
                return
              }
              routeToSourceEditor(event)
            }}
          >
            {isTopic ? (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={colorDotStyle(event.color)}
                  />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">{event.unitCode || 'Unit topic'}</p>
                </div>
                <p className="mt-1 max-w-full truncate font-medium text-slate-900">{preview}</p>
                {event.notes ? <p className="mt-0.5 max-w-full truncate text-slate-600">{event.notes}</p> : null}
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-900">{event.unitCode ? `${event.unitCode} · ` : ''}{event.title}</p>
                <p className="mt-0.5 text-slate-600">{formatTimeRange(event)}{event.location ? ` · ${event.location}` : ''}</p>
                {event.meta ? <p className="mt-0.5 text-slate-500">{event.meta}</p> : null}
              </>
            )}
          </button>
          <button
            type="button"
            title={hidden ? 'Show in calendar' : 'Hide from calendar'}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-200"
            onClick={() => toggleHiddenEvent(event.id)}
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sourcePillClassName(event.source)}`}>
            {SOURCE_LABELS[event.source]}
          </span>
          {isTopic ? <span className="text-[10px] font-semibold text-slate-500">Open details</span> : null}
        </div>
      </div>
    )
  }

  const importCalendar = async (file?: File) => {
    if (!file) return
    setIsImporting(true)
    setImportMessage(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/calendar-events', { method: 'POST', body: form })
      const payload = await response.json()
      if (!response.ok || !payload?.ok) {
        setImportMessage(payload?.migrationRequired ? 'Calendar storage migration is required before importing.' : payload?.error || 'Timetable import failed.')
        return
      }
      setImportMessage(`${payload.imported} classes imported · ${payload.matched} matched to Units · ${payload.unmatched} need no Unit or manual review.`)
      await loadEvents()
    } finally {
      setIsImporting(false)
    }
  }

  if (!current) {
    return (
      <Card className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Semester timeline</p>
        <p className="text-sm text-slate-600">Add your units and schedule to start tracking the semester timeline.</p>
      </Card>
    )
  }

  const classEvents = events.filter((event) => !event.is_assessment)
  const assessmentEvents = events.filter((event) => event.is_assessment)

  return (
    <div className="space-y-4">
    <Card className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Semester timeline</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">{current.label}</h2>
          <p className="mt-1 text-sm text-slate-600">{formatSemesterRange(current.start, current.end)}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Current period</p>
          <p>{current.phase === 'teaching' ? 'Teaching week' : current.label}</p>
          {source ? <p className="mt-1 text-xs text-slate-500">Source: {source}{stale ? ' (stale cache)' : ''}</p> : null}
        </div>
      </div>

      <div id="calendar-import" className="border-t border-slate-200 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-950">Import Class Timetable (.ics)</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">In Allocate+, open your personal timetable, choose Export, select iCalendar (.ics), then upload the downloaded file here.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            <Upload className="mr-2 h-4 w-4" />{isImporting ? 'Importing...' : 'Choose .ics file'}
            <input type="file" accept=".ics,text/calendar" className="hidden" disabled={isImporting} onChange={(event) => void importCalendar(event.target.files?.[0])} />
          </label>
        </div>
        {importMessage ? <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{importMessage}</p> : null}
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <Button variant="outline" onClick={() => openDetailedCalendar(undefined, calendarView)}>View timeline/calendar</Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {timeline.map((entry) => {
          const isCurrent = entry.label === current.label
          const isCompleted = timeline.findIndex((item) => item.label === entry.label) < timeline.findIndex((item) => item.label === current.label)
          const start = parseMaybeDate(entry.start)
          return (
            <button
              key={entry.label}
              type="button"
              onClick={() => openDetailedCalendar(start || new Date(), 'week')}
              className={`rounded-2xl border p-3 text-sm ${isCurrent ? 'border-sky-300 bg-sky-50' : isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-950">{entry.label}</p>
                {isCurrent ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">Now</span> : null}
              </div>
              <p className="mt-1 text-slate-600">{formatSemesterRange(entry.start, entry.end)}</p>
            </button>
          )
        })}
      </div>
    </Card>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-sky-700" /><h2 className="font-semibold text-slate-950">Actual Classes</h2></div>
        {classEvents.slice(0, 20).map((event) => <div key={event.id} className="border-t border-slate-100 pt-3"><p className="text-sm font-medium text-slate-900">{event.unit_code ? `${event.unit_code} · ` : ''}{event.title}</p><p className="mt-1 text-xs text-slate-500">{new Date(event.starts_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}{event.location ? ` · ${event.location}` : ''}</p></div>)}
        {!classEvents.length ? <p className="text-sm text-slate-600">Import your Allocate+ timetable to see confirmed class times here.</p> : null}
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold text-slate-950">Assessments</h2>
        {assessmentEvents.slice(0, 20).map((event) => <div key={event.id} className="border-t border-slate-100 pt-3"><p className="text-sm font-medium text-slate-900">{event.unit_code ? `${event.unit_code} · ` : ''}{event.title}</p><p className="mt-1 text-xs text-slate-500">{new Date(event.starts_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>)}
        {!assessmentEvents.length ? <p className="text-sm text-slate-600">No assessment events were found in the imported timetable.</p> : null}
      </Card>
    </div>

    {showDetailedCalendar ? (
      <div ref={calendarRef}>
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Detailed Academic Calendar</h2>
            <p className="text-sm text-slate-600">Unified timeline for classes, unit topics, assessments and planner tasks. Hidden items are only hidden from this view.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={goToToday}>Today</Button>
            <Button variant="outline" onClick={() => shiftWindow('prev')}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => shiftWindow('next')}><ChevronRight className="h-4 w-4" /></Button>
            {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map((view) => (
              <Button
                key={view}
                variant={calendarView === view ? 'default' : 'outline'}
                onClick={() => setCalendarView(view)}
              >
                {view === 'month' ? 'Month' : view === 'week' ? 'Week' : view === 'day' ? 'Day' : 'Agenda'}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">{visibleLabel}</p>
          <Button variant="ghost" onClick={resetVisibility}>Reset visibility filters</Button>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap gap-2">
            {(['class', 'assessment', 'planner', 'unit_schedule', 'semester'] as CalendarSource[]).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => toggleSource(entry)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${calendarSettings.enabledSources[entry] ? 'border-slate-300 bg-white text-slate-800' : 'border-slate-200 bg-slate-100 text-slate-500'}`}
              >
                {SOURCE_LABELS[entry]} ({sourceCounts[entry]})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {courses.map((course) => {
              const active = calendarSettings.selectedUnitIds.includes(course.id)
              const unitColor = normalizeUnitColor(course.color)
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => toggleUnit(course.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
                  style={!active && unitColor ? { borderColor: hexToRgba(unitColor, 0.5) } : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={colorDotStyle(unitColor)} />
                  {course.course_code}
                </button>
              )
            })}
          </div>
        </div>

        {calendarView === 'month' ? (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              {DAY_NAMES.map((name) => <div key={name}>{name}</div>)}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
              {monthCells.cells.map((date) => {
                const inMonth = date >= monthCells.monthStart && date <= monthCells.monthEnd
                const dayEvents = eventsForDay(date)
                return (
                  <button
                    key={dateKey(date)}
                    type="button"
                    onClick={() => { setFocusDate(date); setCalendarView('day') }}
                    className={`min-h-36 rounded-2xl border p-2 text-left ${inMonth ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'}`}
                  >
                    <p className={`text-xs font-semibold ${inMonth ? 'text-slate-800' : 'text-slate-400'}`}>{date.getDate()}</p>
                    <div className="mt-2 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <EventChip key={`${event.id}-${dateKey(date)}`} event={event} />
                      ))}
                      {dayEvents.length > 3 ? <p className="text-xs text-slate-500">+{dayEvents.length - 3} more</p> : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {calendarView === 'week' ? (
          <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1500px] grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const dayEvents = eventsForDay(day)
              return (
                <div key={dateKey(day)} className="min-h-[14rem] rounded-2xl border border-slate-200 bg-white p-3.5">
                  <button type="button" onClick={() => { setFocusDate(day); setCalendarView('day') }} className="w-full text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{day.toLocaleDateString('en-AU', { weekday: 'short' })}</p>
                    <p className="text-base font-semibold text-slate-900">{day.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</p>
                  </button>
                  <div className="mt-3 space-y-2.5">
                    {dayEvents.length ? dayEvents.map((event) => <EventChip key={`${event.id}-${dateKey(day)}`} event={event} />) : <p className="text-xs text-slate-500">No events</p>}
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        ) : null}

        {calendarView === 'day' ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Click an item to open its existing manager screen.</p>
            <div className="space-y-2">
              {eventsForDay(focusDate).length ? eventsForDay(focusDate).map((event) => <EventChip key={`${event.id}-${dateKey(focusDate)}`} event={event} />) : <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No events for this day.</p>}
            </div>
          </div>
        ) : null}

        {calendarView === 'agenda' ? (
          <div className="space-y-3">
            {agendaItems.length ? (
              Array.from(new Map(agendaItems.map((event) => [dateKey(event.start), event.start])).entries()).map(([key, date]) => {
                const items = agendaItems.filter((event) => dateKey(event.start) === key)
                return (
                  <div key={key} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900">{date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    {items.map((event) => <EventChip key={`${event.id}-${key}`} event={event} />)}
                  </div>
                )
              })
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No upcoming events in this window.</p>
            )}
          </div>
        ) : null}
      </Card>
      </div>
    ) : null}

    {topicDetailEvent ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" onClick={() => setTopicDetailEvent(null)}>
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Weekly topic detail</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">{topicDetailEvent.unitCode ? `${topicDetailEvent.unitCode} · ` : ''}{compactTopicPreview(topicDetailEvent)}</h3>
            </div>
            <Button variant="outline" onClick={() => setTopicDetailEvent(null)}>Close</Button>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-900">Window:</span> {topicDetailEvent.start.toLocaleDateString('en-AU', { dateStyle: 'medium' })} - {topicDetailEvent.end.toLocaleDateString('en-AU', { dateStyle: 'medium' })}</p>
            {topicDetailEvent.meta ? <p><span className="font-semibold text-slate-900">Week:</span> {topicDetailEvent.meta}</p> : null}
            {topicDetailEvent.notes ? <p><span className="font-semibold text-slate-900">Details:</span> {topicDetailEvent.notes}</p> : <p>No additional topic notes were provided for this week.</p>}
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="secondary" onClick={() => window.location.assign('/semester-timeline#curriculum')}>Open Curriculum Editor</Button>
          </div>
        </div>
      </div>
    ) : null}
    </div>
  )
}