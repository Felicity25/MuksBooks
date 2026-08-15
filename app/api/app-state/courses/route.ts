import { NextRequest, NextResponse } from 'next/server'
import { archiveCourse, listCourses, upsertCourse } from '@/lib/app-state/service'
import { publishEvent } from '@/lib/app-state/events'

export const runtime = 'nodejs'

export async function GET() {
  const courses = listCourses()
  return NextResponse.json({ ok: true, courses })
}

export async function POST(request: NextRequest) {
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
    source: body.source || 'user'
  })

  publishEvent('COURSE_UPDATED', { courseId: course.id, courseCode: course.course_code })

  return NextResponse.json({ ok: true, course })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ ok: false, error: 'courseId is required' }, { status: 400 })
  }

  archiveCourse(courseId)
  return NextResponse.json({ ok: true })
}
