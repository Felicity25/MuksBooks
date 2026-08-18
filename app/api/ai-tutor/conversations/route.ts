import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { createTutorConversation, listTutorConversations } from '@/lib/tutor/persistence'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const conversations = await listTutorConversations(user.id)
  return NextResponse.json({ ok: true, conversations })
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const activeUnitCode = typeof body?.activeUnitCode === 'string' ? body.activeUnitCode.trim().toUpperCase() : null
  const mode = typeof body?.mode === 'string' ? body.mode.trim() : null

  const conversation = await createTutorConversation({
    userId: user.id,
    title: title || 'New conversation',
    activeUnitCode,
    mode
  })

  if (!conversation) {
    return NextResponse.json({ ok: false, error: 'Failed to create conversation' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, conversation })
}
