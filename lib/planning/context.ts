import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentSemesterWeek } from '@/lib/semester-calendar'
import { getSemesterCalendarSnapshot } from '@/lib/semester-calendar-server'
import {
  listCloudUnits,
  listAllScheduleEntries,
  listCalendarEvents,
  listCloudDocuments,
  listCloudAssessments
} from '@/lib/supabase/documents-service'
import { listUserTasks } from '@/lib/cloud/service'
import { normalizeUserSettings, type ProactivityControls, type ProactivityLevel } from '@/lib/user-settings'

export interface PlanningUnit {
  id: string
  code: string
  name: string
  status: string
  masteryLevel: number
}

export interface PlanningScheduleEntry {
  id: string
  unitId: string
  weekNumber: number
  startDate: string | null
  endDate: string | null
  topic: string
  additionalTopics: string[]
  isBreak: boolean
}

export interface PlanningCalendarEvent {
  id: string
  unitId: string | null
  unitCode: string | null
  title: string
  activityType: string | null
  isAssessment: boolean
  startsAt: string
  endsAt: string
  location: string | null
  source: string
}

export interface PlanningUpload {
  id: string
  documentId: string
  filename: string
  courseCode: string | null
  unitId: string | null
  resourceType: string | null
  documentType: string | null
  week: number | null
  topic: string | null
  domain: string
}

export interface PlanningAssessment {
  id: string
  unitId: string | null
  unitCode: string | null
  name: string
  assessmentType: string
  weighting: number | null
  dueDate: string | null
  dueTimeKnown: boolean
  estimatedMinutes: number | null
  notes: string | null
  status: string
  source: 'academic' | 'career'
}

export interface PlanningTask {
  id: string
  unitId: string | null
  unitCode: string | null
  title: string
  taskType: string | null
  status: string
  plannedDate: string | null
  dueDate: string | null
  estimatedMinutes: number
  generatedBy: string
  assessmentId: string | null
}

export interface PlanningContext {
  authenticated: boolean
  generatedAt: string
  currentWeek: { weekNumber: number | null; label: string; start: string; end: string; phase: string } | null
  units: PlanningUnit[]
  scheduleByUnit: Record<string, PlanningScheduleEntry[]>
  calendarEvents: PlanningCalendarEvent[]
  academicUploads: PlanningUpload[]
  assessments: PlanningAssessment[]
  tasks: PlanningTask[]
  proactivityLevel: ProactivityLevel
  proactivityControls: ProactivityControls
}

function emptyContext(): PlanningContext {
  const defaults = normalizeUserSettings(null)
  return {
    authenticated: false,
    generatedAt: new Date().toISOString(),
    currentWeek: null,
    units: [],
    scheduleByUnit: {},
    calendarEvents: [],
    academicUploads: [],
    assessments: [],
    tasks: [],
    proactivityLevel: defaults.proactivityLevel,
    proactivityControls: defaults.proactivityControls
  }
}

async function getCloudProactivitySettings(userId: string) {
  const client = createSupabaseServerClient()
  const defaults = normalizeUserSettings(null)
  if (!client) return { level: defaults.proactivityLevel, controls: defaults.proactivityControls }

  try {
    const { data } = await client.from('user_settings').select('preferences').eq('user_id', userId).maybeSingle()
    const normalized = normalizeUserSettings(data?.preferences || null)
    return { level: normalized.proactivityLevel, controls: normalized.proactivityControls }
  } catch {
    return { level: defaults.proactivityLevel, controls: defaults.proactivityControls }
  }
}

/**
 * Assemble the single, authoritative snapshot of "what is real" for a student's academic
 * planning: their canonical units, confirmed weekly schedule, imported class timetable,
 * academic (non-career) uploaded material, assessments, and existing planner tasks.
 *
 * This is cloud-first and returns an empty-but-valid context for unauthenticated users —
 * the Planner should prompt sign-in rather than fabricate demo data in that case.
 */
export async function getPlanningContext(userId: string | undefined | null): Promise<PlanningContext> {
  if (!userId) return emptyContext()

  const now = new Date()
  const calendarRangeStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const calendarRangeEnd = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString()

  const [cloudUnits, allSchedule, calendarEventsRaw, cloudDocs, cloudAssessments, tasksRaw, proactivity, snapshot] = await Promise.all([
    listCloudUnits(userId),
    listAllScheduleEntries(userId),
    listCalendarEvents(userId, calendarRangeStart, calendarRangeEnd),
    listCloudDocuments(userId),
    listCloudAssessments(userId),
    listUserTasks(),
    getCloudProactivitySettings(userId),
    getSemesterCalendarSnapshot(new Date(), { allowRefresh: true }).catch(() => null)
  ])

  if (cloudUnits === null) {
    // No Supabase connection available at all — return an empty, clearly-unauthenticated shape.
    return emptyContext()
  }

  const current = snapshot ? getCurrentSemesterWeek(new Date(), snapshot.calendar) : null

  const units: PlanningUnit[] = cloudUnits.map((unit: any) => ({
    id: unit.id,
    code: unit.code,
    name: unit.name,
    status: unit.status || 'active',
    masteryLevel: Number(unit.mastery_level ?? 0)
  }))
  const unitById = new Map(units.map((u) => [u.id, u]))

  const scheduleByUnit: Record<string, PlanningScheduleEntry[]> = {}
  for (const entry of allSchedule || []) {
    const unitId = (entry as any).unit_id
    if (!unitId) continue
    const list = scheduleByUnit[unitId] || (scheduleByUnit[unitId] = [])
    list.push({
      id: (entry as any).id,
      unitId,
      weekNumber: (entry as any).week_number,
      startDate: (entry as any).start_date ?? null,
      endDate: (entry as any).end_date ?? null,
      topic: (entry as any).topic,
      additionalTopics: Array.isArray((entry as any).additional_topics) ? (entry as any).additional_topics : [],
      isBreak: Boolean((entry as any).is_break)
    })
  }

  const calendarEvents: PlanningCalendarEvent[] = (calendarEventsRaw || []).map((event: any) => ({
    id: event.id,
    unitId: event.unit_id ?? null,
    unitCode: event.unit_code ?? null,
    title: event.title,
    activityType: event.activity_type ?? null,
    isAssessment: Boolean(event.is_assessment),
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    location: event.location ?? null,
    source: event.source || 'ical'
  }))

  // Only surface uploads that are (a) tagged as academic material (never CVs/career docs) and
  // (b) actually bound to a real unit. Anything else belongs in "needs organisation", not planning.
  const academicUploads: PlanningUpload[] = (cloudDocs || [])
    .filter((doc: any) => (doc.domain ?? 'academic') === 'academic' && doc.document_type !== 'CV')
    .map((doc: any) => ({
      id: doc.id,
      documentId: doc.document_id,
      filename: doc.original_filename,
      courseCode: doc.course_code ?? null,
      unitId: doc.unit_id ?? null,
      resourceType: doc.resource_type ?? null,
      documentType: doc.document_type ?? null,
      week: doc.week ?? null,
      topic: doc.topic ?? null,
      domain: doc.domain ?? 'academic'
    }))

  const assessments: PlanningAssessment[] = (cloudAssessments || []).map((assessment: any) => ({
    id: assessment.id,
    unitId: assessment.unit_id ?? null,
    unitCode: assessment.units?.code ?? null,
    name: assessment.name,
    assessmentType: assessment.assessment_type || 'assignment',
    weighting: assessment.weighting != null ? Number(assessment.weighting) : null,
    dueDate: assessment.due_date ?? null,
    dueTimeKnown: assessment.due_time_known !== false,
    estimatedMinutes: assessment.estimated_minutes != null ? Number(assessment.estimated_minutes) : null,
    notes: assessment.notes ?? null,
    status: assessment.status || 'upcoming',
    source: 'academic'
  }))

  const tasks: PlanningTask[] = (tasksRaw || []).map((task: any) => ({
    id: task.id,
    unitId: task.unit_id ?? null,
    unitCode: task.units?.code ?? null,
    title: task.title,
    taskType: task.task_type ?? null,
    status: task.status || 'pending',
    plannedDate: task.planned_date ?? null,
    dueDate: task.due_date ?? null,
    estimatedMinutes: task.estimated_minutes ?? 45,
    generatedBy: task.created_by || 'user',
    assessmentId: task.assessment_id ?? null
  }))

  void unitById // reserved for future unit-name lookups when rendering suggestions

  return {
    authenticated: true,
    generatedAt: new Date().toISOString(),
    currentWeek: current
      ? { weekNumber: current.weekNumber ?? null, label: current.label, start: current.start, end: current.end, phase: current.phase }
      : null,
    units,
    scheduleByUnit,
    calendarEvents,
    academicUploads,
    assessments,
    tasks,
    proactivityLevel: proactivity.level,
    proactivityControls: proactivity.controls
  }
}
