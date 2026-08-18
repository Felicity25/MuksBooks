import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { createStudySession, getTodayStudySummary, listStudySessions } from '@/lib/cloud/service'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const [summary, recent] = await Promise.all([
    getTodayStudySummary(user.id),
    listStudySessions(user.id, 20)
  ])

  return NextResponse.json({ ok: true, summary, recent })
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ ok: false, error: 'title is required' }, { status: 400 })

  const startedAt = typeof body?.startedAt === 'string' ? body.startedAt : ''
  const endedAt = typeof body?.endedAt === 'string' ? body.endedAt : ''
  const durationMinutes = Number(body?.durationMinutes)

  if (!startedAt || !endedAt || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json({ ok: false, error: 'startedAt, endedAt and positive durationMinutes are required' }, { status: 400 })
  }

  let unitId: string | null = null
  if (body?.taskId) {
    const client = createSupabaseServerClient()
    if (client) {
      const taskLookup = await client
        .from('tasks')
        .select('unit_id')
        .eq('id', body.taskId)
        .eq('user_id', user.id)
        .maybeSingle()
      unitId = taskLookup.data?.unit_id ?? null
    }
  }

  const session = await createStudySession({
    userId: user.id,
    taskId: typeof body?.taskId === 'string' ? body.taskId : null,
    unitId,
    title,
    startedAt,
    endedAt,
    durationMinutes,
    notes: typeof body?.notes === 'string' ? body.notes : null
  })

  if (!session) return NextResponse.json({ ok: false, error: 'Could not record study session' }, { status: 500 })
  return NextResponse.json({ ok: true, session })
}
