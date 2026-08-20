import { NextRequest, NextResponse } from 'next/server'
import { appendLog } from '@/lib/logging'
import { deleteTutorConversation, updateTutorConversationDetailed } from '@/lib/tutor/persistence'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function readNullableString(body: any, key: string) {
  if (!body || !(key in body)) return undefined
  if (body[key] === null) return null
  return typeof body[key] === 'string' ? body[key] : undefined
}

export async function PATCH(request: NextRequest, context: { params: { conversationId: string } | Promise<{ conversationId: string }> }) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const params = await Promise.resolve(context.params)
  const conversationId = params?.conversationId
  const body = await request.json().catch(() => null)

  const activeUnitCode = readNullableString(body, 'activeUnitCode')
  const mode = readNullableString(body, 'mode')
  const summary = readNullableString(body, 'summary')
  const sourceScope = body && 'sourceScope' in body
    ? (body.sourceScope === null ? {} : (typeof body.sourceScope === 'object' ? body.sourceScope : undefined))
    : undefined

  await appendLog('retrievals', 'Tutor conversation PATCH received', {
    userPresent: true,
    userMarker: user.id.slice(0, 8),
    conversationId,
    patchKeys: [
      typeof body?.title === 'string' ? 'title' : null,
      activeUnitCode !== undefined ? 'activeUnitCode' : null,
      mode !== undefined ? 'mode' : null,
      sourceScope !== undefined ? 'sourceScope' : null,
      summary !== undefined ? 'summary' : null
    ].filter(Boolean)
  }).catch(() => {})

  const updated = await updateTutorConversationDetailed({
    userId: user.id,
    conversationId,
    title: typeof body?.title === 'string' ? body.title : undefined,
    activeUnitCode: typeof activeUnitCode === 'string' ? activeUnitCode.trim().toUpperCase() || null : activeUnitCode,
    mode,
    sourceScope,
    summary
  })

  if (!updated.conversation) {
    await appendLog('retrievals', 'Tutor conversation PATCH failed', {
      userMarker: user.id.slice(0, 8),
      conversationId,
      reason: updated.reason || null,
      errorCode: (updated as any).errorCode || null,
      errorMessage: (updated as any).errorMessage || null,
      usedFallback: (updated as any).usedFallback || false,
      patchKeys: (updated as any).patchKeys || []
    }).catch(() => {})

    const code = updated.reason === 'not_found'
      ? 'CONVERSATION_NOT_FOUND'
      : updated.reason === 'schema_missing'
        ? 'CONVERSATION_SCHEMA_MISSING'
        : 'CONVERSATION_UPDATE_FAILED'

    return NextResponse.json({ ok: false, error: 'Conversation not found or update failed', code }, { status: code === 'CONVERSATION_NOT_FOUND' ? 404 : 500 })
  }

  return NextResponse.json({ ok: true, conversation: updated.conversation })
}

export async function DELETE(_request: NextRequest, context: { params: { conversationId: string } | Promise<{ conversationId: string }> }) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const params = await Promise.resolve(context.params)
  const ok = await deleteTutorConversation(user.id, params.conversationId)
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Conversation delete failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
