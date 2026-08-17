import { NextRequest, NextResponse } from 'next/server'
import { deleteDocument, listDocuments } from '@/lib/app-state/service'
import { publishEvent } from '@/lib/app-state/events'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { listCloudDocuments, deleteCloudDocument } from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

function mapCloudDoc(d: any) {
  return {
    id: d.document_id ?? d.id,
    filename: d.original_filename,
    document_type: d.document_type ?? null,
    week: d.week ?? null,
    processing_status: d.processing_status ?? 'tutor_ready',
    upload_date: d.created_at,
    chunk_count: d.chunk_count ?? 0,
    course_code: d.course_code ?? null,
    course_name: d.course_code ?? null,
    mime_type: d.mime_type ?? null,
    size_bytes: d.file_size ?? null,
    resource_type: d.resource_type ?? null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const userId = user?.id || 'default'

    const { searchParams } = new URL(request.url)
    const courseCode = searchParams.get('courseCode') || undefined

    // Prefer Supabase for authenticated users (persistent across redeploys)
    if (user) {
      const cloudDocs = await listCloudDocuments(user.id)
      if (cloudDocs !== null) {
        const filtered = courseCode
          ? cloudDocs.filter((d) => d.course_code === courseCode.toUpperCase())
          : cloudDocs
        return NextResponse.json({ ok: true, documents: filtered.map(mapCloudDoc) })
      }
    }

    const courseId = searchParams.get('courseId') || undefined
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
    }, userId)

    return NextResponse.json({ ok: true, documents })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to list documents' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')

  if (!documentId) {
    return NextResponse.json({ ok: false, error: 'documentId is required' }, { status: 400 })
  }

  // Delete from both SQLite and Supabase
  const [deleted] = await Promise.all([
    deleteDocument(documentId, user.id),
    deleteCloudDocument(user.id, documentId).catch(() => null)
  ])

  if (!deleted) {
    return NextResponse.json({ ok: false, error: 'document not found' }, { status: 404 })
  }

  publishEvent('DOCUMENT_PROCESSED', { documentId, action: 'deleted' })
  return NextResponse.json({ ok: true })
}
