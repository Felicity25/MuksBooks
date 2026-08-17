import { NextResponse } from 'next/server'
import { getDashboard } from '@/lib/app-state/service'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getCurrentSemesterWeek } from '@/lib/semester-calendar'
import { getSemesterCalendarSnapshot } from '@/lib/semester-calendar-server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    const data = getDashboard(user?.id || 'default')

    const snapshot = await getSemesterCalendarSnapshot(new Date(), { allowRefresh: true })
    const current = getCurrentSemesterWeek(new Date(), snapshot.calendar)
    if (current) {
      data.currentWeek = {
        label: current.label,
        start: current.start,
        end: current.end,
        phase: current.phase,
        weekNumber: current.weekNumber || null
      }
    }

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Dashboard failed to load:', error)
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Dashboard data could not be loaded.',
      data: null
    }, { status: 500 })
  }
}
