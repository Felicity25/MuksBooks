import type { PlanningContext, PlanningUpload } from './context'
import type { ProactivityControls } from '@/lib/user-settings'

export type RecommendationKind =
  | 'lecture_prep'
  | 'tutorial_prep'
  | 'workshop_prep'
  | 'post_class_review'
  | 'assessment_prep'
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
  suggestedTask: {
    title: string
    courseCode: string | null
    taskType: string
    estimatedMinutes: number
    priority: number
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
    for (const assessment of context.assessments) {
      const days = daysUntil(assessment.dueDate)
      if (days > cutoff || days < -1) continue
      items.push({
        id: `assessment-${assessment.id}`,
        unitCode: assessment.unitCode,
        title: `Prepare ${assessment.name}`,
        detail: `${assessment.unitCode || 'Assessment'}${Number.isFinite(days) ? ` · ${Math.max(0, Math.ceil(days))} day(s) remaining` : ''}`,
        kind: 'assessment_prep',
        sources: [`Assessment: ${assessment.name}${assessment.dueDate ? ` (due ${new Date(assessment.dueDate).toLocaleDateString('en-AU')})` : ''}`],
        score: 100 - Math.max(0, days),
        estimatedMinutes: 45,
        askTutorHref: buildAskTutorHref(assessment.unitCode, null, `Help me prepare for ${assessment.name} in ${assessment.unitCode || 'this unit'}.`),
        openDocumentId: null,
        suggestedTask: { title: `Prepare ${assessment.name}`, courseCode: assessment.unitCode, taskType: 'assessment', estimatedMinutes: 45, priority: 0.9 }
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
