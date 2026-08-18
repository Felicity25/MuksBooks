import { NextRequest, NextResponse } from 'next/server'
import { completePlannerTask, createPlannerTask, deletePlannerTask, listPlannerTasks, upsertCourse } from '@/lib/app-state/service'
import {
  createUserTask,
  deleteUserTask,
  ensureUserUnitForCode,
  listUserTasks,
  setUserTaskCompletion
} from '@/lib/cloud/service'
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function mapCloudTask(task: any) {
  return {
    id: task.id,
    course_id: task.unit_id,
    course_code: task.units?.code || null,
    course_name: task.units?.name || null,
    title: task.title,
    description: task.description,
    task_type: task.task_type,
    priority: task.priority,
    planned_date: task.planned_date,
    due_date: task.due_date,
    estimated_minutes: task.estimated_minutes,
    completed: task.status === 'completed' ? 1 : 0,
    generated_by: task.created_by,
    created_at: task.created_at,
    updated_at: task.updated_at,
    career_assessment_id: task.career_assessment_id || null,
    assessment_id: task.assessment_id || null
  }
}

async function getPlannerCloudClient() {
  const client = createSupabaseServerClient()
  if (!client) return null
  const { error } = await client.from('tasks').select('id').limit(1)
  if (error) return null
  return client
}

export async function GET() {
  const user = await getAuthenticatedUser()
  const cloudClient = await getPlannerCloudClient()
  if (user && cloudClient) {
    const tasks = await listUserTasks()
    return NextResponse.json({ ok: true, tasks: tasks.map(mapCloudTask) })
  }
  const tasks = listPlannerTasks(user?.id || 'default')
  return NextResponse.json({ ok: true, tasks })
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  const cloudClient = await getPlannerCloudClient()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }
  const body = await request.json()
  if (!body?.title) {
    return NextResponse.json({ ok: false, error: 'title is required' }, { status: 400 })
  }

  let courseId = body.courseId as string | undefined
  if (cloudClient) {
    if (!courseId && body.courseCode) {
      const unit = await ensureUserUnitForCode(user.id, String(body.courseCode))
      courseId = unit?.id || undefined
    }

    const task = await createUserTask({
      userId: user.id,
      unit_id: courseId || null,
      career_assessment_id: body.careerAssessmentId || null,
      assessment_id: body.assessmentId || null,
      title: body.title,
      description: body.description,
      task_type: body.taskType,
      priority: body.priority,
      planned_date: body.plannedDate,
      due_date: body.dueDate,
      estimated_minutes: body.estimatedMinutes
    })

    if (!task?.id) {
      return NextResponse.json({ ok: false, error: 'Could not create planner task.' }, { status: 500 })
    }

    if (body.careerAssessmentId) {
      await cloudClient
        .from('career_assessments')
        .update({ planner_task_id: task.id })
        .eq('id', body.careerAssessmentId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ ok: true, taskId: task.id })
  }

  if (!courseId && body.courseCode) {
    const course = upsertCourse({
      courseCode: String(body.courseCode).toUpperCase(),
      source: 'planner',
      userId: user.id
    })
    courseId = course.id
  }

  const taskId = createPlannerTask({
    userId: user.id,
    courseId,
    topicId: body.topicId,
    assessmentId: body.assessmentId,
    careerAssessmentId: body.careerAssessmentId,
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
  const user = await getAuthenticatedUser()
  const cloudClient = await getPlannerCloudClient()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }
  const body = await request.json()
  if (!body?.taskId) {
    return NextResponse.json({ ok: false, error: 'taskId is required' }, { status: 400 })
  }

  if (cloudClient) {
    const task = await setUserTaskCompletion(user.id, body.taskId, body.completed !== false)
    if (!task) {
      return NextResponse.json({ ok: false, error: 'Task not found.' }, { status: 404 })
    }

    if (task.career_assessment_id) {
      const completed = body.completed !== false
      await cloudClient
        .from('career_assessments')
        .update({
          status: completed ? 'Completed' : 'Incomplete',
          completed_at_utc: completed ? new Date().toISOString() : null,
          planner_task_id: body.taskId
        })
        .eq('id', task.career_assessment_id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ ok: true })
  }

  completePlannerTask(body.taskId)
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  const cloudClient = await getPlannerCloudClient()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')
  if (!taskId) {
    return NextResponse.json({ ok: false, error: 'taskId is required' }, { status: 400 })
  }

  if (cloudClient) {
    const deleted = await deleteUserTask(user.id, taskId)
    if (!deleted) {
      return NextResponse.json({ ok: false, error: 'Task not found.' }, { status: 404 })
    }

    if (deleted.career_assessment_id) {
      await cloudClient
        .from('career_assessments')
        .update({ planner_task_id: null })
        .eq('id', deleted.career_assessment_id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ ok: true })
  }

  deletePlannerTask(taskId)
  return NextResponse.json({ ok: true })
}
