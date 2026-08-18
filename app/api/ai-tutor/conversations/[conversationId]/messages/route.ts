import { NextRequest, NextResponse } from 'next/server'
import { createTutorMessage, listTutorMessages } from '@/lib/tutor/persistence'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest, context: { params: { conversationId: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const messages = await listTutorMessages(user.id, context.params.conversationId)
  return NextResponse.json({ ok: true, messages })
}

export async function POST(request: NextRequest, context: { params: { conversationId: string } }) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const role = body?.role === 'assistant' ? 'assistant' : 'user'
  const content = typeof body?.content === 'string' ? body.content.trim() : ''

  if (!content) {
    return NextResponse.json({ ok: false, error: 'content is required' }, { status: 400 })
  }

  const message = await createTutorMessage({
    userId: user.id,
    conversationId: context.params.conversationId,
    role,
    content,
    citations: Array.isArray(body?.citations) ? body.citations : [],
    metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : {}
  })

  if (!message) {
    return NextResponse.json({ ok: false, error: 'Failed to create message' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message })
}
