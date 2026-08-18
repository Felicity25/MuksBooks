import { NextRequest, NextResponse } from 'next/server'
import { getDocumentForUser } from '@/lib/app-state/service'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest, { params }: { params: { documentId: string } }) {
  const { documentId } = params
  const user = await getAuthenticatedUser()
  const document = await getDocumentForUser(documentId, user?.id || 'default')

  if (!document) {
    return NextResponse.json({ ok: false, error: 'document not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, document })
}
