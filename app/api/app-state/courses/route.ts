import { NextRequest, NextResponse } from 'next/server'
import { archiveCourse, listCourses, upsertCourse } from '@/lib/app-state/service'
import { publishEvent } from '@/lib/app-state/events'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { upsertCloudUnit, listCloudUnits, archiveCloudUnit } from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

function mapCloudUnit(u: any) {
  return {
    id: u.id,
    course_code: u.code,
    course_name: u.name,
    status: u.status,
    semester: u.semester ?? null,
    university: null,
    year: null,
    source: 'cloud',
    created_at: u.created_at,
    updated_at: u.updated_at
  }
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    // Prefer Supabase (cloud, persistent) when authenticated
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

    // Write to SQLite (local dev / same-instance cache)
    const course = upsertCourse({
      courseCode: code,
      courseName: body.courseName,
      university: body.university,
      semester: body.semester,
      year: body.year,
      source: body.source || 'user',
      userId: user.id
    })

    // Write to Supabase (persistent, cross-device)
    void upsertCloudUnit(user.id, code, body.courseName || code, body.semester ?? null)
      .catch((err) => console.error('[Courses] Cloud upsert failed (non-fatal):', err))

    publishEvent('COURSE_UPDATED', { courseId: course.id, courseCode: course.course_code })

    return NextResponse.json({ ok: true, course })
  } catch (error) {
    console.error('[Courses POST] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')
  const courseCode = searchParams.get('courseCode')
  if (!courseId) {
    return NextResponse.json({ ok: false, error: 'courseId is required' }, { status: 400 })
  }

  archiveCourse(courseId)
  if (courseCode) {
    void archiveCloudUnit(user.id, courseCode).catch(() => {})
  }
  return NextResponse.json({ ok: true })
}
