import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { ACTUARIAL_RESOURCES } from '@/lib/resources/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function unauthenticated() {
  return NextResponse.json({ ok: false, error: 'Authentication required.', code: 'UNAUTHENTICATED' }, { status: 401 })
}

function unavailable() {
  return NextResponse.json({ ok: false, error: 'Supabase is not configured.', code: 'SAVED_RESOURCES_UNAVAILABLE' }, { status: 503 })
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return unauthenticated()
  const client = createSupabaseServerClient()
  if (!client) return unavailable()

  const { data, error } = await client
    .from('saved_resources')
    .select('resource_id, saved_at')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, resources: data || [] })
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthenticated()
  const client = createSupabaseServerClient()
  if (!client) return unavailable()

  const body = await request.json().catch(() => null) as { resourceId?: string } | null
  const resourceId = body?.resourceId
  if (!resourceId || !ACTUARIAL_RESOURCES.some((resource) => resource.id === resourceId)) {
    return NextResponse.json({ ok: false, error: 'A valid curated resource ID is required.' }, { status: 400 })
  }

  const { error } = await client.from('saved_resources').insert({ user_id: user.id, resource_id: resourceId })
  if (error && error.code !== '23505') return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, saved: true, duplicate: error?.code === '23505' })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return unauthenticated()
  const client = createSupabaseServerClient()
  if (!client) return unavailable()

  const body = await request.json().catch(() => null) as { resourceId?: string } | null
  if (!body?.resourceId) return NextResponse.json({ ok: false, error: 'Resource ID is required.' }, { status: 400 })

  const { error } = await client
    .from('saved_resources')
    .delete()
    .eq('user_id', user.id)
    .eq('resource_id', body.resourceId)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, saved: false })
}