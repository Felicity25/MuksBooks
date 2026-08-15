import { NextRequest, NextResponse } from 'next/server'
import { completePlannerTask, createPlannerTask, deletePlannerTask, listPlannerTasks, upsertCourse } from '@/lib/app-state/service'

export const runtime = 'nodejs'

export async function GET() {
  const tasks = listPlannerTasks('default')
  return NextResponse.json({ ok: true, tasks })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  if (!body?.title) {
    return NextResponse.json({ ok: false, error: 'title is required' }, { status: 400 })
  }

  let courseId = body.courseId as string | undefined
  if (!courseId && body.courseCode) {
    const course = upsertCourse({
      courseCode: String(body.courseCode).toUpperCase(),
      source: 'planner'
    })
    courseId = course.id
  }

  const taskId = createPlannerTask({
    userId: 'default',
    courseId,
    topicId: body.topicId,
    assessmentId: body.assessmentId,
    title: body.title,
    description: body.description,
    taskType: body.taskType,
    priority: body.priority,
    plannedDate: body.plannedDate,
    dueDate: body.dueDate,
    estimatedMinutes: body.estimatedMinutes,
    generatedBy: body.generatedBy
  })

  return NextResponse.json({ ok: true, taskId })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  if (!body?.taskId) {
    return NextResponse.json({ ok: false, error: 'taskId is required' }, { status: 400 })
  }

  completePlannerTask(body.taskId)
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')
  if (!taskId) {
    return NextResponse.json({ ok: false, error: 'taskId is required' }, { status: 400 })
  }

  deletePlannerTask(taskId)
  return NextResponse.json({ ok: true })
}
