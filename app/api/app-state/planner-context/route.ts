import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getPlanningContext } from '@/lib/planning/context'
import { generatePlannerRecommendations } from '@/lib/planning/recommendations'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Authentication required', data: null }, { status: 401 })
    }

    const context = await getPlanningContext(user.id)
    if (!context.authenticated) {
      return NextResponse.json({ ok: false, error: 'Planning context is unavailable', data: null }, { status: 503 })
    }

    const recommendations = generatePlannerRecommendations(context)
    return NextResponse.json({
      ok: true,
      data: {
        courses: context.units.map((unit) => ({ id: unit.id, course_code: unit.code, course_name: unit.name })),
        currentWeek: context.currentWeek,
        scheduleByUnit: context.scheduleByUnit,
        calendarEvents: context.calendarEvents,
        academicUploads: context.academicUploads,
        assessments: context.assessments,
        existingTasks: context.tasks,
        recommendations,
        proactivityLevel: context.proactivityLevel
      }
    })
  } catch (error) {
    console.error('[PlannerContext GET] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error), data: null }, { status: 500 })
  }
}
