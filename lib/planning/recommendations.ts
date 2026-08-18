import type { PlanningContext, PlanningUpload } from './context'
import type { ProactivityControls } from '@/lib/user-settings'

export type RecommendationKind =
  | 'lecture_prep'
  | 'tutorial_prep'
  | 'workshop_prep'
  | 'post_class_review'
  | 'assessment_prep'
  | 'assessment_work_session'
  | 'catch_up'
  | 'deep_dive'
  | 'timetable_nudge'

export interface PlannerRecommendation {
  id: string
  unitCode: string | null
  title: string
  detail: string
  kind: RecommendationKind
  /** Human-readable citations for exactly why this suggestion appeared — never fabricated. */
  sources: string[]
  score: number
  estimatedMinutes: number
  askTutorHref: string | null
  openDocumentId: string | null
  /** Only present for schedulable work sessions: alternative durations (minutes) that still fit the found free slot. */
  durationOptionsMinutes?: number[]
  suggestedTask: {
    title: string
    courseCode: string | null
    taskType: string
    estimatedMinutes: number
    priority: number
    plannedDate?: string | null
    assessmentId?: string | null
  }
}

const DAY_MS = 86_400_000

function daysUntil(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  return (new Date(value).getTime() - Date.now()) / DAY_MS
}

/** Prep-resource types roughly relevant to a given class type, checked before general fallbacks. */
const PREP_RESOURCE_TYPES: Record<string, string[]> = {
  Lecture: ['LECTURE_SLIDES', 'LECTURE', 'READING', 'TEXTBOOK_CHAPTER'],
  Tutorial: ['TUTORIAL', 'TUTORIAL_SOLUTIONS'],
  Workshop: ['WORKSHOP', 'WORKSHOP_SOLUTIONS'],
  Seminar: ['LECTURE_SLIDES', 'READING'],
  Practical: ['WORKSHOP', 'DATASET']
}

const REVIEW_RESOURCE_TYPES = ['LECTURE_SLIDES', 'NOTES', 'TUTORIAL_SOLUTIONS', 'WORKSHOP_SOLUTIONS']

function findMatchingUpload(uploads: PlanningUpload[], unitId: string, week: number | null, topic: string | null, resourceTypes: string[]): PlanningUpload | null {
  const unitUploads = uploads.filter((upload) => upload.unitId === unitId)
  const normalizedTypes = new Set(resourceTypes.map((resourceType) => resourceType.toUpperCase()))
  const byType = unitUploads.filter((upload) => upload.resourceType && normalizedTypes.has(upload.resourceType.toUpperCase()))

  const exact = byType.find((upload) => week != null && upload.week === week)
  if (exact) return exact

  if (topic) {
    const lowerTopic = topic.toLowerCase()
    const byTopic = byType.find((upload) => upload.topic && lowerTopic.includes(upload.topic.toLowerCase()))
    if (byTopic) return byTopic
  }

  return byType[0] || null
}

function buildAskTutorHref(unitCode: string | null, topic: string | null, prompt: string) {
  const params = new URLSearchParams()
  if (unitCode) params.set('unit', unitCode)
  if (topic) params.set('topic', topic)
  params.set('prompt', prompt)
  return `/ai-tutor?${params.toString()}`
}

// ─── Assessment work-session scheduling ─────────────────────────────────────
// Deterministic free-time finder that turns "an assessment is due soon" into concrete,
// non-overlapping work sessions of at least 60 minutes, sized to real gaps between a
// student's confirmed classes and already-planned tasks.

interface BusyInterval { start: number; end: number }
interface FreeSlot { start: Date; end: Date }

const MIN_SESSION_MINUTES = 60
const MAX_SESSION_MINUTES = 180
const PREFERRED_SESSION_MINUTES = 120
const MAX_SESSIONS_PER_ASSESSMENT = 4
const DURATION_OPTIONS_MINUTES = [60, 90, 120, 150, 180]
const STUDY_WINDOW_START_HOUR = 8
const STUDY_WINDOW_END_HOUR = 22
const SCHEDULING_HORIZON_DAYS = 21

const DEFAULT_ASSESSMENT_MINUTES: Record<string, number> = {
  exam: 240,
  'mid-semester test': 180,
  test: 150,
  quiz: 90,
  presentation: 120,
  report: 180,
  project: 240,
  assignment: 180
}

function defaultEstimateMinutes(assessment: PlanningContext['assessments'][number]): number {
  const key = (assessment.assessmentType || '').toLowerCase()
  let base = DEFAULT_ASSESSMENT_MINUTES[key] ?? 120
  if (typeof assessment.weighting === 'number' && assessment.weighting >= 30) base += 60
  return base
}

function scheduledMinutesForAssessment(tasks: PlanningContext['tasks'], assessmentId: string): number {
  return tasks.filter((task) => task.assessmentId === assessmentId).reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0)
}

/** Busy intervals a work session must never overlap: confirmed classes plus any already-planned task. */
function buildBusyIntervals(context: PlanningContext): BusyInterval[] {
  const intervals: BusyInterval[] = []
  for (const event of context.calendarEvents) {
    const start = new Date(event.startsAt).getTime()
    const end = new Date(event.endsAt).getTime()
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) intervals.push({ start, end })
  }
  for (const task of context.tasks) {
    if (!task.plannedDate || task.status === 'completed') continue
    const start = new Date(task.plannedDate).getTime()
    if (!Number.isFinite(start)) continue
    const end = start + (task.estimatedMinutes || 45) * 60_000
    intervals.push({ start, end })
  }
  return intervals.sort((a, b) => a.start - b.start)
}

/** Free gaps (>= minMinutes) within the daily study window, for a single calendar day. */
function dailyFreeGaps(day: Date, busy: BusyInterval[], rangeStart: Date, rangeEnd: Date): BusyInterval[] {
  const dayStart = new Date(day)
  dayStart.setHours(STUDY_WINDOW_START_HOUR, 0, 0, 0)
  const dayEnd = new Date(day)
  dayEnd.setHours(STUDY_WINDOW_END_HOUR, 0, 0, 0)
  const windowStart = Math.max(dayStart.getTime(), rangeStart.getTime())
  const windowEnd = Math.min(dayEnd.getTime(), rangeEnd.getTime())
  if (windowEnd <= windowStart) return []

  const dayBusy = busy
    .filter((interval) => interval.end > windowStart && interval.start < windowEnd)
    .map((interval) => ({ start: Math.max(interval.start, windowStart), end: Math.min(interval.end, windowEnd) }))
    .sort((a, b) => a.start - b.start)

  const gaps: BusyInterval[] = []
  let cursor = windowStart
  for (const interval of dayBusy) {
    if (interval.start > cursor) gaps.push({ start: cursor, end: interval.start })
    cursor = Math.max(cursor, interval.end)
  }
  if (cursor < windowEnd) gaps.push({ start: cursor, end: windowEnd })
  return gaps
}

/** All free gaps (>= minMinutes) between rangeStart and rangeEnd, across the scheduling horizon. */
function findFreeGaps(rangeStart: Date, rangeEnd: Date, busy: BusyInterval[], minMinutes: number): BusyInterval[] {
  const allGaps: BusyInterval[] = []
  const cursorDay = new Date(rangeStart)
  cursorDay.setHours(0, 0, 0, 0)
  for (let i = 0; i < SCHEDULING_HORIZON_DAYS && cursorDay.getTime() <= rangeEnd.getTime(); i++) {
    const gaps = dailyFreeGaps(cursorDay, busy, rangeStart, rangeEnd).filter((gap) => (gap.end - gap.start) / 60_000 >= minMinutes)
    allGaps.push(...gaps)
    cursorDay.setDate(cursorDay.getDate() + 1)
  }
  return allGaps
}

/** Split `remainingMinutes` of work into non-overlapping sessions (>= 60 min) that fit the given free gaps. */
function scheduleAssessmentSessions(freeGaps: BusyInterval[], remainingMinutes: number): Array<FreeSlot & { minutes: number; maxAvailable: number }> {
  const sessions: Array<FreeSlot & { minutes: number; maxAvailable: number }> = []
  let remaining = remainingMinutes

  for (const gap of freeGaps) {
    if (remaining <= 0 || sessions.length >= MAX_SESSIONS_PER_ASSESSMENT) break
    const gapMinutes = (gap.end - gap.start) / 60_000
    if (gapMinutes < MIN_SESSION_MINUTES) continue

    const preferred = Math.min(PREFERRED_SESSION_MINUTES, remaining)
    const capped = Math.max(MIN_SESSION_MINUTES, Math.min(preferred, gapMinutes, MAX_SESSION_MINUTES))
    const minutes = Math.max(MIN_SESSION_MINUTES, Math.floor(capped / 30) * 30)
    const start = new Date(gap.start)
    const end = new Date(start.getTime() + minutes * 60_000)
    const maxAvailable = Math.max(minutes, Math.floor(Math.min(gapMinutes, MAX_SESSION_MINUTES) / 30) * 30)
    sessions.push({ start, end, minutes, maxAvailable })
    remaining -= minutes
  }

  return sessions
}

function formatClockTime(date: Date) {
  return date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
}

/**
 * Generate a deterministic, source-cited set of planner recommendations from real academic
 * data only (canonical units, confirmed schedule, imported timetable, uploaded material,
 * assessments, existing tasks). No network/LLM calls — safe to run on every Planner load.
 */
export function generatePlannerRecommendations(context: PlanningContext, referenceDate: Date = new Date()): PlannerRecommendation[] {
  if (!context.authenticated) return []
  const { controls, level } = { controls: context.proactivityControls, level: context.proactivityLevel }
  const items: PlannerRecommendation[] = []
  let timetableNudgeUsed = false

  for (const unit of context.units) {
    const schedule = context.scheduleByUnit[unit.id] || []
    const currentEntry = context.currentWeek?.weekNumber != null
      ? schedule.find((entry) => entry.weekNumber === context.currentWeek?.weekNumber)
      : undefined
    const unitEvents = context.calendarEvents.filter((event) => event.unitId === unit.id || (!event.unitId && event.unitCode === unit.code))

    if (unitEvents.length === 0) {
      if (!timetableNudgeUsed) {
        timetableNudgeUsed = true
        items.push({
          id: `timetable-nudge-${unit.id}`,
          unitCode: unit.code,
          title: `Import your timetable for ${unit.code}`,
          detail: 'Add your .ics class schedule so the Planner can prepare you before each lecture, tutorial and workshop.',
          kind: 'timetable_nudge',
          sources: ['No timetable imported for this unit yet.'],
          score: 10,
          estimatedMinutes: 5,
          askTutorHref: null,
          openDocumentId: null,
          suggestedTask: { title: `Import timetable for ${unit.code}`, courseCode: unit.code, taskType: 'admin', estimatedMinutes: 5, priority: 0.2 }
        })
      }
      continue
    }

    for (const event of unitEvents) {
      if (event.isAssessment) continue
      const occurrence = new Date(event.startsAt)
      if (Number.isNaN(occurrence.getTime())) continue
      const hoursUntil = (occurrence.getTime() - referenceDate.getTime()) / 3_600_000
      const eventType = event.activityType || 'Class'
      const startTimeLabel = occurrence.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })

      const controlKey: keyof ProactivityControls | null = eventType === 'Lecture' ? 'lecturePreparation'
        : eventType === 'Tutorial' ? 'tutorialPreparation'
        : eventType === 'Workshop' ? 'workshopPreparation'
        : null

      // Upcoming class within the next 3 days → prep suggestion.
      if (controlKey && controls[controlKey] && hoursUntil >= 0 && hoursUntil <= 72) {
        const resourceTypes = PREP_RESOURCE_TYPES[eventType] || []
        const upload = findMatchingUpload(context.academicUploads, unit.id, currentEntry?.weekNumber ?? null, currentEntry?.topic ?? null, resourceTypes)
        const topic = currentEntry?.topic || null
        const sources = [
          currentEntry ? `Unit Schedule — Week ${currentEntry.weekNumber}: ${currentEntry.topic}` : `Timetable — ${event.title}`,
          upload ? `Uploaded: ${upload.filename}` : 'No matching uploaded material found yet.'
        ]
        items.push({
          id: `${eventType.toLowerCase()}-prep-${event.id}`,
          unitCode: unit.code,
          title: `Prepare for ${unit.code} ${eventType}${topic ? `: ${topic}` : ''}`,
          detail: `${eventType} at ${startTimeLabel} on ${occurrence.toLocaleDateString('en-AU', { weekday: 'long' })}${event.location ? ` · ${event.location}` : ''}.`,
          kind: eventType === 'Lecture' ? 'lecture_prep' : eventType === 'Tutorial' ? 'tutorial_prep' : 'workshop_prep',
          sources,
          score: 95 - hoursUntil,
          estimatedMinutes: 30,
          askTutorHref: buildAskTutorHref(unit.code, topic, `Help me prepare for my ${unit.code} ${eventType.toLowerCase()}${topic ? ` on ${topic}` : ''}${upload ? ` using ${upload.filename}` : ''}.`),
          openDocumentId: upload?.documentId ?? null,
          suggestedTask: {
            title: `Prepare for ${eventType}${topic ? `: ${topic}` : ''}`,
            courseCode: unit.code,
            taskType: 'study',
            estimatedMinutes: 30,
            priority: 0.7
          }
        })
      }

      // Class ended within the last 48 hours → post-class review suggestion.
      const endedAt = new Date(event.endsAt)
      const hoursSince = Number.isNaN(endedAt.getTime()) ? Number.POSITIVE_INFINITY : (referenceDate.getTime() - endedAt.getTime()) / 3_600_000
      if (controls.postClassReview && hoursSince >= 0 && hoursSince <= 48) {
        const upload = findMatchingUpload(context.academicUploads, unit.id, currentEntry?.weekNumber ?? null, currentEntry?.topic ?? null, REVIEW_RESOURCE_TYPES)
        const topic = currentEntry?.topic || null
        items.push({
          id: `review-${event.id}`,
          unitCode: unit.code,
          title: `Review ${unit.code} ${eventType}${topic ? `: ${topic}` : ''}`,
          detail: `Consolidate what was covered in your ${eventType.toLowerCase()} while it's still fresh.`,
          kind: 'post_class_review',
          sources: [
            currentEntry ? `Unit Schedule — Week ${currentEntry.weekNumber}: ${currentEntry.topic}` : `Timetable — ${event.title}`,
            upload ? `Uploaded: ${upload.filename}` : 'No matching uploaded material found yet.'
          ],
          score: 60 - hoursSince,
          estimatedMinutes: 20,
          askTutorHref: buildAskTutorHref(unit.code, topic, `Quiz me on what was covered in my ${unit.code} ${eventType.toLowerCase()}${topic ? ` about ${topic}` : ''}.`),
          openDocumentId: upload?.documentId ?? null,
          suggestedTask: {
            title: `Review ${eventType}${topic ? `: ${topic}` : ''}`,
            courseCode: unit.code,
            taskType: 'review',
            estimatedMinutes: 20,
            priority: 0.5
          }
        })
      }
    }
  }

  if (controls.assessmentPreparation) {
    const cutoff = level === 'proactive' ? 21 : level === 'balanced' ? 10 : 4
    const busy = buildBusyIntervals(context)
    const horizonEnd = new Date(referenceDate.getTime() + SCHEDULING_HORIZON_DAYS * DAY_MS)

    for (const assessment of context.assessments) {
      const days = daysUntil(assessment.dueDate)
      if (days > cutoff || days < -1) continue

      const dueDate = assessment.dueDate ? new Date(assessment.dueDate) : null
      const totalMinutes = assessment.estimatedMinutes ?? defaultEstimateMinutes(assessment)
      const alreadyScheduled = scheduledMinutesForAssessment(context.tasks, assessment.id)
      const remaining = totalMinutes - alreadyScheduled
      // Already fully covered by accepted/planned work sessions — nothing more to suggest (avoids duplicates).
      if (remaining <= 0) continue

      const rangeEnd = dueDate && dueDate.getTime() < horizonEnd.getTime() ? dueDate : horizonEnd
      const freeGaps = rangeEnd.getTime() > referenceDate.getTime()
        ? findFreeGaps(referenceDate, rangeEnd, busy, MIN_SESSION_MINUTES)
        : []
      const sessions = scheduleAssessmentSessions(freeGaps, remaining)

      if (sessions.length === 0) {
        items.push({
          id: `assessment-${assessment.id}`,
          unitCode: assessment.unitCode,
          title: `Prepare ${assessment.name}`,
          detail: `${assessment.unitCode || 'Assessment'}${Number.isFinite(days) ? ` · ${Math.max(0, Math.ceil(days))} day(s) remaining` : ''} · No free time found before the deadline.`,
          kind: 'assessment_prep',
          sources: [`Assessment: ${assessment.name}${assessment.dueDate ? ` (due ${new Date(assessment.dueDate).toLocaleDateString('en-AU')})` : ''}`],
          score: 100 - Math.max(0, days),
          estimatedMinutes: Math.min(remaining, 60),
          askTutorHref: buildAskTutorHref(assessment.unitCode, null, `Help me prepare for ${assessment.name} in ${assessment.unitCode || 'this unit'}.`),
          openDocumentId: null,
          suggestedTask: { title: `Prepare ${assessment.name}`, courseCode: assessment.unitCode, taskType: 'assessment', estimatedMinutes: Math.min(remaining, 60), priority: 0.9 }
        })
        continue
      }

      sessions.forEach((session, index) => {
        const isLast = index === sessions.length - 1
        const verb = index === 0 ? 'Work on' : isLast ? 'Finish/review' : 'Continue'
        const dayLabel = session.start.toLocaleDateString('en-AU', { weekday: 'long' })
        const timeLabel = `${formatClockTime(session.start)}\u2013${formatClockTime(session.end)}`
        const durationOptionsMinutes = Array.from(new Set([
          ...DURATION_OPTIONS_MINUTES.filter((minutes) => minutes <= session.maxAvailable),
          session.minutes
        ])).sort((a, b) => a - b)

        items.push({
          id: `assessment-session-${assessment.id}-${index}-${session.start.toISOString()}`,
          unitCode: assessment.unitCode,
          title: `${verb} ${assessment.unitCode ? `${assessment.unitCode} ` : ''}${assessment.name}`,
          detail: `${dayLabel} ${timeLabel} · ${Math.round((session.minutes / 60) * 10) / 10}h${assessment.dueDate ? ` · Due ${new Date(assessment.dueDate).toLocaleDateString('en-AU')}` : ''}`,
          kind: 'assessment_work_session',
          sources: [
            `Assessment: ${assessment.name}${assessment.dueDate ? ` (due ${new Date(assessment.dueDate).toLocaleDateString('en-AU')})` : ''}`,
            assessment.estimatedMinutes
              ? `You estimated ${Math.round((assessment.estimatedMinutes / 60) * 10) / 10}h of work for this assessment.`
              : `Estimated based on assessment type${assessment.weighting ? ` and ${assessment.weighting}% weighting` : ''} (no estimate provided).`,
            'Free time found between your confirmed classes and existing Planner tasks.'
          ],
          score: 90 - Math.max(0, days) - index,
          estimatedMinutes: session.minutes,
          askTutorHref: buildAskTutorHref(assessment.unitCode, null, `Help me work on ${assessment.name} in ${assessment.unitCode || 'this unit'}.`),
          openDocumentId: null,
          durationOptionsMinutes,
          suggestedTask: {
            title: `${verb} ${assessment.name}`,
            courseCode: assessment.unitCode,
            taskType: 'assessment',
            estimatedMinutes: session.minutes,
            priority: 0.85,
            plannedDate: session.start.toISOString(),
            assessmentId: assessment.id
          }
        })
      })
    }
  }

  if (controls.catchUpTasks) {
    for (const task of context.tasks) {
      if (task.status === 'completed') continue
      const overdue = daysUntil(task.dueDate) < 0
      const plannedToday = task.plannedDate && new Date(task.plannedDate).toDateString() === referenceDate.toDateString()
      if (!overdue && !plannedToday) continue
      items.push({
        id: `catchup-${task.id}`,
        unitCode: task.unitCode,
        title: task.title,
        detail: `${task.unitCode || 'Study task'}${overdue ? ' · Overdue' : ' · Planned today'}`,
        kind: 'catch_up',
        sources: ['Existing planner task'],
        score: overdue ? 82 : 88,
        estimatedMinutes: task.estimatedMinutes,
        askTutorHref: buildAskTutorHref(task.unitCode, null, `Help me with: ${task.title}`),
        openDocumentId: null,
        suggestedTask: { title: task.title, courseCode: task.unitCode, taskType: task.taskType || 'study', estimatedMinutes: task.estimatedMinutes, priority: 0.6 }
      })
    }
  }

  if (level === 'proactive' && controls.deepDives && context.units.length > 0) {
    const weakest = [...context.units].sort((a, b) => a.masteryLevel - b.masteryLevel)[0]
    if (weakest && weakest.masteryLevel < 70) {
      items.push({
        id: `deep-dive-${weakest.id}`,
        unitCode: weakest.code,
        title: `Deep Dive: ${weakest.code}`,
        detail: `Build stronger understanding — current mastery is ${weakest.masteryLevel}%.`,
        kind: 'deep_dive',
        sources: [`Unit mastery tracker: ${weakest.code} at ${weakest.masteryLevel}%`],
        score: 25,
        estimatedMinutes: 30,
        askTutorHref: buildAskTutorHref(weakest.code, null, `I want to do a deep dive to improve my understanding of ${weakest.code}. Where should I focus?`),
        openDocumentId: null,
        suggestedTask: { title: `Deep dive: ${weakest.code}`, courseCode: weakest.code, taskType: 'study', estimatedMinutes: 30, priority: 0.4 }
      })
    }
  }

  const limit = level === 'quiet' ? 2 : level === 'balanced' ? 5 : 8
  return items.sort((left, right) => right.score - left.score).slice(0, limit)
}
