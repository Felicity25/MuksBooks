import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSemesterWeek, getSemesterTimeline } from '@/lib/semester-calendar'
import { getSemesterCalendarSnapshot } from '@/lib/semester-calendar-server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === '1'

    const snapshot = await getSemesterCalendarSnapshot(new Date(), {
      forceRefresh: refresh,
      allowRefresh: true
    })

    const current = getCurrentSemesterWeek(new Date(), snapshot.calendar)
    const timeline = getSemesterTimeline(new Date(), snapshot.calendar)

    return NextResponse.json({
      ok: true,
      source: snapshot.source,
      sourceUrl: snapshot.sourceUrl || null,
      fetchedAt: snapshot.fetchedAt || null,
      stale: Boolean(snapshot.stale),
      calendar: snapshot.calendar,
      current,
      timeline
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to load semester calendar' }, { status: 500 })
  }
}
