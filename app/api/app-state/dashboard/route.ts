import { NextResponse } from 'next/server'
import { getDashboard } from '@/lib/app-state/service'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getCurrentSemesterWeek } from '@/lib/semester-calendar'
import { getSemesterCalendarSnapshot } from '@/lib/semester-calendar-server'
import { listCloudUnits, listAllScheduleEntries } from '@/lib/supabase/documents-service'

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

    // Once authenticated, Supabase units are the source of truth — override the SQLite-derived
    // active course list so a deleted/renamed unit is reflected immediately on Home.
    if (user) {
      const cloudUnits = await listCloudUnits(user.id)
      if (cloudUnits !== null) {
        const allEntries = await listAllScheduleEntries(user.id)
        const topicCountByUnit = new Map<string, number>()
        if (allEntries) {
          for (const entry of allEntries) {
            const unitId = (entry as any).unit_id
            topicCountByUnit.set(unitId, (topicCountByUnit.get(unitId) || 0) + 1)
          }
        }

        data.activeCourses = cloudUnits.map((unit: any) => ({
          id: unit.id,
          course_code: unit.code,
          course_name: unit.name,
          avg_mastery: Math.max(0, Math.min(1, Number(unit.mastery_level ?? 0) / 100)),
          topic_count: topicCountByUnit.get(unit.id) || 0,
          mastery_level: Number(unit.mastery_level ?? 0)
        }))

        if (allEntries && current?.weekNumber) {
          data.currentTopics = allEntries
            .filter((entry: any) => entry.week_number === current.weekNumber)
            .map((entry: any) => ({
              id: entry.id,
              name: entry.topic,
              week: entry.week_number,
              course_code: entry.units?.code || null
            }))
        }
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
