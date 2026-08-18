import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getLearningProfile, resetLearningProfile, upsertLearningProfile } from '@/lib/tutor/persistence'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const profile = await getLearningProfile(user.id)
  return NextResponse.json({ ok: true, profile })
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const profile = await upsertLearningProfile(user.id, body || {})

  if (!profile) {
    return NextResponse.json({ ok: false, error: 'Failed to update learning profile' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, profile })
}

export async function DELETE(_request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const ok = await resetLearningProfile(user.id)
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Failed to reset learning profile' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
