import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getPlanningContext } from '@/lib/planning/context'
import { dateKey, extractJsonObject, timeKey, validatePlannerDrafts } from '@/lib/planning/day'
import { generateTutorReply } from '@/lib/tutor/provider'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Sign in to use AI planning.', code: 'UNAUTHENTICATED' }, { status: 401 })
    const body = await request.json().catch(() => null)
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    const selectedDate = typeof body?.selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.selectedDate) ? body.selectedDate : ''
    if (!message || !selectedDate) return NextResponse.json({ ok: false, error: 'A planning request and selected date are required.' }, { status: 400 })

    const context = await getPlanningContext(user.id, new Date(`${selectedDate}T12:00:00`))
    const existingTasks = context.tasks.filter((task) => task.plannedDate && dateKey(task.plannedDate, context.timezone) === selectedDate)
    const events = context.calendarEvents.filter((event) => dateKey(event.startsAt, context.timezone) === selectedDate)
    const occupied = [
      ...existingTasks.filter((task) => task.plannedDate).map((task) => ({
        startTime: timeKey(task.plannedDate as string, context.timezone),
        estimatedMinutes: task.estimatedMinutes
      })),
      ...events.map((event) => ({
        startTime: timeKey(event.startsAt, context.timezone),
        estimatedMinutes: Math.max(5, Math.round((new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 60000))
      }))
    ]

    const known = {
      selectedDate,
      existingTasks: existingTasks.map((task) => ({ title: task.title, start: task.plannedDate, minutes: task.estimatedMinutes, status: task.status, courseCode: task.unitCode })),
      fixedEvents: events.map((event) => ({ title: event.title, start: event.startsAt, end: event.endsAt, courseCode: event.unitCode })),
      assessments: context.assessments.map((assessment) => ({ id: assessment.id, name: assessment.name, courseCode: assessment.unitCode, dueDate: assessment.dueDate, estimatedMinutes: assessment.estimatedMinutes, status: assessment.status })),
      units: context.units.map((unit) => ({ code: unit.code, name: unit.name })),
      unfinishedTasks: context.tasks.filter((task) => task.status !== 'completed' && task.plannedDate && dateKey(task.plannedDate, context.timezone) < selectedDate).map((task) => ({ id: task.id, title: task.title, plannedDate: task.plannedDate, minutes: task.estimatedMinutes, courseCode: task.unitCode }))
    }

    const reply = await generateTutorReply({
      userId: user.id,
      systemPrompt: `You are the MuksBooks planning assistant. Produce a realistic proposed schedule, never silently modify data, never invent commitments, and never mark an assessment complete. Treat fixedEvents and existingTasks as KNOWN; everything you add is SUGGESTED. Avoid overlaps. Use breaks and reasonable transition time. Return JSON only in this exact shape: {"summary":"short explanation","items":[{"title":"string","date":"YYYY-MM-DD","startTime":"HH:MM or null","estimatedMinutes":number,"taskType":"study|personal|fixed|assessment_work|task","courseCode":"string or null","assessmentId":"string or null","rationale":"short reason"}]}. For assignment work, link assessmentId but create only work sessions, never assessment completion.`,
      userPrompt: `Student request: ${message}\n\nKnown planning context:\n${JSON.stringify(known)}`
    })
    const parsed = extractJsonObject(reply?.text || '')
    const proposal = validatePlannerDrafts(parsed, selectedDate, occupied)
    if (!proposal) return NextResponse.json({ ok: false, error: 'The AI returned an invalid schedule. Please try a more specific request.' }, { status: 502 })
    return NextResponse.json({ ok: true, proposal, knownContext: { selectedDate, existingCount: existingTasks.length, fixedEventCount: events.length } })
  } catch (error) {
    console.error('Planner proposal failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not generate a plan.' }, { status: 500 })
  }
}
