import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getUnitMastery } from '@/lib/app-state/service'
import { setCloudUnitMastery, listCloudUnits } from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (user) {
      const units = await listCloudUnits(user.id)
      if (units !== null) {
        return NextResponse.json({
          ok: true,
          mastery: units.map((u: any) => ({
            id: u.id,
            course_code: u.code,
            course_name: u.name,
            mastery_level: u.mastery_level ?? 0,
            mastery_updated_at: u.updated_at
          }))
        })
      }
    }
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

    // courseId here is the unit's Supabase id (as returned by /api/app-state/courses GET).
    await setCloudUnitMastery(user.id, courseId, masteryLevel)

    return NextResponse.json({ ok: true, mastery: { id: courseId, mastery_level: masteryLevel } })
  } catch (error) {
    console.error('[UnitMastery POST] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}