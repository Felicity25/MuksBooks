import { NextRequest, NextResponse } from 'next/server'
import { listCourses, upsertCourse } from '@/lib/app-state/service'
import { publishEvent } from '@/lib/app-state/events'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import {
  upsertCloudUnit,
  listCloudUnits,
  updateCloudUnit,
  archiveCloudUnitById
} from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

function mapCloudUnit(u: any) {
  return {
    id: u.id,
    course_code: u.code,
    course_name: u.name,
    status: u.status,
    semester: u.semester ?? null,
    year: u.year ?? null,
    color: u.color ?? null,
    icon: u.icon ?? null,
    mastery_level: u.mastery_level ?? 0,
    university: null,
    source: 'cloud',
    created_at: u.created_at,
    updated_at: u.updated_at
  }
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    // Supabase is the source of truth once authenticated (persistent + cross-device)
    if (user) {
      const cloudUnits = await listCloudUnits(user.id)
      if (cloudUnits !== null) {
        return NextResponse.json({ ok: true, courses: cloudUnits.map(mapCloudUnit) })
      }
    }
    const courses = listCourses(user?.id || 'default')
    return NextResponse.json({ ok: true, courses })
  } catch (error) {
    console.error('[Courses GET] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error), courses: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const body = await request.json()
    if (!body?.courseCode) {
      return NextResponse.json({ ok: false, error: 'courseCode is required' }, { status: 400 })
    }

    const code = String(body.courseCode).toUpperCase()

    // Best-effort local mirror so Planner/Documents/Assessments (which still key off the
    // SQLite `courses` table) can resolve this unit's code. Supabase remains authoritative.
    upsertCourse({
      courseCode: code,
      courseName: body.courseName,
      university: body.university,
      semester: body.semester,
      year: body.year,
      source: body.source || 'user',
      userId: user.id
    })

    const cloudUnit = await upsertCloudUnit(user.id, code, body.courseName || code, body.semester ?? null)
    if (!cloudUnit) {
      return NextResponse.json({ ok: false, error: 'Failed to save unit to the cloud. Please try again.' }, { status: 502 })
    }

    if (body.year !== undefined || body.color !== undefined || body.icon !== undefined) {
      const updateResult = await updateCloudUnit(user.id, cloudUnit.id, {
        year: body.year ?? undefined,
        color: body.color ?? undefined,
        icon: body.icon ?? undefined
      })
      if (updateResult.ok) {
        publishEvent('COURSE_UPDATED', { courseId: cloudUnit.id, courseCode: code })
        return NextResponse.json({ ok: true, course: mapCloudUnit(updateResult.unit) })
      }
    }

    publishEvent('COURSE_UPDATED', { courseId: cloudUnit.id, courseCode: code })
    return NextResponse.json({ ok: true, course: mapCloudUnit({ ...cloudUnit, status: 'active' }) })
  } catch (error) {
    console.error('[Courses POST] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const body = await request.json()
    const unitId = String(body?.id || body?.unitId || '').trim()
    if (!unitId) {
      return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 })
    }

    const updates: Parameters<typeof updateCloudUnit>[2] = {}
    if (body.courseCode !== undefined) updates.code = String(body.courseCode)
    if (body.courseName !== undefined) updates.name = String(body.courseName)
    if (body.semester !== undefined) updates.semester = body.semester
    if (body.year !== undefined) updates.year = body.year === null ? null : Number(body.year)
    if (body.color !== undefined) updates.color = body.color
    if (body.icon !== undefined) updates.icon = body.icon

    const result = await updateCloudUnit(user.id, unitId, updates)
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 })
    }

    // Best-effort local mirror update so other subsystems keyed by course_code stay aligned.
    if (updates.code || updates.name || updates.semester !== undefined || updates.year !== undefined) {
      upsertCourse({
        courseCode: String(result.unit.code),
        courseName: result.unit.name as string,
        semester: (result.unit.semester as string) ?? undefined,
        year: (result.unit.year as number) ?? undefined,
        source: 'units_edit',
        userId: user.id
      })
    }

    publishEvent('COURSE_UPDATED', { courseId: unitId, courseCode: result.unit.code })
    return NextResponse.json({ ok: true, course: mapCloudUnit(result.unit) })
  } catch (error) {
    console.error('[Courses PATCH] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const unitId = searchParams.get('unitId') || searchParams.get('courseId')
  if (!unitId) {
    return NextResponse.json({ ok: false, error: 'unitId is required' }, { status: 400 })
  }

  await archiveCloudUnitById(user.id, unitId)
  publishEvent('COURSE_UPDATED', { courseId: unitId, status: 'archived' })
  return NextResponse.json({ ok: true })
}
