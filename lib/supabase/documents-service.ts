/**
 * Supabase-backed persistent storage for uploads, document chunks, and units.
 * Requires supabase/migrations/20260820_persistent_documents.sql to be applied.
 *
 * All functions degrade gracefully when the migration has not been run yet
 * (cloud writes silently fail; reads return null so callers fall back to SQLite).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ─── Internal helpers ────────────────────────────────────────────────────────

const BUCKET = 'course-files'

/** Service-role client — server-side only, never exposed to the browser. */
function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function ensureBucket(client: SupabaseClient): Promise<void> {
  try {
    const { data } = await client.storage.listBuckets()
    if (data?.some((b) => b.name === BUCKET)) return
    await client.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 52_428_800 // 50 MB
    })
  } catch {
    // Non-fatal: bucket may already exist or lack permission
  }
}

function isMissingRelation(err: unknown): boolean {
  const msg = String((err as any)?.message ?? '').toLowerCase()
  return msg.includes('does not exist') || msg.includes('42703') || msg.includes('42p01')
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the storage path on success, null on failure.
 */
export async function uploadFileToStorage(
  userId: string,
  documentId: string,
  fileName: string,
  content: Buffer,
  mimeType: string
): Promise<string | null> {
  const client = getServiceClient()
  if (!client) return null

  try {
    await ensureBucket(client)
    const storagePath = `${userId}/${documentId}/${fileName}`
    const { error } = await client.storage.from(BUCKET).upload(storagePath, content, {
      contentType: mimeType,
      upsert: true
    })
    if (error) {
      console.error('[Storage] Upload failed:', error.message)
      return null
    }
    return storagePath
  } catch (err) {
    console.error('[Storage] Upload error:', err)
    return null
  }
}

/** Delete a file from Supabase Storage. */
export async function deleteFileFromStorage(storagePath: string): Promise<void> {
  const client = getServiceClient()
  if (!client || !storagePath) return
  try {
    await client.storage.from(BUCKET).remove([storagePath])
  } catch { /* non-fatal */ }
}

/** Return a signed URL valid for 1 hour. */
export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const client = getServiceClient()
  if (!client || !storagePath) return null
  try {
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(storagePath, 3600)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  } catch {
    return null
  }
}

// ─── Upload metadata ─────────────────────────────────────────────────────────

/** Persist document metadata to Supabase uploads table. Returns upload UUID. */
export async function persistUploadMetadata(
  userId: string,
  documentId: string,
  storagePath: string,
  params: {
    fileName: string
    mimeType: string
    sizeBytes: number
    courseCode: string
    fileHash: string
    chunkCount: number
    documentType?: string
    processingStatus?: string
    week?: number | null
    resourceType?: string | null
  }
): Promise<string | null> {
  const client = createSupabaseServerClient()
  if (!client) return null

  try {
    const { data, error } = await client
      .from('uploads')
      .upsert(
        {
          user_id: userId,
          document_id: documentId,
          storage_path: storagePath,
          original_filename: params.fileName,
          mime_type: params.mimeType,
          file_size: params.sizeBytes,
          course_code: params.courseCode,
          file_hash: params.fileHash,
          chunk_count: params.chunkCount,
          document_type: params.documentType ?? 'study_material',
          processing_status: params.processingStatus ?? 'tutor_ready',
          week: params.week ?? null,
          resource_type: params.resourceType ?? null
        },
        { onConflict: 'document_id' }
      )
      .select('id')
      .maybeSingle()

    if (error) {
      if (!isMissingRelation(error)) console.error('[Cloud] Upload metadata failed:', error.message)
      return null
    }
    return data?.id ?? null
  } catch (err) {
    if (!isMissingRelation(err)) console.error('[Cloud] Upload metadata error:', err)
    return null
  }
}

/** List all documents for a user from Supabase. Returns null when unavailable. */
export async function listCloudDocuments(userId: string) {
  const client = createSupabaseServerClient()
  if (!client) return null

  try {
    const { data, error } = await client
      .from('uploads')
      .select('id, document_id, original_filename, mime_type, file_size, document_type, processing_status, course_code, chunk_count, week, resource_type, created_at')
      .eq('user_id', userId)
      .not('document_id', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      if (!isMissingRelation(error)) console.error('[Cloud] List documents failed:', error.message)
      return null
    }
    return data ?? []
  } catch (err) {
    if (!isMissingRelation(err)) console.error('[Cloud] List documents error:', err)
    return null
  }
}

/** Find one upload row by documentId. */
export async function getCloudUploadByDocumentId(userId: string, documentId: string) {
  const client = createSupabaseServerClient()
  if (!client) return null

  try {
    const { data, error } = await client
      .from('uploads')
      .select('id, storage_path, document_id, original_filename')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .maybeSingle()

    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

/** Delete a document row (cascades to document_chunks via FK). */
export async function deleteCloudDocument(userId: string, documentId: string): Promise<void> {
  const client = createSupabaseServerClient()
  if (!client) return

  try {
    const row = await getCloudUploadByDocumentId(userId, documentId)
    if (row?.storage_path) await deleteFileFromStorage(row.storage_path)

    await client
      .from('uploads')
      .delete()
      .eq('user_id', userId)
      .eq('document_id', documentId)
  } catch (err) {
    if (!isMissingRelation(err)) console.error('[Cloud] Delete document error:', err)
  }
}

// ─── Knowledge chunks ────────────────────────────────────────────────────────

export interface CloudChunk {
  id: string
  chunkIndex: number
  text: string
  section?: string
  embedding: number[]
  keywords: string[]
}

/** Persist extracted text chunks + embeddings to Supabase document_chunks. */
export async function persistDocumentChunks(
  userId: string,
  uploadId: string | null,
  documentId: string,
  courseCode: string,
  chunks: CloudChunk[]
): Promise<void> {
  const client = createSupabaseServerClient()
  if (!client || chunks.length === 0) return

  const BATCH = 50
  try {
    for (let i = 0; i < chunks.length; i += BATCH) {
      const rows = chunks.slice(i, i + BATCH).map((c) => ({
        id: c.id,
        user_id: userId,
        upload_id: uploadId,
        document_id: documentId,
        chunk_index: c.chunkIndex,
        section: c.section ?? null,
        text: c.text,
        embedding: c.embedding,
        keywords: c.keywords,
        course_code: courseCode
      }))

      const { error } = await client.from('document_chunks').upsert(rows, { onConflict: 'id' })
      if (error) {
        if (!isMissingRelation(error)) console.error(`[Cloud] Chunk batch ${i} failed:`, error.message)
        return // stop batching on first error (likely schema missing)
      }
    }
  } catch (err) {
    if (!isMissingRelation(err)) console.error('[Cloud] Chunk persist error:', err)
  }
}

/** Delete all chunks for a document. */
export async function deleteCloudChunks(userId: string, documentId: string): Promise<void> {
  const client = createSupabaseServerClient()
  if (!client) return
  try {
    await client.from('document_chunks').delete().eq('user_id', userId).eq('document_id', documentId)
  } catch { /* non-fatal */ }
}

/** Retrieve chunks for a user (optionally filtered by course). */
export async function searchCloudChunks(
  userId: string,
  courseCode: string | undefined,
  limit = 24
): Promise<Array<{ id: string; document_id: string; chunk_index: number; section: string | null; text: string; embedding: number[]; course_code: string | null }> | null> {
  const client = createSupabaseServerClient()
  if (!client) return null

  try {
    let query = client
      .from('document_chunks')
      .select('id, document_id, chunk_index, section, text, embedding, course_code')
      .eq('user_id', userId)
      .limit(limit)

    if (courseCode) query = query.eq('course_code', courseCode.toUpperCase())

    const { data, error } = await query
    if (error) {
      if (!isMissingRelation(error)) console.error('[Cloud] Search chunks failed:', error.message)
      return null
    }
    return data ?? []
  } catch (err) {
    if (!isMissingRelation(err)) console.error('[Cloud] Search chunks error:', err)
    return null
  }
}

// ─── Units (Courses) ─────────────────────────────────────────────────────────

/** Upsert a unit into Supabase units table. */
export async function upsertCloudUnit(
  userId: string,
  code: string,
  name: string,
  semester?: string | null
): Promise<{ id: string; code: string; name: string } | null> {
  const client = createSupabaseServerClient()
  if (!client) return null

  try {
    const { data, error } = await client
      .from('units')
      .upsert(
        {
          user_id: userId,
          code: code.toUpperCase(),
          name: name || code.toUpperCase(),
          status: 'active',
          semester: semester ?? null
        },
        { onConflict: 'user_id, code' }
      )
      .select('id, code, name')
      .maybeSingle()

    if (error) {
      console.error('[Cloud] Unit upsert failed:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('[Cloud] Unit upsert error:', err)
    return null
  }
}

/** List all units for the authenticated user from Supabase. */
export async function listCloudUnits(userId: string) {
  const client = createSupabaseServerClient()
  if (!client) return null

  try {
    const { data, error } = await client
      .from('units')
      .select('id, code, name, status, semester, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) { console.error('[Cloud] List units failed:', error.message); return null }
    return data ?? []
  } catch {
    return null
  }
}

/** Archive (soft-delete) a unit in Supabase. */
export async function archiveCloudUnit(userId: string, code: string): Promise<void> {
  const client = createSupabaseServerClient()
  if (!client) return
  try {
    await client.from('units').update({ status: 'archived' }).eq('user_id', userId).eq('code', code.toUpperCase())
  } catch { /* non-fatal */ }
}

// ─── Mastery ─────────────────────────────────────────────────────────────────

/** Sync overall mastery for a course/unit to Supabase mastery_records. */
export async function syncCloudMastery(
  userId: string,
  courseCode: string,
  masteryLevel: number
): Promise<void> {
  const client = createSupabaseServerClient()
  if (!client) return

  try {
    const { data: unit } = await client
      .from('units')
      .select('id')
      .eq('user_id', userId)
      .eq('code', courseCode.toUpperCase())
      .maybeSingle()

    if (!unit?.id) return

    await client.from('mastery_records').upsert(
      {
        user_id: userId,
        unit_id: unit.id,
        topic: 'overall',
        mastery_score: Math.round(masteryLevel) / 100,
        confidence_score: Math.round(masteryLevel) / 100
      },
      { onConflict: 'user_id, unit_id, topic' }
    )
  } catch (err) {
    console.error('[Cloud] Mastery sync error:', err)
  }
}
