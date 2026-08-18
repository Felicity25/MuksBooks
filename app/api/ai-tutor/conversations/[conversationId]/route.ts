import { NextRequest, NextResponse } from 'next/server'
import { deleteTutorConversation, updateTutorConversation } from '@/lib/tutor/persistence'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest, context: { params: { conversationId: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const conversationId = context.params.conversationId
  const body = await request.json().catch(() => null)

  const updated = await updateTutorConversation({
    userId: user.id,
    conversationId,
    title: typeof body?.title === 'string' ? body.title : undefined,
    activeUnitCode: typeof body?.activeUnitCode === 'string' ? body.activeUnitCode.toUpperCase() : undefined,
    mode: typeof body?.mode === 'string' ? body.mode : undefined,
    sourceScope: body?.sourceScope && typeof body.sourceScope === 'object' ? body.sourceScope : undefined,
    summary: typeof body?.summary === 'string' ? body.summary : undefined
  })

  if (!updated) {
    return NextResponse.json({ ok: false, error: 'Conversation not found or update failed' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, conversation: updated })
}

export async function DELETE(_request: NextRequest, context: { params: { conversationId: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const ok = await deleteTutorConversation(user.id, context.params.conversationId)
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Conversation delete failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
