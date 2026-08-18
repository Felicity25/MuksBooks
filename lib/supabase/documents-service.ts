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
    // Try upsert with all new columns (requires 20260820 migration)
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

    if (!error) return data?.id ?? null

    // Fallback: column doesn't exist yet — upsert with only baseline columns
    if (isMissingRelation(error)) {
      const { data: fallback, error: fallbackErr } = await client
        .from('uploads')
        .upsert(
          {
            user_id: userId,
            storage_path: storagePath,
            original_filename: params.fileName,
            mime_type: params.mimeType,
            file_size: params.sizeBytes
          },
          { onConflict: 'user_id, storage_path' }
        )
        .select('id')
        .maybeSingle()
      if (fallbackErr) console.error('[Cloud] Upload fallback metadata failed:', fallbackErr.message)
      return fallback?.id ?? null
    }

    console.error('[Cloud] Upload metadata failed:', error.message)
    return null
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

const UNIT_COLUMNS = 'id, code, name, status, semester, year, color, icon, mastery_level, created_at, updated_at'

/** List active (non-archived) units for the authenticated user from Supabase. */
export async function listCloudUnits(userId: string, includeArchived = false) {
  const client = createSupabaseServerClient()
  if (!client) return null

  try {
    let query = client
      .from('units')
      .select(UNIT_COLUMNS)
      .eq('user_id', userId)

    if (!includeArchived) query = query.neq('status', 'archived')

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) { console.error('[Cloud] List units failed:', error.message); return null }
    return data ?? []
  } catch {
    return null
  }
}

/** Fetch a single unit owned by the user. */
export async function getCloudUnit(userId: string, unitId: string) {
  const client = createSupabaseServerClient()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('units')
      .select(UNIT_COLUMNS)
      .eq('user_id', userId)
      .eq('id', unitId)
      .maybeSingle()
    if (error) { console.error('[Cloud] Get unit failed:', error.message); return null }
    return data
  } catch {
    return null
  }
}

/** Update an existing unit's fields by id (code, name, semester, year, color, icon). */
export async function updateCloudUnit(
  userId: string,
  unitId: string,
  updates: { code?: string; name?: string; semester?: string | null; year?: number | null; color?: string | null; icon?: string | null }
): Promise<{ ok: true; unit: Record<string, unknown> } | { ok: false; error: string }> {
  const client = createSupabaseServerClient()
  if (!client) return { ok: false, error: 'Cloud unavailable' }

  const patch: Record<string, unknown> = {}
  if (updates.code !== undefined) patch.code = updates.code.toUpperCase()
  if (updates.name !== undefined) patch.name = updates.name
  if (updates.semester !== undefined) patch.semester = updates.semester
  if (updates.year !== undefined) patch.year = updates.year
  if (updates.color !== undefined) patch.color = updates.color
  if (updates.icon !== undefined) patch.icon = updates.icon

  try {
    const { data, error } = await client
      .from('units')
      .update(patch)
      .eq('user_id', userId)
      .eq('id', unitId)
      .select(UNIT_COLUMNS)
      .maybeSingle()

    if (error) {
      const message = error.code === '23505' ? 'You already have a unit with that code.' : error.message
      return { ok: false, error: message }
    }
    if (!data) return { ok: false, error: 'Unit not found' }
    return { ok: true, unit: data }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unit update failed' }
  }
}

/** Archive (soft-delete) a unit by id. Also archives its schedule entries. */
export async function archiveCloudUnitById(userId: string, unitId: string): Promise<void> {
  const client = createSupabaseServerClient()
  if (!client) return
  try {
    await client.from('units').update({ status: 'archived' }).eq('user_id', userId).eq('id', unitId)
    await client.from('unit_schedule_entries').delete().eq('user_id', userId).eq('unit_id', unitId)
  } catch (err) {
    if (!isMissingRelation(err)) console.error('[Cloud] Archive unit error:', err)
  }
}

/** Set the overall mastery level (0-100) for a unit directly by id. */
export async function setCloudUnitMastery(userId: string, unitId: string, masteryLevel: number): Promise<void> {
  const client = createSupabaseServerClient()
  if (!client) return
  try {
    await client.from('units').update({ mastery_level: masteryLevel }).eq('user_id', userId).eq('id', unitId)
  } catch (err) {
    console.error('[Cloud] Unit mastery update error:', err)
  }
}

/** Find a unit by exact code, or by fuzzy name/code match against uploaded document text. Used for schedule auto-detection. */
export async function findCloudUnitByCodeOrName(userId: string, candidateCodes: string[], text: string) {
  const units = await listCloudUnits(userId)
  if (!units || units.length === 0) return null

  for (const code of candidateCodes) {
    const match = units.find((u: any) => u.code === code.toUpperCase())
    if (match) return match
  }

  const lowerText = text.toLowerCase()
  const byName = units.find((u: any) => u.name && lowerText.includes(String(u.name).toLowerCase()))
  if (byName) return byName

  return null
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

// ─── Unit schedule entries (canonical weekly schedule) ─────────────────────

export interface ScheduleEntryInput {
  id?: string
  unitId: string
  weekNumber: number
  startDate?: string | null
  endDate?: string | null
  topic: string
  additionalTopics?: string[]
  notes?: string | null
  sourceUploadId?: string | null
  extractionConfidence?: number | null
  isBreak?: boolean
  sortOrder?: number
}

const SCHEDULE_COLUMNS = 'id, unit_id, week_number, start_date, end_date, topic, additional_topics, notes, source_upload_id, extraction_confidence, is_break, sort_order, created_at, updated_at'

/** List all schedule entries for a unit, ordered by week/sort. */
export async function listScheduleEntries(userId: string, unitId: string) {
  const client = createSupabaseServerClient()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('unit_schedule_entries')
      .select(SCHEDULE_COLUMNS)
      .eq('user_id', userId)
      .eq('unit_id', unitId)
      .order('week_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) { if (!isMissingRelation(error)) console.error('[Cloud] List schedule failed:', error.message); return null }
    return data ?? []
  } catch (err) {
    if (!isMissingRelation(err)) console.error('[Cloud] List schedule error:', err)
    return null
  }
}

/** List schedule entries for every unit owned by the user (used by dashboard/current-week lookups). */
export async function listAllScheduleEntries(userId: string) {
  const client = createSupabaseServerClient()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('unit_schedule_entries')
      .select(`${SCHEDULE_COLUMNS}, units!inner(code, name, user_id)`)
      .eq('user_id', userId)
      .order('week_number', { ascending: true })

    if (error) { if (!isMissingRelation(error)) console.error('[Cloud] List all schedule failed:', error.message); return null }
    return data ?? []
  } catch (err) {
    if (!isMissingRelation(err)) console.error('[Cloud] List all schedule error:', err)
    return null
  }
}

/** Create or update a single schedule entry (edit a week). */
export async function upsertScheduleEntry(userId: string, entry: ScheduleEntryInput) {
  const client = createSupabaseServerClient()
  if (!client) return { ok: false as const, error: 'Cloud unavailable' }

  const row = {
    ...(entry.id ? { id: entry.id } : {}),
    user_id: userId,
    unit_id: entry.unitId,
    week_number: entry.weekNumber,
    start_date: entry.startDate ?? null,
    end_date: entry.endDate ?? null,
    topic: entry.topic,
    additional_topics: entry.additionalTopics ?? [],
    notes: entry.notes ?? null,
    source_upload_id: entry.sourceUploadId ?? null,
    extraction_confidence: entry.extractionConfidence ?? null,
    is_break: entry.isBreak ?? false,
    sort_order: entry.sortOrder ?? 0
  }

  try {
    const { data, error } = await client
      .from('unit_schedule_entries')
      .upsert(row, { onConflict: 'id' })
      .select(SCHEDULE_COLUMNS)
      .maybeSingle()

    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, entry: data }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Failed to save schedule entry' }
  }
}

/** Delete a single schedule entry (delete a week). */
export async function deleteScheduleEntry(userId: string, entryId: string): Promise<void> {
  const client = createSupabaseServerClient()
  if (!client) return
  try {
    await client.from('unit_schedule_entries').delete().eq('user_id', userId).eq('id', entryId)
  } catch { /* non-fatal */ }
}

/**
 * Replace the entire schedule for a unit with a new set of entries (used when saving an
 * extracted preview, or resetting/re-importing a schedule). Existing entries not present
 * in the new set are removed; matching ids are updated; new entries are inserted.
 */
export async function replaceUnitSchedule(userId: string, unitId: string, entries: ScheduleEntryInput[]) {
  const client = createSupabaseServerClient()
  if (!client) return { ok: false as const, error: 'Cloud unavailable' }

  try {
    const keepIds = entries.filter((e) => e.id).map((e) => e.id as string)

    let deleteQuery = client.from('unit_schedule_entries').delete().eq('user_id', userId).eq('unit_id', unitId)
    if (keepIds.length > 0) deleteQuery = deleteQuery.not('id', 'in', `(${keepIds.join(',')})`)
    await deleteQuery

    if (entries.length === 0) return { ok: true as const, entries: [] }

    const rows = entries.map((entry, index) => ({
      ...(entry.id ? { id: entry.id } : {}),
      user_id: userId,
      unit_id: unitId,
      week_number: entry.weekNumber,
      start_date: entry.startDate ?? null,
      end_date: entry.endDate ?? null,
      topic: entry.topic,
      additional_topics: entry.additionalTopics ?? [],
      notes: entry.notes ?? null,
      source_upload_id: entry.sourceUploadId ?? null,
      extraction_confidence: entry.extractionConfidence ?? null,
      is_break: entry.isBreak ?? false,
      sort_order: entry.sortOrder ?? index
    }))

    const { data, error } = await client
      .from('unit_schedule_entries')
      .upsert(rows, { onConflict: 'id' })
      .select(SCHEDULE_COLUMNS)

    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, entries: data ?? [] }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : 'Failed to save schedule' }
  }
}
