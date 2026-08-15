import crypto from 'crypto'
import path from 'path'
import { promises as fs } from 'fs'
import { getDb, nowIso } from './db'
import { loadCatalog, saveCatalog } from '@/lib/knowledge-base/catalog'

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

interface StoredSettings {
  theme: 'light' | 'dark' | 'system'
  name: string
  degree: string
  targetMarks: string
  feedbackStrictness: 'lenient' | 'normal' | 'strict'
  pomodoroLength: number
  studyTimes: string
}

export function ensureDefaultUser() {
  const db = getDb()
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get('default') as any
  if (row) return row

  const now = nowIso()
  db.prepare(`
    INSERT INTO users (id, name, university, timezone, semester, preferences, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('default', 'Student', 'Monash', 'Australia/Melbourne', 'Semester 2', json({}), now, now)

  return db.prepare('SELECT * FROM users WHERE id = ?').get('default') as any
}

export function createEvent(eventType: string, payload: Record<string, unknown>) {
  const db = getDb()
  db.prepare('INSERT INTO app_events (id, event_type, payload, created_at) VALUES (?, ?, ?, ?)')
    .run(id('evt'), eventType, json(payload), nowIso())
}

export function listCourses() {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM courses WHERE status IS NULL OR status != ? ORDER BY created_at DESC').all('archived') as any[]
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
} = {}) {
  await ensureCatalogSynced()
  const db = getDb()
  const clauses: string[] = []
  const params: any[] = []

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
    LIMIT 1
  `).get(documentId) as any

  return row ? deriveDocumentState(row) : null
}

export async function deleteDocument(documentId: string) {
  await ensureCatalogSynced()
  const db = getDb()
  const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId) as any
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
}) {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM courses WHERE course_code = ? ORDER BY updated_at DESC LIMIT 1').get(input.courseCode) as any
  const now = nowIso()

  if (existing) {
    db.prepare(`
      UPDATE courses
      SET course_name = COALESCE(?, course_name),
          university = COALESCE(?, university),
          semester = COALESCE(?, semester),
          year = COALESCE(?, year),
          source = COALESCE(?, source),
          updated_at = ?
      WHERE id = ?
    `).run(input.courseName || null, input.university || null, input.semester || null, input.year ?? null, input.source || null, now, existing.id)
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
    created_at: now,
    updated_at: now
  }

  db.prepare(`
    INSERT INTO courses (id, course_code, course_name, university, semester, year, status, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    created.id,
    input.courseCode,
    created.course_name,
    created.university,
    created.semester,
    created.year,
    created.status,
    created.source,
    created.created_at,
    created.updated_at
  )

  return db.prepare('SELECT * FROM courses WHERE id = ?').get(created.id) as any
}

export function createUploadBatch(input: {
  userId?: string
  courseId: string
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
    input.courseId,
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
  courseId: string
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
    input.courseId,
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

  if (existing) {
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

export function extractAssessmentsFromText(courseId: string, text: string, sourceDocumentId?: string) {
  const patterns = [
    { name: 'Assignment 1', regex: /assignment\s*1\D+(\d+(?:\.\d+)?)\s*%/i, type: 'assignment' },
    { name: 'Assignment 2', regex: /assignment\s*2\D+(\d+(?:\.\d+)?)\s*%/i, type: 'assignment' },
    { name: 'Assignment 3', regex: /assignment\s*3\D+(\d+(?:\.\d+)?)\s*%/i, type: 'assignment' },
    { name: 'Final Exam', regex: /(final\s*exam|exam)\D+(\d+(?:\.\d+)?)\s*%/i, type: 'exam' }
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern.regex)
    if (!match) continue
    const rawWeight = match[2] || match[1]
    const weight = Number(rawWeight)
    if (!Number.isFinite(weight)) continue
    upsertAssessment({
      courseId,
      name: pattern.name,
      type: pattern.type,
      weighting: weight,
      sourceDocumentId
    })
  }
}

export function getDashboard(userId = 'default') {
  ensureDefaultUser()
  const db = getDb()

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
    WHERE a.status != 'completed' AND (a.due_date IS NULL OR a.due_date <= ?)
    ORDER BY COALESCE(a.due_date, a.created_at) ASC
    LIMIT 12
  `).all(upcomingLimitDate) as any[]

  const activeCourses = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(1) FROM topics t WHERE t.course_id = c.id) AS topic_count,
      (SELECT AVG(t.mastery_score) FROM topics t WHERE t.course_id = c.id) AS avg_mastery
    FROM courses c
    WHERE c.status IS NULL OR c.status != 'archived'
    ORDER BY c.updated_at DESC
  `).all() as any[]

  const weakTopics = db.prepare(`
    SELECT t.*, c.course_code
    FROM topics t
    LEFT JOIN courses c ON c.id = t.course_id
    WHERE COALESCE(t.mastery_score, 0) < 0.45
    ORDER BY COALESCE(t.mastery_score, 0) ASC, t.updated_at DESC
    LIMIT 10
  `).all() as any[]

  const recentResources = db.prepare(`
    SELECT d.*, c.course_code
    FROM documents d
    LEFT JOIN courses c ON c.id = d.course_id
    ORDER BY d.created_at DESC
    LIMIT 10
  `).all() as any[]

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
    recentResources,
    studyStats
  }
}

export function getPlannerContext(userId = 'default') {
  ensureDefaultUser()
  const db = getDb()

  const courses = db.prepare('SELECT * FROM courses WHERE status IS NULL OR status != ? ORDER BY updated_at DESC').all('archived') as any[]
  const assessments = db.prepare('SELECT * FROM assessments ORDER BY COALESCE(due_date, created_at) ASC').all() as any[]
  const topics = db.prepare('SELECT * FROM topics ORDER BY updated_at DESC').all() as any[]
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
      id, user_id, course_id, topic_id, assessment_id, title, description, task_type,
      priority, planned_date, due_date, estimated_minutes, completed, generated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    taskId,
    input.userId || 'default',
    input.courseId || null,
    input.topicId || null,
    input.assessmentId || null,
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
  createEvent('TASK_COMPLETED', { taskId })
}

export function deletePlannerTask(taskId: string) {
  const db = getDb()
  db.prepare('DELETE FROM planner_tasks WHERE id = ?').run(taskId)
  createEvent('TASK_COMPLETED', { taskId, deleted: true })
}

export function archiveCourse(courseId: string) {
  const db = getDb()
  const now = nowIso()
  db.prepare('UPDATE courses SET status = ?, updated_at = ? WHERE id = ?').run('archived', now, courseId)
  createEvent('COURSE_UPDATED', { courseId, status: 'archived' })
}

export function getUserSettings(userId = 'default'): StoredSettings {
  ensureDefaultUser()
  const db = getDb()
  const row = db.prepare('SELECT preferences FROM users WHERE id = ?').get(userId) as { preferences?: string | null } | undefined
  const parsed = parseJson<Partial<StoredSettings>>(row?.preferences || null) || {}

  return {
    theme: parsed.theme || 'light',
    name: parsed.name || '',
    degree: parsed.degree || '',
    targetMarks: parsed.targetMarks || '',
    feedbackStrictness: parsed.feedbackStrictness || 'normal',
    pomodoroLength: parsed.pomodoroLength || 25,
    studyTimes: parsed.studyTimes || ''
  }
}

export function updateUserSettings(userId: string, updates: Partial<StoredSettings>) {
  ensureDefaultUser()
  const db = getDb()
  const current = getUserSettings(userId)
  const merged: StoredSettings = {
    ...current,
    ...updates
  }
  db.prepare('UPDATE users SET preferences = ?, updated_at = ? WHERE id = ?')
    .run(json(merged), nowIso(), userId)
  createEvent('STUDY_PLAN_UPDATED', { userId, settingsUpdated: true })
  return merged
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
