import { NextRequest, NextResponse } from 'next/server'
import { archiveCourse, listCourses, upsertCourse } from '@/lib/app-state/service'
import { publishEvent } from '@/lib/app-state/events'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
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

    const course = upsertCourse({
      courseCode: String(body.courseCode).toUpperCase(),
      courseName: body.courseName,
      university: body.university,
      semester: body.semester,
      year: body.year,
      source: body.source || 'user',
      userId: user.id
    })

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
  if (!courseId) {
    return NextResponse.json({ ok: false, error: 'courseId is required' }, { status: 400 })
  }

  archiveCourse(courseId)
  return NextResponse.json({ ok: true })
}
