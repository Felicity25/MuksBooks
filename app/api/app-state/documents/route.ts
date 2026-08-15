import { NextRequest, NextResponse } from 'next/server'
import { deleteDocument, listDocuments } from '@/lib/app-state/service'
import { publishEvent } from '@/lib/app-state/events'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId') || undefined
    const courseCode = searchParams.get('courseCode') || undefined
    const documentType = searchParams.get('documentType') || undefined
    const processingStatus = searchParams.get('processingStatus') || undefined
    const query = searchParams.get('query') || undefined
    const sort = searchParams.get('sort') as 'newest' | 'oldest' | 'filename' | 'unit' | 'week' | 'fileType' | null
    const weekValue = searchParams.get('week')
    const week = weekValue ? Number(weekValue) : undefined
    const limitValue = searchParams.get('limit')
    const limit = limitValue ? Number(limitValue) : undefined

    const documents = await listDocuments({
      courseId,
      courseCode,
      documentType,
      processingStatus,
      week: Number.isFinite(week as number) ? week : undefined,
      query,
      sort: sort || undefined,
      limit: Number.isFinite(limit as number) ? limit : undefined
    })

    return NextResponse.json({ ok: true, documents })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to list documents' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')

  if (!documentId) {
    return NextResponse.json({ ok: false, error: 'documentId is required' }, { status: 400 })
  }

  const deleted = await deleteDocument(documentId)
  if (!deleted) {
    return NextResponse.json({ ok: false, error: 'document not found' }, { status: 404 })
  }

  publishEvent('DOCUMENT_PROCESSED', { documentId, action: 'deleted' })
  return NextResponse.json({ ok: true })
}
