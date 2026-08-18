import { createSupabaseServerClient } from '@/lib/supabase/server'

export type MuksbooksCloudUser = {
  id: string
  email?: string | null
  name?: string | null
}

export async function ensureProfileForAuthenticatedUser(user: {
  id: string
  email?: string | null
  user_metadata?: { full_name?: string | null }
} | null) {
  const client = createSupabaseServerClient()
  if (!client || !user) return null

  const profilePayload = {
    id: user.id,
    email: user.email ?? null,
    full_name: user.user_metadata?.full_name ?? user.email ?? null
  }

  const { data: existingProfile, error: fetchError } = await client
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError && fetchError.code !== 'PGRST116') {
    return null
  }

  if (existingProfile) {
    return existingProfile
  }

  const { data, error } = await client
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })
    .select('id, email, full_name')
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function getCurrentCloudUser(): Promise<MuksbooksCloudUser | null> {
  const client = createSupabaseServerClient()
  if (!client) return null

  const {
    data: { user },
    error
  } = await client.auth.getUser()

  if (error || !user) return null

  await ensureProfileForAuthenticatedUser(user)

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.email || 'Student'
  }
}

export async function listUserUnits() {
  const client = createSupabaseServerClient()
  if (!client) return []

  const { data, error } = await client.from('units').select('*').order('created_at', { ascending: false })
  if (error) return []
  return data ?? []
}

export async function upsertUserUnit(input: {
  id?: string
  code: string
  name: string
  status?: string
  semester?: string | null
  notes?: string | null
}) {
  const client = createSupabaseServerClient()
  if (!client) return null

  const { data, error } = await client.from('units').upsert({
    id: input.id,
    code: input.code,
    name: input.name,
    status: input.status ?? 'active',
    semester: input.semester ?? null,
    notes: input.notes ?? null
  }, { onConflict: 'id' }).select('*').maybeSingle()

  if (error || !data) return null
  return data
}

export async function listUserTasks() {
  const client = createSupabaseServerClient()
  if (!client) return []

  const { data, error } = await client
    .from('tasks')
    .select('id, unit_id, title, description, task_type, status, priority, due_date, planned_date, estimated_minutes, created_by, created_at, updated_at, career_assessment_id, assessment_id, units(code, name)')
    .order('planned_date', { ascending: true, nullsFirst: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  if (error) return []
  return data ?? []
}

export async function ensureUserUnitForCode(userId: string, code: string) {
  const client = createSupabaseServerClient()
  if (!client) return null

  const normalizedCode = code.trim().toUpperCase()
  if (!normalizedCode) return null

  const { data: existing, error: existingError } = await client
    .from('units')
    .select('id, code, name')
    .eq('user_id', userId)
    .eq('code', normalizedCode)
    .maybeSingle()

  if (existingError && existingError.code !== 'PGRST116') return null
  if (existing?.id) return existing

  const { data, error } = await client
    .from('units')
    .insert({
      user_id: userId,
      code: normalizedCode,
      name: normalizedCode,
      status: 'active'
    })
    .select('id, code, name')
    .single()

  if (error || !data) return null
  return data
}

export async function createUserTask(input: {
  userId: string
  unit_id?: string | null
  career_assessment_id?: string | null
  assessment_id?: string | null
  title: string
  description?: string | null
  task_type?: string
  status?: string
  priority?: number
  due_date?: string | null
  planned_date?: string | null
  estimated_minutes?: number
}) {
  const client = createSupabaseServerClient()
  if (!client) return null

  const { data, error } = await client.from('tasks').insert({
    user_id: input.userId,
    unit_id: input.unit_id ?? null,
    career_assessment_id: input.career_assessment_id ?? null,
    assessment_id: input.assessment_id ?? null,
    title: input.title,
    description: input.description ?? null,
    task_type: input.task_type ?? 'study',
    status: input.status ?? 'pending',
    priority: input.priority ?? 0.5,
    due_date: input.due_date ?? null,
    planned_date: input.planned_date ?? null,
    estimated_minutes: input.estimated_minutes ?? 45,
    created_by: 'user'
  }).select('*').single()

  if (error || !data) return null
  return data
}

export async function findUserTaskByCareerAssessment(userId: string, careerAssessmentId: string) {
  const client = createSupabaseServerClient()
  if (!client) return null

  const { data, error } = await client
    .from('tasks')
    .select('id, user_id, career_assessment_id, due_date, planned_date, status')
    .eq('user_id', userId)
    .eq('career_assessment_id', careerAssessmentId)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function updateUserTask(input: {
  userId: string
  taskId: string
  due_date?: string | null
  planned_date?: string | null
  status?: string
}) {
  const client = createSupabaseServerClient()
  if (!client) return null

  const payload: Record<string, unknown> = {}
  if (input.due_date !== undefined) payload.due_date = input.due_date
  if (input.planned_date !== undefined) payload.planned_date = input.planned_date
  if (input.status !== undefined) payload.status = input.status

  const { data, error } = await client
    .from('tasks')
    .update(payload)
    .eq('id', input.taskId)
    .eq('user_id', input.userId)
    .select('id, user_id, career_assessment_id, due_date, planned_date, status')
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function setUserTaskCompletion(userId: string, taskId: string, completed: boolean) {
  const status = completed ? 'completed' : 'pending'
  return updateUserTask({ userId, taskId, status })
}

export async function deleteUserTask(userId: string, taskId: string) {
  const client = createSupabaseServerClient()
  if (!client) return null

  const { data: existing, error: fetchError } = await client
    .from('tasks')
    .select('id, user_id, career_assessment_id')
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError || !existing) return null

  const { error } = await client
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId)

  if (error) return null
  return existing
}

export async function createStudySession(input: {
  userId: string
  unitId?: string | null
  taskId?: string | null
  title: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  notes?: string | null
}) {
  const client = createSupabaseServerClient()
  if (!client) return null

  const { data, error } = await client
    .from('study_sessions')
    .insert({
      user_id: input.userId,
      unit_id: input.unitId ?? null,
      task_id: input.taskId ?? null,
      title: input.title,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      duration_minutes: Math.max(0, Math.round(input.durationMinutes)),
      notes: input.notes ?? null
    })
    .select('id, unit_id, task_id, title, started_at, ended_at, duration_minutes, created_at')
    .single()

  if (error || !data) return null
  return data
}

export async function listStudySessions(userId: string, limit = 20) {
  const client = createSupabaseServerClient()
  if (!client) return []

  const { data, error } = await client
    .from('study_sessions')
    .select('id, unit_id, task_id, title, started_at, ended_at, duration_minutes, created_at, units(code, name), tasks(title)')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)))

  if (error) return []
  return data ?? []
}

export async function getTodayStudySummary(userId: string) {
  const client = createSupabaseServerClient()
  if (!client) return { focusedMinutes: 0, sessionCount: 0 }

  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const { data, error } = await client
    .from('study_sessions')
    .select('duration_minutes')
    .eq('user_id', userId)
    .gte('started_at', start.toISOString())

  if (error || !data) return { focusedMinutes: 0, sessionCount: 0 }

  return {
    focusedMinutes: data.reduce((sum, row: any) => sum + (Number(row.duration_minutes) || 0), 0),
    sessionCount: data.length
  }
}
