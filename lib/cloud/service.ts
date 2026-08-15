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

  const { data, error } = await client.from('tasks').select('*').order('created_at', { ascending: false })
  if (error) return []
  return data ?? []
}

export async function createUserTask(input: {
  unit_id?: string | null
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
    unit_id: input.unit_id ?? null,
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
