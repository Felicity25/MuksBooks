import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getCloudUploadByDocumentId, getSignedUrl } from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

/** Return a short-lived signed URL so a student can open one of their own uploaded documents. */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')
  if (!documentId) {
    return NextResponse.json({ ok: false, error: 'documentId is required' }, { status: 400 })
  }

  const upload = await getCloudUploadByDocumentId(user.id, documentId)
  if (!upload?.storage_path) {
    return NextResponse.json({ ok: false, error: 'Document not found' }, { status: 404 })
  }

  const url = await getSignedUrl(upload.storage_path)
  if (!url) {
    return NextResponse.json({ ok: false, error: 'Could not generate a link for this document' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, url, filename: upload.original_filename })
}
