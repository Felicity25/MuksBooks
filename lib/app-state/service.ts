import crypto from 'crypto'
import path from 'path'
import { promises as fs } from 'fs'
import { getCurrentMonashCalendar, getCurrentSemesterWeek } from '@/lib/semester-calendar'
import { getDb, nowIso } from './db'
import { loadCatalog, saveCatalog } from '@/lib/knowledge-base/catalog'
import { normalizeUserSettings, type UserSettings } from '@/lib/user-settings'

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

function json(value: unknown) {
  return JSON.stringify(value ?? null)
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

let catalogSyncPromise: Promise<void> | null = null

function normalizeCourseCode(value?: string | null) {
  return value?.toUpperCase().replace(/\s+/g, '') || ''
}

function resolveKnowledgePath(relativePath?: string | null) {
  if (!relativePath) return null
  return path.isAbsolute(relativePath) ? relativePath : path.join(process.cwd(), relativePath)
}

function deriveDocumentState(row: any) {
  const chunkCount = Number(row.chunk_count || 0)
  const extracted = Boolean(row.extracted_text_path)
  const processingStatus = String(row.processing_status || 'processed')
  const isFailed = /fail/i.test(processingStatus)

  return {
    ...row,
    week: row.week ?? null,
    lecture_number: row.lecture_number ?? null,
    tutorial_number: row.tutorial_number ?? null,
    workshop_number: row.workshop_number ?? null,
    assessment_number: row.assessment_number ?? null,
    upload_date: row.upload_date || row.created_at,
    course_code: row.course_code || null,
    course_name: row.course_name || null,
    document_type: row.document_type || null,
    processing_status: processingStatus,
    extraction_status: isFailed ? 'failed' : extracted ? 'text extracted' : 'uploaded',
    indexing_status: isFailed ? 'failed' : chunkCount > 0 ? 'indexed' : extracted ? 'extracted' : 'processing',
    tutor_ready: !isFailed && chunkCount > 0,
    knowledge_available: chunkCount > 0 ? 'available' : 'missing',
    chunk_count: chunkCount,
    embedded_chunk_count: Number(row.embedded_chunk_count || 0)
  }
}

async function ensureCatalogSynced() {
  if (!catalogSyncPromise) {
    catalogSyncPromise = (async () => {
      const catalog = await loadCatalog()

      for (const document of catalog.documents) {
        const metadata = document.metadata || { courseCode: 'UNCLASSIFIED' }
        const courseCode = normalizeCourseCode(metadata.courseCode)
        const syncedStatus = document.status === 'archived'
          ? 'archived'
          : document.chunkIds?.length
            ? 'tutor_ready'
            : document.extractedTextPath
              ? 'processing'
              : 'uploaded'
        const course = courseCode
          ? upsertCourse({
              courseCode,
              courseName: metadata.courseName,
              university: metadata.university,
              semester: metadata.semester,
              source: 'catalog_sync'
            })
          : null

        createOrUpdateDocument({
          id: document.documentId,
          courseId: course?.id,
          filename: document.fileName,
          originalPath: document.originalPath,
          documentType: metadata.documentType,
          week: metadata.weekNumber,
          lectureNumber: metadata.lectureNumber,
          tutorialNumber: metadata.tutorialNumber,
          assessmentNumber: metadata.assignmentNumber,
          uploadDate: document.uploadedAt,
          contentHash: document.fileHash,
          version: document.version,
          processingStatus: syncedStatus,
          extractedTextPath: document.extractedTextPath,
          metadata
        })
      }
    })().finally(() => {
      catalogSyncPromise = null
    })
  }

  return catalogSyncPromise
}

export function ensureUser(userId: string, defaults?: Partial<UserSettings>) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
  if (row) return row

  const now = nowIso()
  db.prepare(`
    INSERT INTO users (id, name, university, timezone, semester, preferences, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    defaults?.name || 'Student',
    'Monash',
    'Australia/Melbourne',
    'Semester 2',
    json(defaults || {}),
    now,
    now
  )

  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
}

export function ensureDefaultUser() {
  return ensureUser('default')
}

export function createEvent(eventType: string, payload: Record<string, unknown>) {
  const db = getDb()
  db.prepare('INSERT INTO app_events (id, event_type, payload, created_at) VALUES (?, ?, ?, ?)')
    .run(id('evt'), eventType, json(payload), nowIso())
}

export function listCourses(userId = 'default') {
  ensureUser(userId)
  const db = getDb()
  const rows = db.prepare(`
    SELECT c.*,
      COALESCE((SELECT mastery_level FROM unit_mastery m WHERE m.course_id = c.id AND m.user_id = ?), NULL) AS mastery_level
    FROM courses c
    WHERE (c.status IS NULL OR c.status != ?)
      AND COALESCE(c.user_id, ?) = ?
    ORDER BY c.created_at DESC
  `).all(userId, 'archived', 'default', userId) as any[]
  return rows
}

export async function listDocuments(filters: {
  courseId?: string
  courseCode?: string
  documentType?: string
  processingStatus?: string
  week?: number
  query?: string
  sort?: 'newest' | 'oldest' | 'filename' | 'unit' | 'week' | 'fileType'
  limit?: number
} = {}, userId = 'default') {
  ensureUser(userId)
  await ensureCatalogSynced()
  const db = getDb()
  const clauses: string[] = []
  const params: any[] = []

  clauses.push('COALESCE(c.user_id, ?) = ?')
  params.push('default', userId)

  if (filters.courseId) {
    clauses.push('d.course_id = ?')
    params.push(filters.courseId)
  }

  if (filters.courseCode) {
    clauses.push("UPPER(COALESCE(c.course_code, '')) = ?")
    params.push(normalizeCourseCode(filters.courseCode))
  }

  if (filters.documentType) {
    clauses.push("LOWER(COALESCE(d.document_type, '')) = LOWER(?)")
    params.push(filters.documentType)
  }

  if (filters.processingStatus) {
    clauses.push("LOWER(COALESCE(d.processing_status, '')) = LOWER(?)")
    params.push(filters.processingStatus)
  }

  if (typeof filters.week === 'number' && Number.isFinite(filters.week)) {
    clauses.push('d.week = ?')
    params.push(filters.week)
  }

  if (filters.query) {
    clauses.push(`(
      LOWER(COALESCE(d.filename, '')) LIKE LOWER(?) OR
      LOWER(COALESCE(c.course_code, '')) LIKE LOWER(?) OR
      LOWER(COALESCE(c.course_name, '')) LIKE LOWER(?) OR
      LOWER(COALESCE(d.document_type, '')) LIKE LOWER(?) OR
      LOWER(COALESCE(d.summary, '')) LIKE LOWER(?) OR
      LOWER(COALESCE(d.metadata, '')) LIKE LOWER(?)
    )`)
    const like = `%${filters.query}%`
    params.push(like, like, like, like, like, like)
  }

  const orderBy = {
    newest: 'COALESCE(d.upload_date, d.created_at) DESC, d.updated_at DESC',
    oldest: 'COALESCE(d.upload_date, d.created_at) ASC, d.updated_at ASC',
    filename: "LOWER(COALESCE(d.filename, '')) ASC",
    unit: "LOWER(COALESCE(c.course_code, '')) ASC, LOWER(COALESCE(d.filename, '')) ASC",
    week: 'COALESCE(d.week, 9999) ASC, COALESCE(d.upload_date, d.created_at) DESC',
    fileType: "LOWER(COALESCE(d.document_type, '')) ASC, COALESCE(d.upload_date, d.created_at) DESC"
  }[filters.sort || 'newest']

  const limit = Math.max(1, Math.min(filters.limit || 500, 1000))
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

  const rows = db.prepare(`
    SELECT
      d.*,
      c.course_code,
      c.course_name,
      COALESCE((SELECT COUNT(1) FROM knowledge_chunks k WHERE k.document_id = d.id), 0) AS chunk_count,
      COALESCE((SELECT COUNT(1) FROM knowledge_chunks k WHERE k.document_id = d.id AND k.embedding IS NOT NULL), 0) AS embedded_chunk_count
    FROM documents d
    LEFT JOIN courses c ON c.id = d.course_id
    ${where}
    ORDER BY ${orderBy}
    LIMIT ?
  `).all(...params, limit) as any[]

  return rows.map(deriveDocumentState)
}

export async function getDocument(documentId: string) {
  return getDocumentForUser(documentId, 'default')
}

export async function getDocumentForUser(documentId: string, userId = 'default') {
  ensureUser(userId)
  await ensureCatalogSynced()
  const db = getDb()
  const row = db.prepare(`
    SELECT
      d.*,
      c.course_code,
      c.course_name,
      COALESCE((SELECT COUNT(1) FROM knowledge_chunks k WHERE k.document_id = d.id), 0) AS chunk_count,
      COALESCE((SELECT COUNT(1) FROM knowledge_chunks k WHERE k.document_id = d.id AND k.embedding IS NOT NULL), 0) AS embedded_chunk_count
    FROM documents d
    LEFT JOIN courses c ON c.id = d.course_id
    WHERE d.id = ?
      AND COALESCE(c.user_id, ?) = ?
    LIMIT 1
  `).get(documentId, 'default', userId) as any

  return row ? deriveDocumentState(row) : null
}

export async function deleteDocument(documentId: string, userId = 'default') {
  ensureUser(userId)
  await ensureCatalogSynced()
  const db = getDb()
  const document = db.prepare(`
    SELECT d.*
    FROM documents d
    LEFT JOIN courses c ON c.id = d.course_id
    WHERE d.id = ? AND COALESCE(c.user_id, ?) = ?
    LIMIT 1
  `).get(documentId, 'default', userId) as any
  if (!document) return false

  db.prepare('DELETE FROM knowledge_chunks WHERE document_id = ?').run(documentId)
  db.prepare('DELETE FROM documents WHERE id = ?').run(documentId)

  const originalPath = resolveKnowledgePath(document.original_path)
  const extractedPath = resolveKnowledgePath(document.extracted_text_path)
  const courseRoot = originalPath ? path.dirname(path.dirname(originalPath)) : null

  const catalog = await loadCatalog()
  const removedChunks = catalog.chunks.filter((chunk) => chunk.documentId === documentId)
  catalog.documents = catalog.documents.filter((entry) => entry.documentId !== documentId)
  catalog.chunks = catalog.chunks.filter((chunk) => chunk.documentId !== documentId)
  await saveCatalog(catalog)

  const embeddingPaths = removedChunks
    .map((chunk) => resolveKnowledgePath(chunk.embeddingPath))
    .filter((filePath): filePath is string => Boolean(filePath))

  await Promise.allSettled([
    originalPath ? fs.unlink(originalPath) : Promise.resolve(),
    extractedPath ? fs.unlink(extractedPath) : Promise.resolve(),
    ...embeddingPaths.map((filePath) => fs.unlink(filePath)),
    ...(courseRoot
      ? removedChunks.map((chunk) => fs.unlink(path.join(courseRoot, 'Chunks', `${chunk.chunkId}.txt`)))
      : [])
  ])

  return true
}

export function upsertCourse(input: {
  courseCode: string
  courseName?: string
  university?: string
  semester?: string
  year?: number
  source?: string
  userId?: string
}) {
  const userId = input.userId || 'default'
  ensureUser(userId)
  const db = getDb()
  const existing = db.prepare('SELECT * FROM courses WHERE course_code = ? AND COALESCE(user_id, ?) = ? ORDER BY updated_at DESC LIMIT 1').get(input.courseCode, 'default', userId) as any
  const now = nowIso()

  if (existing) {
    db.prepare(`
      UPDATE courses
      SET course_name = COALESCE(?, course_name),
          university = COALESCE(?, university),
          semester = COALESCE(?, semester),
          year = COALESCE(?, year),
          source = COALESCE(?, source),
          user_id = COALESCE(user_id, ?),
          updated_at = ?
      WHERE id = ?
    `).run(input.courseName || null, input.university || null, input.semester || null, input.year ?? null, input.source || null, userId, now, existing.id)
    return db.prepare('SELECT * FROM courses WHERE id = ?').get(existing.id) as any
  }

  const created = {
    id: id('course'),
    course_name: input.courseName || input.courseCode,
    university: input.university || null,
    semester: input.semester || null,
    year: input.year ?? new Date().getFullYear(),
    status: 'active',
    source: input.source || 'document_analysis',
    user_id: userId,
    created_at: now,
    updated_at: now
  }

  db.prepare(`
    INSERT INTO courses (id, course_code, course_name, university, semester, year, status, source, user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    created.id,
    input.courseCode,
    created.course_name,
    created.university,
    created.semester,
    created.year,
    created.status,
    created.source,
    created.user_id,
    created.created_at,
    created.updated_at
  )

  return db.prepare('SELECT * FROM courses WHERE id = ?').get(created.id) as any
}

export function createUploadBatch(input: {
  userId?: string
  courseId?: string
  name: string
  totalFiles: number
  totalBytes?: number
}) {
  ensureDefaultUser()
  const db = getDb()
  const now = nowIso()
  const batchId = id('batch')

  db.prepare(`
    INSERT INTO upload_batches (
      id, user_id, course_id, name, status,
      total_files, completed_files, failed_files, queued_files, processing_files,
      total_bytes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    batchId,
    input.userId || 'default',
    input.courseId || null,
    input.name,
    'QUEUED',
    Math.max(0, input.totalFiles),
    0,
    0,
    Math.max(0, input.totalFiles),
    0,
    input.totalBytes ?? 0,
    now,
    now
  )

  createEvent('DOCUMENT_UPLOADED', { batchId, courseId: input.courseId, totalFiles: input.totalFiles })
  return db.prepare('SELECT * FROM upload_batches WHERE id = ?').get(batchId) as any
}

export function listUploadBatches(userId = 'default', limit = 20) {
  ensureDefaultUser()
  const db = getDb()
  const rows = db.prepare(`
    SELECT b.*, c.course_code, c.course_name
    FROM upload_batches b
    LEFT JOIN courses c ON c.id = b.course_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT ?
  `).all(userId, Math.max(1, Math.min(limit, 200))) as any[]
  return rows
}

export function getUploadBatch(batchId: string) {
  const db = getDb()
  const batch = db.prepare(`
    SELECT b.*, c.course_code, c.course_name
    FROM upload_batches b
    LEFT JOIN courses c ON c.id = b.course_id
    WHERE b.id = ?
    LIMIT 1
  `).get(batchId) as any
  if (!batch) return null

  const files = db.prepare(`
    SELECT bf.*, d.filename, d.processing_status AS document_processing_status
    FROM batch_files bf
    LEFT JOIN documents d ON d.id = bf.document_id
    WHERE bf.batch_id = ?
    ORDER BY bf.created_at ASC
  `).all(batchId) as any[]

  return { ...batch, files }
}

export function addBatchFile(input: {
  batchId: string
  userId?: string
  courseId?: string
  originalFilename: string
  displayName?: string
  relativePath?: string
  mimeType?: string
  sizeBytes?: number
  resourceType?: string
  week?: number
  topic?: string
  semester?: string
  academicYear?: number
  duplicateStrategy?: 'skip' | 'replace' | 'keep_both'
}) {
  const db = getDb()
  const now = nowIso()
  const batchFileId = id('batch_file')

  db.prepare(`
    INSERT INTO batch_files (
      id, batch_id, user_id, course_id, original_filename, display_name, relative_path,
      mime_type, size_bytes, resource_type, week, topic, semester, academic_year,
      processing_status, duplicate_strategy, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    batchFileId,
    input.batchId,
    input.userId || 'default',
    input.courseId || null,
    input.originalFilename,
    input.displayName || input.originalFilename,
    input.relativePath || null,
    input.mimeType || null,
    input.sizeBytes ?? 0,
    input.resourceType || 'OTHER',
    input.week ?? null,
    input.topic || null,
    input.semester || null,
    input.academicYear ?? null,
    'QUEUED',
    input.duplicateStrategy || 'skip',
    now,
    now
  )

  return db.prepare('SELECT * FROM batch_files WHERE id = ?').get(batchFileId) as any
}

export function updateBatchFileStatus(input: {
  batchFileId: string
  status: 'QUEUED' | 'UPLOADING' | 'PROCESSING' | 'INDEXING' | 'READY' | 'FAILED' | 'DUPLICATE_SKIPPED'
  errorMessage?: string
  documentId?: string
  fileHash?: string
  duplicateOfDocumentId?: string
  version?: number
}) {
  const db = getDb()
  db.prepare(`
    UPDATE batch_files
    SET processing_status = ?,
        error_message = ?,
        document_id = COALESCE(?, document_id),
        file_hash = COALESCE(?, file_hash),
        duplicate_of_document_id = COALESCE(?, duplicate_of_document_id),
        version = COALESCE(?, version),
        updated_at = ?
    WHERE id = ?
  `).run(
    input.status,
    input.errorMessage || null,
    input.documentId || null,
    input.fileHash || null,
    input.duplicateOfDocumentId || null,
    input.version ?? null,
    nowIso(),
    input.batchFileId
  )

  const file = db.prepare('SELECT batch_id FROM batch_files WHERE id = ? LIMIT 1').get(input.batchFileId) as any
  if (file?.batch_id) {
    recomputeBatchStatus(file.batch_id)
  }
}

export function recomputeBatchStatus(batchId: string) {
  const db = getDb()
  const files = db.prepare('SELECT processing_status FROM batch_files WHERE batch_id = ?').all(batchId) as Array<{ processing_status: string }>
  const total = files.length
  const completed = files.filter((row) => row.processing_status === 'READY' || row.processing_status === 'DUPLICATE_SKIPPED').length
  const failed = files.filter((row) => row.processing_status === 'FAILED').length
  const processing = files.filter((row) => row.processing_status === 'PROCESSING' || row.processing_status === 'INDEXING' || row.processing_status === 'UPLOADING').length
  const queued = files.filter((row) => row.processing_status === 'QUEUED').length

  let status = 'QUEUED'
  if (total > 0 && completed === total) {
    status = 'COMPLETE'
  } else if (failed > 0 && completed > 0) {
    status = 'PARTIAL'
  } else if (failed > 0 && completed === 0 && processing === 0 && queued === 0) {
    status = 'FAILED'
  } else if (processing > 0 || completed > 0) {
    status = 'PROCESSING'
  }

  db.prepare(`
    UPDATE upload_batches
    SET total_files = ?, completed_files = ?, failed_files = ?, queued_files = ?, processing_files = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(total, completed, failed, queued, processing, status, nowIso(), batchId)
}

export function createOrUpdateDocument(input: {
  id?: string
  courseId?: string
  batchId?: string
  batchFileId?: string
  filename: string
  originalFilename?: string
  originalPath?: string
  relativePath?: string
  mimeType?: string
  sizeBytes?: number
  documentType?: string
  resourceType?: string
  topic?: string
  academicYear?: number
  week?: number
  lectureNumber?: number
  tutorialNumber?: number
  workshopNumber?: number
  assessmentNumber?: number
  uploadDate?: string
  contentHash?: string
  version?: number
  processingStatus?: string
  extractedTextPath?: string
  summary?: string
  metadata?: Record<string, unknown>
}) {
  const db = getDb()
  const now = nowIso()

  const existing = input.contentHash
    ? db.prepare('SELECT * FROM documents WHERE content_hash = ? ORDER BY updated_at DESC LIMIT 1').get(input.contentHash) as any
    : null

  if (existing) {
    db.prepare(`
      UPDATE documents
      SET course_id = COALESCE(?, course_id),
          batch_id = COALESCE(?, batch_id),
          batch_file_id = COALESCE(?, batch_file_id),
          original_filename = COALESCE(?, original_filename),
          document_type = COALESCE(?, document_type),
          relative_path = COALESCE(?, relative_path),
          mime_type = COALESCE(?, mime_type),
          size_bytes = COALESCE(?, size_bytes),
          resource_type = COALESCE(?, resource_type),
          topic = COALESCE(?, topic),
          academic_year = COALESCE(?, academic_year),
          week = COALESCE(?, week),
          lecture_number = COALESCE(?, lecture_number),
          tutorial_number = COALESCE(?, tutorial_number),
          workshop_number = COALESCE(?, workshop_number),
          assessment_number = COALESCE(?, assessment_number),
          processing_status = COALESCE(?, processing_status),
          extracted_text_path = COALESCE(?, extracted_text_path),
          summary = COALESCE(?, summary),
          metadata = COALESCE(?, metadata),
          updated_at = ?
      WHERE id = ?
    `).run(
      input.courseId || null,
      input.batchId || null,
      input.batchFileId || null,
      input.originalFilename || null,
      input.documentType || null,
      input.relativePath || null,
      input.mimeType || null,
      input.sizeBytes ?? null,
      input.resourceType || null,
      input.topic || null,
      input.academicYear ?? null,
      input.week ?? null,
      input.lectureNumber ?? null,
      input.tutorialNumber ?? null,
      input.workshopNumber ?? null,
      input.assessmentNumber ?? null,
      input.processingStatus || null,
      input.extractedTextPath || null,
      input.summary || null,
      input.metadata ? json(input.metadata) : null,
      now,
      existing.id
    )
    return db.prepare('SELECT * FROM documents WHERE id = ?').get(existing.id) as any
  }

  const docId = input.id || id('doc')
  db.prepare(`
    INSERT INTO documents (
      id, course_id, batch_id, batch_file_id, filename, original_filename, original_path, relative_path,
      mime_type, size_bytes, document_type, resource_type, topic, academic_year, week, lecture_number, tutorial_number, workshop_number,
      assessment_number, upload_date, content_hash, version, processing_status, extracted_text_path,
      summary, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    docId,
    input.courseId || null,
    input.batchId || null,
    input.batchFileId || null,
    input.filename,
    input.originalFilename || input.filename,
    input.originalPath || null,
    input.relativePath || null,
    input.mimeType || null,
    input.sizeBytes ?? null,
    input.documentType || null,
    input.resourceType || null,
    input.topic || null,
    input.academicYear ?? null,
    input.week ?? null,
    input.lectureNumber ?? null,
    input.tutorialNumber ?? null,
    input.workshopNumber ?? null,
    input.assessmentNumber ?? null,
    input.uploadDate || now,
    input.contentHash || null,
    input.version ?? 1,
    input.processingStatus || 'processed',
    input.extractedTextPath || null,
    input.summary || null,
    input.metadata ? json(input.metadata) : null,
    now,
    now
  )

  return db.prepare('SELECT * FROM documents WHERE id = ?').get(docId) as any
}

export function addKnowledgeChunk(input: {
  id?: string
  documentId?: string
  courseId?: string
  chunkIndex: number
  text: string
  section?: string
  topic?: string
  embedding?: number[]
  metadata?: Record<string, unknown>
}) {
  const db = getDb()
  const chunkId = input.id || id('chunk')
  db.prepare(`
    INSERT INTO knowledge_chunks (id, document_id, course_id, chunk_index, text, section, topic, embedding, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    chunkId,
    input.documentId || null,
    input.courseId || null,
    input.chunkIndex,
    input.text,
    input.section || null,
    input.topic || null,
    input.embedding ? json(input.embedding) : null,
    input.metadata ? json(input.metadata) : null,
    nowIso()
  )
  return chunkId
}

export function upsertAssessment(input: {
  courseId: string
  name: string
  type: string
  weighting?: number
  dueDate?: string
  sourceDocumentId?: string
}) {
  const db = getDb()
  const now = nowIso()
  const existing = db.prepare('SELECT * FROM assessments WHERE course_id = ? AND name = ? LIMIT 1').get(input.courseId, input.name) as any

  const createConflict = (existingRow: any) => {
    const existingDue = existingRow?.due_date ? String(existingRow.due_date) : null
    const newDue = input.dueDate ? String(input.dueDate) : null
    if (!existingDue || !newDue || existingDue === newDue) return

    const existingSource = existingRow?.source_document_id ? String(existingRow.source_document_id) : null
    const newSource = input.sourceDocumentId ? String(input.sourceDocumentId) : null
    if (existingSource && newSource && existingSource === newSource) return

    const duplicate = db.prepare(`
      SELECT id
      FROM assessment_conflicts
      WHERE course_id = ?
        AND LOWER(assessment_name) = LOWER(?)
        AND due_date_existing = ?
        AND due_date_new = ?
        AND COALESCE(source_document_id_existing, '') = COALESCE(?, '')
        AND COALESCE(source_document_id_new, '') = COALESCE(?, '')
      LIMIT 1
    `).get(input.courseId, input.name, existingDue, newDue, existingSource, newSource) as { id?: string } | undefined

    if (duplicate?.id) {
      db.prepare('UPDATE assessment_conflicts SET updated_at = ? WHERE id = ?').run(now, duplicate.id)
      return
    }

    db.prepare(`
      INSERT INTO assessment_conflicts (
        id, course_id, assessment_name, due_date_existing, due_date_new,
        source_document_id_existing, source_document_id_new, status, details, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id('assessment_conflict'),
      input.courseId,
      input.name,
      existingDue,
      newDue,
      existingSource,
      newSource,
      'open',
      json({ reason: 'Conflicting assessment date extracted from multiple uploads' }),
      now,
      now
    )
  }

  if (existing) {
    createConflict(existing)
    db.prepare(`
      UPDATE assessments
      SET type = ?, weighting = COALESCE(?, weighting), due_date = COALESCE(?, due_date), source_document_id = COALESCE(?, source_document_id), updated_at = ?
      WHERE id = ?
    `).run(input.type, input.weighting ?? null, input.dueDate || null, input.sourceDocumentId || null, now, existing.id)
    return
  }

  db.prepare(`
    INSERT INTO assessments (id, course_id, name, type, weighting, due_date, status, source_document_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id('assessment'), input.courseId, input.name, input.type, input.weighting ?? null, input.dueDate || null, 'upcoming', input.sourceDocumentId || null, now, now)
}

export function upsertTopic(input: {
  courseId: string
  name: string
  week?: number
  description?: string
  sourceDocumentId?: string
}) {
  const db = getDb()
  const now = nowIso()
  const existing = db.prepare('SELECT * FROM topics WHERE course_id = ? AND COALESCE(week, -1) = COALESCE(?, -1) AND LOWER(name) = LOWER(?) LIMIT 1').get(input.courseId, input.week ?? null, input.name) as any

  if (existing) {
    db.prepare(`
      UPDATE topics
      SET description = COALESCE(?, description),
          week = COALESCE(?, week),
          updated_at = ?
      WHERE id = ?
    `).run(input.description || null, input.week ?? null, now, existing.id)
    return existing.id as string
  }

  const topicId = id('topic')
  db.prepare(`
    INSERT INTO topics (id, course_id, name, description, week, lecture_number, parent_topic_id, importance, exam_relevance, learning_status, mastery_score, confidence_score, last_studied_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, NULL, NULL, 0.5, 0.5, 'new', 0, 0, NULL, ?, ?)
  `).run(topicId, input.courseId, input.name, input.description || null, input.week ?? null, now, now)
  createEvent('TOPIC_CREATED', { courseId: input.courseId, topicId, week: input.week ?? null, name: input.name })
  return topicId
}

export function extractWeeklyTopicsFromText(courseId: string, text: string, sourceDocumentId?: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const weekTopicPairs: Array<{ week: number; topic: string }> = []

  for (const line of lines) {
    const match = line.match(/(?:week\s*0?(\d{1,2}))\s*[-:–—]\s*(.+)$/i)
    if (match?.[1] && match[2]) {
      const week = Number(match[1])
      const topic = match[2].replace(/\s+/g, ' ').trim()
      if (Number.isFinite(week) && topic) {
        weekTopicPairs.push({ week, topic })
      }
    }
  }

  const topicHeadingPattern = /^(?:topic|lecture|tutorial)\s*0?(\d{1,2})\s*[:\-–—]\s*(.+)$/i
  for (const line of lines) {
    const match = line.match(topicHeadingPattern)
    if (match?.[1] && match[2]) {
      const week = Number(match[1])
      const topic = match[2].replace(/\s+/g, ' ').trim()
      if (Number.isFinite(week) && topic) {
        weekTopicPairs.push({ week, topic })
      }
    }
  }

  for (const entry of weekTopicPairs) {
    upsertTopic({
      courseId,
      week: entry.week,
      name: entry.topic,
      description: sourceDocumentId ? `Extracted from ${sourceDocumentId}` : undefined,
      sourceDocumentId
    })
  }

  return weekTopicPairs
}

export function extractAssessmentsFromText(courseId: string, text: string, sourceDocumentId?: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const detected: Array<{ name: string; type: string; weighting?: number; dueDate?: string }> = []

  const currentYear = getCurrentMonashCalendar(new Date())?.year || new Date().getFullYear()
  const monthMap: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11
  }

  const parseDateFromLine = (line: string) => {
    const slash = line.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
    if (slash) {
      const day = Number(slash[1])
      const month = Number(slash[2])
      const year = slash[3] ? Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]) : currentYear
      const date = new Date(Date.UTC(year, month - 1, day))
      if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
    }

    const named = line.match(/\b(\d{1,2})\s+([A-Za-z]{3,12})(?:\s+(20\d{2}))?\b/)
    if (named) {
      const day = Number(named[1])
      const month = monthMap[named[2].toLowerCase()]
      const year = named[3] ? Number(named[3]) : currentYear
      if (typeof month === 'number') {
        const date = new Date(Date.UTC(year, month, day))
        if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
      }
    }

    return undefined
  }

  const normalizeAssessmentName = (line: string) => {
    const assignment = line.match(/\bassignment\s*([1-9]\d*)\b/i)
    if (assignment?.[1]) return `Assignment ${assignment[1]}`

    const quiz = line.match(/\bquiz\s*([1-9]\d*)\b/i)
    if (quiz?.[1]) return `Quiz ${quiz[1]}`

    if (/mid\s*[- ]?semester\s*(test|exam)?/i.test(line)) return 'Mid-semester test'
    if (/final\s*exam/i.test(line)) return 'Final exam'
    if (/\bexam\b/i.test(line)) return 'Exam'
    if (/\btest\b/i.test(line)) return 'Test'
    return undefined
  }

  const detectType = (name: string) => {
    if (/assignment/i.test(name)) return 'assignment'
    if (/quiz|test/i.test(name)) return 'quiz'
    return 'exam'
  }

  for (const line of lines) {
    if (!/(assignment|quiz|test|exam|mid\s*[- ]?semester)/i.test(line)) continue
    const name = normalizeAssessmentName(line)
    if (!name) continue

    const weightingMatch = line.match(/(\d+(?:\.\d+)?)\s*%/)
    const weighting = weightingMatch ? Number(weightingMatch[1]) : undefined
    const dueDate = parseDateFromLine(line)

    detected.push({
      name,
      type: detectType(name),
      weighting: Number.isFinite(weighting as number) ? weighting : undefined,
      dueDate
    })
  }

  const fallbackPatterns = [
    { name: 'Assignment 1', regex: /assignment\s*1\D+(\d+(?:\.\d+)?)\s*%/i, type: 'assignment' },
    { name: 'Assignment 2', regex: /assignment\s*2\D+(\d+(?:\.\d+)?)\s*%/i, type: 'assignment' },
    { name: 'Assignment 3', regex: /assignment\s*3\D+(\d+(?:\.\d+)?)\s*%/i, type: 'assignment' },
    { name: 'Final Exam', regex: /(final\s*exam|exam)\D+(\d+(?:\.\d+)?)\s*%/i, type: 'exam' }
  ]

  for (const pattern of fallbackPatterns) {
    const match = text.match(pattern.regex)
    if (!match) continue
    if (detected.find((entry) => entry.name.toLowerCase() === pattern.name.toLowerCase())) continue
    const rawWeight = match[2] || match[1]
    const weight = Number(rawWeight)
    if (!Number.isFinite(weight)) continue
    detected.push({ name: pattern.name, type: pattern.type, weighting: weight })
  }

  for (const entry of detected) {
    upsertAssessment({
      courseId,
      name: entry.name,
      type: entry.type,
      weighting: entry.weighting,
      dueDate: entry.dueDate,
      sourceDocumentId
    })
  }

  return detected
}

export function getDashboard(userId = 'default') {
  ensureDefaultUser()
  const db = getDb()
  const currentWeek = getCurrentSemesterWeek(new Date())
  const currentWeekNumber = currentWeek?.weekNumber || null

  const today = new Date().toISOString().slice(0, 10)
  const upcomingLimitDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const todayTasks = db.prepare(`
    SELECT t.*, c.course_code, c.course_name
    FROM planner_tasks t
    LEFT JOIN courses c ON c.id = t.course_id
    WHERE t.user_id = ? AND t.completed = 0 AND (t.planned_date IS NULL OR substr(t.planned_date,1,10) <= ?)
    ORDER BY COALESCE(t.priority, 0) DESC, COALESCE(t.due_date, t.planned_date) ASC
    LIMIT 12
  `).all(userId, today) as any[]

  const upcomingAssessments = db.prepare(`
    SELECT a.*, c.course_code, c.course_name
    FROM assessments a
    LEFT JOIN courses c ON c.id = a.course_id
    WHERE a.status != 'completed'
      AND COALESCE(c.user_id, ?) = ?
      AND (a.due_date IS NULL OR a.due_date <= ?)
    ORDER BY COALESCE(a.due_date, a.created_at) ASC
    LIMIT 12
  `).all('default', userId, upcomingLimitDate) as any[]

  const activeCourses = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(1) FROM topics t WHERE t.course_id = c.id) AS topic_count,
      (SELECT AVG(t.mastery_score) FROM topics t WHERE t.course_id = c.id) AS avg_mastery,
      COALESCE((SELECT mastery_level FROM unit_mastery m WHERE m.course_id = c.id AND m.user_id = ?), 0) AS mastery_level
    FROM courses c
    WHERE (c.status IS NULL OR c.status != 'archived') AND COALESCE(c.user_id, ?) = ?
    ORDER BY c.updated_at DESC
  `).all(userId, 'default', userId) as any[]

  const weakTopics = db.prepare(`
    SELECT t.*, c.course_code
    FROM topics t
    LEFT JOIN courses c ON c.id = t.course_id
    WHERE COALESCE(t.mastery_score, 0) < 0.45
      AND COALESCE(c.user_id, ?) = ?
    ORDER BY COALESCE(t.mastery_score, 0) ASC, t.updated_at DESC
    LIMIT 10
  `).all('default', userId) as any[]

  const currentTopics = currentWeekNumber
    ? db.prepare(`
      SELECT t.*, c.course_code
      FROM topics t
      LEFT JOIN courses c ON c.id = t.course_id
      WHERE t.week = ?
        AND COALESCE(c.user_id, ?) = ?
      ORDER BY c.updated_at DESC, t.updated_at DESC
      LIMIT 12
    `).all(currentWeekNumber, 'default', userId) as any[]
    : []

  const recentResources = db.prepare(`
    SELECT d.*, c.course_code
    FROM documents d
    LEFT JOIN courses c ON c.id = d.course_id
    WHERE COALESCE(c.user_id, ?) = ?
    ORDER BY d.created_at DESC
    LIMIT 10
  `).all('default', userId) as any[]

  const assessmentConflicts = db.prepare(`
    SELECT ac.*, c.course_code
    FROM assessment_conflicts ac
    LEFT JOIN courses c ON c.id = ac.course_id
    WHERE ac.status = 'open'
      AND COALESCE(c.user_id, ?) = ?
    ORDER BY ac.updated_at DESC
    LIMIT 6
  `).all('default', userId) as any[]

  const careerPulse = {
    activeApplications: Number((db.prepare(`
      SELECT COUNT(1) as count
      FROM career_applications
      WHERE user_id = ? AND stage NOT IN ('Accepted', 'Rejected', 'Withdrawn', 'Closed')
    `).get(userId) as any)?.count || 0),
    outstandingAssessments: Number((db.prepare(`
      SELECT COUNT(1) as count
      FROM career_assessments
      WHERE user_id = ? AND status != 'Completed'
    `).get(userId) as any)?.count || 0),
    interviews: Number((db.prepare(`
      SELECT COUNT(1) as count
      FROM career_applications
      WHERE user_id = ? AND stage IN ('Interview', 'Phone Interview', 'Video Interview', 'Final Interview', 'Assessment Centre')
    `).get(userId) as any)?.count || 0),
    needsAttention: db.prepare(`
      SELECT title, deadline_at_utc
      FROM career_assessments
      WHERE user_id = ? AND status != 'Completed' AND deadline_at_utc IS NOT NULL
      ORDER BY deadline_at_utc ASC
      LIMIT 3
    `).all(userId) as Array<{ title: string; deadline_at_utc: string }>
  }

  const continueLearning = db.prepare(`
    SELECT s.*, c.course_code, t.name AS topic_name
    FROM study_sessions s
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN topics t ON t.id = s.topic_id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
    LIMIT 1
  `).get(userId) as any

  const studyStats = db.prepare(`
    SELECT
      COUNT(1) AS sessions_count,
      COALESCE(SUM(duration), 0) AS total_minutes
    FROM study_sessions
    WHERE user_id = ?
  `).get(userId) as any

  return {
    todayTasks,
    upcomingAssessments,
    activeCourses,
    continueLearning,
    weakTopics,
    currentWeek: currentWeek ? {
      label: currentWeek.label,
      start: currentWeek.start,
      end: currentWeek.end,
      phase: currentWeek.phase,
      weekNumber: currentWeek.weekNumber || null
    } : null,
    currentTopics,
    recentResources,
    assessmentConflicts,
    studyStats,
    careerPulse
  }
}

export function getPlannerContext(userId = 'default') {
  ensureUser(userId)
  const db = getDb()

  const courses = db.prepare('SELECT * FROM courses WHERE (status IS NULL OR status != ?) AND COALESCE(user_id, ?) = ? ORDER BY updated_at DESC').all('archived', 'default', userId) as any[]
  const assessments = db.prepare(`
    SELECT a.*
    FROM assessments a
    LEFT JOIN courses c ON c.id = a.course_id
    WHERE COALESCE(c.user_id, ?) = ?
    ORDER BY COALESCE(a.due_date, a.created_at) ASC
  `).all('default', userId) as any[]
  const topics = db.prepare(`
    SELECT t.*
    FROM topics t
    LEFT JOIN courses c ON c.id = t.course_id
    WHERE COALESCE(c.user_id, ?) = ?
    ORDER BY t.updated_at DESC
  `).all('default', userId) as any[]
  const mastery = topics.map((topic) => ({
    topicId: topic.id,
    masteryScore: topic.mastery_score ?? 0,
    confidenceScore: topic.confidence_score ?? 0
  }))
  const studyHistory = db.prepare('SELECT * FROM study_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 40').all(userId) as any[]
  const existingTasks = db.prepare('SELECT * FROM planner_tasks WHERE user_id = ? ORDER BY COALESCE(planned_date, due_date, created_at) ASC').all(userId) as any[]

  return {
    courses,
    assessments,
    topics,
    mastery,
    studyHistory,
    availability: { timezone: 'Australia/Melbourne' },
    existingTasks,
    priorityInformation: {
      formula: 'urgency * weighting * importance * weakness * dependency'
    }
  }
}

export function listPlannerTasks(userId = 'default') {
  ensureDefaultUser()
  const db = getDb()
  return db.prepare(`
    SELECT t.*, c.course_code, c.course_name
    FROM planner_tasks t
    LEFT JOIN courses c ON c.id = t.course_id
    WHERE t.user_id = ?
    ORDER BY COALESCE(t.planned_date, t.due_date, t.created_at) ASC
  `).all(userId) as any[]
}

export function createPlannerTask(input: {
  userId?: string
  courseId?: string
  topicId?: string
  assessmentId?: string
  careerAssessmentId?: string
  title: string
  description?: string
  taskType?: string
  priority?: number
  plannedDate?: string
  dueDate?: string
  estimatedMinutes?: number
  generatedBy?: string
}) {
  const db = getDb()
  const now = nowIso()
  const taskId = id('task')
  db.prepare(`
    INSERT INTO planner_tasks (
      id, user_id, course_id, topic_id, assessment_id, career_assessment_id, title, description, task_type,
      priority, planned_date, due_date, estimated_minutes, completed, generated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    taskId,
    input.userId || 'default',
    input.courseId || null,
    input.topicId || null,
    input.assessmentId || null,
    input.careerAssessmentId || null,
    input.title,
    input.description || null,
    input.taskType || 'study',
    input.priority ?? 0.5,
    input.plannedDate || null,
    input.dueDate || null,
    input.estimatedMinutes ?? 45,
    0,
    input.generatedBy || 'user',
    now,
    now
  )

  createEvent('TASK_CREATED', { taskId, userId: input.userId || 'default' })
  return taskId
}

export function completePlannerTask(taskId: string) {
  const db = getDb()
  const now = nowIso()
  db.prepare('UPDATE planner_tasks SET completed = 1, completed_at = ?, updated_at = ? WHERE id = ?').run(now, now, taskId)

  const linked = db.prepare('SELECT career_assessment_id FROM planner_tasks WHERE id = ?').get(taskId) as { career_assessment_id?: string | null } | undefined
  if (linked?.career_assessment_id) {
    db.prepare(`
      UPDATE career_assessments
      SET status = 'Completed', completed_at_utc = COALESCE(completed_at_utc, ?), planner_task_id = ?, updated_at = ?
      WHERE id = ?
    `).run(now, taskId, now, linked.career_assessment_id)
  }

  createEvent('TASK_COMPLETED', { taskId })
}

export function deletePlannerTask(taskId: string) {
  const db = getDb()
  const linked = db.prepare('SELECT career_assessment_id FROM planner_tasks WHERE id = ?').get(taskId) as { career_assessment_id?: string | null } | undefined
  db.prepare('DELETE FROM planner_tasks WHERE id = ?').run(taskId)

  if (linked?.career_assessment_id) {
    db.prepare('UPDATE career_assessments SET planner_task_id = NULL, updated_at = ? WHERE id = ?').run(nowIso(), linked.career_assessment_id)
  }

  createEvent('TASK_COMPLETED', { taskId, deleted: true })
}

export function archiveCourse(courseId: string) {
  const db = getDb()
  const now = nowIso()
  db.prepare('UPDATE courses SET status = ?, updated_at = ? WHERE id = ?').run('archived', now, courseId)
  createEvent('COURSE_UPDATED', { courseId, status: 'archived' })
}

export function getUserSettings(userId = 'default'): UserSettings {
  ensureUser(userId)
  const db = getDb()
  const row = db.prepare('SELECT name, preferences FROM users WHERE id = ?').get(userId) as { name?: string | null; preferences?: string | null } | undefined
  const parsed = parseJson<Partial<UserSettings>>(row?.preferences || null) || {}
  return normalizeUserSettings({ ...parsed, name: parsed.name || row?.name || '' })
}

export function updateUserSettings(userId: string, updates: Partial<UserSettings>) {
  ensureUser(userId)
  const db = getDb()
  const current = getUserSettings(userId)
  const merged = normalizeUserSettings({
    ...current,
    ...updates
  })
  db.prepare('UPDATE users SET name = ?, preferences = ?, updated_at = ? WHERE id = ?')
    .run(merged.name || 'Student', json(merged), nowIso(), userId)
  createEvent('STUDY_PLAN_UPDATED', { userId, settingsUpdated: true })
  return merged
}

export function getUnitMastery(userId = 'default') {
  ensureUser(userId)
  const db = getDb()
  return db.prepare(`
    SELECT
      c.id,
      c.course_code,
      c.course_name,
      COALESCE(m.mastery_level, 0) AS mastery_level,
      m.updated_at AS mastery_updated_at
    FROM courses c
    LEFT JOIN unit_mastery m ON m.course_id = c.id AND m.user_id = ?
    WHERE COALESCE(c.user_id, ?) = ? AND (c.status IS NULL OR c.status != 'archived')
    ORDER BY c.updated_at DESC
  `).all(userId, 'default', userId) as Array<{ id: string; course_code: string; course_name?: string | null; mastery_level: number; mastery_updated_at?: string | null }>
}

export function setUnitMastery(userId: string, courseId: string, masteryLevel: number) {
  ensureUser(userId)
  const db = getDb()
  const now = nowIso()
  const existing = db.prepare('SELECT id FROM unit_mastery WHERE user_id = ? AND course_id = ?').get(userId, courseId) as { id?: string } | undefined

  if (existing?.id) {
    db.prepare('UPDATE unit_mastery SET mastery_level = ?, updated_at = ? WHERE id = ?').run(masteryLevel, now, existing.id)
  } else {
    db.prepare('INSERT INTO unit_mastery (id, user_id, course_id, mastery_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id('mastery'), userId, courseId, masteryLevel, now, now)
  }

  createEvent('TOPIC_MASTERY_UPDATED', { userId, courseId, masteryLevel })
  return db.prepare(`
    SELECT
      c.id,
      c.course_code,
      c.course_name,
      COALESCE(m.mastery_level, 0) AS mastery_level,
      m.updated_at AS mastery_updated_at
    FROM courses c
    LEFT JOIN unit_mastery m ON m.course_id = c.id AND m.user_id = ?
    WHERE c.id = ?
  `).get(userId, courseId) as { id: string; course_code: string; course_name?: string | null; mastery_level: number; mastery_updated_at?: string | null }
}

export function getLessonContext(input: { unit?: string; topic?: string }) {
  ensureDefaultUser()
  const db = getDb()
  const unit = input.unit?.trim().toUpperCase()
  const topic = input.topic?.trim().toLowerCase()

  const courses = unit
    ? db.prepare('SELECT * FROM courses WHERE course_code = ? AND (status IS NULL OR status != ?)').all(unit, 'archived') as any[]
    : db.prepare('SELECT * FROM courses WHERE status IS NULL OR status != ? ORDER BY updated_at DESC').all('archived') as any[]

  const courseIds = courses.map((course) => course.id)
  const tasks = courseIds.length
    ? db.prepare(`
      SELECT * FROM planner_tasks
      WHERE user_id = ?
        AND course_id IN (${courseIds.map(() => '?').join(',')})
      ORDER BY created_at DESC
      LIMIT 40
    `).all('default', ...courseIds) as any[]
    : db.prepare('SELECT * FROM planner_tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 40').all('default') as any[]

  const sessions = courseIds.length
    ? db.prepare(`
      SELECT * FROM study_sessions
      WHERE user_id = ?
        AND course_id IN (${courseIds.map(() => '?').join(',')})
      ORDER BY created_at DESC
      LIMIT 40
    `).all('default', ...courseIds) as any[]
    : db.prepare('SELECT * FROM study_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 40').all('default') as any[]

  const masteryRows = courseIds.length
    ? db.prepare(`
      SELECT * FROM topics
      WHERE course_id IN (${courseIds.map(() => '?').join(',')})
      ORDER BY COALESCE(mastery_score, 0) ASC, updated_at DESC
      LIMIT 80
    `).all(...courseIds) as any[]
    : db.prepare('SELECT * FROM topics ORDER BY COALESCE(mastery_score, 0) ASC, updated_at DESC LIMIT 80').all() as any[]

  const docs = courseIds.length
    ? db.prepare(`
      SELECT d.*, c.course_code,
        COALESCE((SELECT COUNT(1) FROM knowledge_chunks k WHERE k.document_id = d.id), 0) AS chunk_count
      FROM documents d
      LEFT JOIN courses c ON c.id = d.course_id
      WHERE d.course_id IN (${courseIds.map(() => '?').join(',')})
      ORDER BY d.created_at DESC
      LIMIT 20
    `).all(...courseIds) as any[]
    : db.prepare(`
      SELECT d.*, c.course_code,
        COALESCE((SELECT COUNT(1) FROM knowledge_chunks k WHERE k.document_id = d.id), 0) AS chunk_count
      FROM documents d
      LEFT JOIN courses c ON c.id = d.course_id
      ORDER BY d.created_at DESC
      LIMIT 20
    `).all() as any[]

  const relevantChunks = courseIds.length
    ? db.prepare(`
      SELECT k.*, d.filename, c.course_code
      FROM knowledge_chunks k
      LEFT JOIN documents d ON d.id = k.document_id
      LEFT JOIN courses c ON c.id = k.course_id
      WHERE k.course_id IN (${courseIds.map(() => '?').join(',')})
      ORDER BY k.created_at DESC
      LIMIT 200
    `).all(...courseIds) as any[]
    : db.prepare(`
      SELECT k.*, d.filename, c.course_code
      FROM knowledge_chunks k
      LEFT JOIN documents d ON d.id = k.document_id
      LEFT JOIN courses c ON c.id = k.course_id
      ORDER BY k.created_at DESC
      LIMIT 200
    `).all() as any[]

  const normalizedTopic = topic || ''
  const filteredChunks = normalizedTopic
    ? relevantChunks
        .map((row) => {
          const text = String(row.text || '').toLowerCase()
          const section = String(row.section || '').toLowerCase()
          const score = Number(text.includes(normalizedTopic)) + Number(section.includes(normalizedTopic))
          return { row, score }
        })
        .sort((a, b) => b.score - a.score)
        .map((item) => item.row)
    : relevantChunks

  const chunks = filteredChunks.slice(0, 8).map((row) => {
    const source = row.filename ? `${row.filename}${row.course_code ? ` (${row.course_code})` : ''}` : 'Resource'
    return `${String(row.text || '').slice(0, 260)} [${source}]`
  })

  const uploadSummaries = docs.slice(0, 6).map((doc) => {
    return `${doc.filename}${doc.course_code ? ` (${doc.course_code})` : ''}: ${doc.summary || doc.document_type || 'resource'}`
  })

  const weakTopics = masteryRows.filter((row) => Number(row.mastery_score ?? 0) < 0.45)
  const settings = getUserSettings('default')
  const selectedUnit = courses[0]?.course_code || unit || ''

  const contextSummary = [
    selectedUnit ? `Selected unit: ${selectedUnit}` : 'No unit selected.',
    input.topic ? `Selected topic: ${input.topic}` : 'No topic selected.',
    uploadSummaries.length ? `Uploads: ${uploadSummaries.join(' | ')}` : 'No uploads available for this unit.',
    tasks.length ? `You have ${tasks.length} tasks in scope.` : 'No current tasks stored.',
    sessions.length ? `You have ${sessions.length} planned or completed study sessions.` : 'No planner sessions stored.',
    masteryRows.length ? `Mastery data for ${masteryRows.length} topics is available.` : 'No mastery data available.',
    settings.name || settings.degree
      ? `Student profile: ${settings.name || 'Unnamed'} / ${settings.degree || 'Degree not set'}. Target marks: ${settings.targetMarks || 'Not set'}.`
      : 'No student profile available.'
  ].join(' ')

  return {
    units: courses.map((course) => ({ code: course.course_code, name: course.course_name })),
    contextSummary,
    uploadedContext: uploadSummaries.join(' | '),
    documents: docs.map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      courseCode: doc.course_code,
      documentType: doc.document_type,
      week: doc.week,
      lectureNumber: doc.lecture_number,
      tutorialNumber: doc.tutorial_number,
      assessmentNumber: doc.assessment_number,
      processingStatus: doc.processing_status,
      extractionStatus: doc.extracted_text_path ? 'text extracted' : 'uploaded',
      indexingStatus: doc.chunk_count ? 'indexed' : doc.extracted_text_path ? 'extracted' : 'processing',
      chunkCount: doc.chunk_count || 0,
      tutorReady: Boolean(doc.chunk_count),
      summary: doc.summary
    })),
    relevantChunks: chunks,
    masterySummary: masteryRows.length ? `Mastery data exists for ${masteryRows.length} topics. Weak topics tracked: ${weakTopics.length}.` : 'No mastery data available.',
    taskSummary: tasks.length ? `There are ${tasks.length} tasks active.` : 'There are no active tasks.',
    plannerSummary: sessions.length ? `There are ${sessions.length} study sessions.` : 'There are no study sessions.',
    settingsSummary: settings.name || settings.degree || settings.targetMarks ? 'Study preferences available.' : 'No saved study preferences.'
  }
}
