import { NextRequest, NextResponse } from 'next/server'
import { getDocument } from '@/lib/app-state/service'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest, { params }: { params: { documentId: string } }) {
  const { documentId } = params
  const document = await getDocument(documentId)

  if (!document) {
    return NextResponse.json({ ok: false, error: 'document not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, document })
}
