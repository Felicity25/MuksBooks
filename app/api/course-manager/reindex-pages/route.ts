import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { reindexCloudDocumentPages } from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const documentId = typeof body?.documentId === 'string' ? body.documentId.trim() : ''
  if (!documentId) {
    return NextResponse.json({ ok: false, error: 'documentId is required' }, { status: 400 })
  }

  const result = await reindexCloudDocumentPages(user.id, documentId)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'Reindex failed', reason: result.reason }, { status: 400 })
  }

  return NextResponse.json({ ok: true, chunks: result.chunks, pages: result.pages })
}
