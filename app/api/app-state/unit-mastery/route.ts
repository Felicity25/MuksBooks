import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getUnitMastery, setUnitMastery } from '@/lib/app-state/service'
import { syncCloudMastery } from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    const mastery = getUnitMastery(user?.id || 'default')
    return NextResponse.json({ ok: true, mastery })
  } catch (error) {
    console.error('[UnitMastery GET] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error), mastery: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const courseId = String(body?.courseId || '').trim()
    const masteryLevel = Number(body?.masteryLevel)

    if (!courseId) {
      return NextResponse.json({ ok: false, error: 'courseId is required' }, { status: 400 })
    }

    if (!Number.isFinite(masteryLevel) || masteryLevel < 0 || masteryLevel > 100) {
      return NextResponse.json({ ok: false, error: 'masteryLevel must be a number from 0 to 100' }, { status: 400 })
    }

    const mastery = setUnitMastery(user.id, courseId, masteryLevel)

    // Sync to Supabase mastery_records (requires course code — look up from SQLite)
    void (async () => {
      try {
        // Get the course code from SQLite to use for Supabase lookup
        const { listCourses } = await import('@/lib/app-state/service')
        const courses = listCourses(user.id)
        const course = courses.find((c) => c.id === courseId)
        if (course?.course_code) {
          await syncCloudMastery(user.id, course.course_code, masteryLevel)
        }
      } catch { /* non-fatal */ }
    })()

    return NextResponse.json({ ok: true, mastery })
  } catch (error) {
    console.error('[UnitMastery POST] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}