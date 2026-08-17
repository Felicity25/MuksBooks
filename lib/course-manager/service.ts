import { promises as fs } from 'fs'
import path from 'path'
import { appendLog } from '@/lib/logging'
import { embedText } from '@/lib/knowledge-base/embeddings'
import { extractKeywords, semanticChunk } from '@/lib/knowledge-base/chunking'
import { activateCurriculumVersion, ensureCourseFolders, hashBuffer, loadCatalog, makeChunkId, makeDocumentId, saveCatalog, KNOWLEDGE_ROOT } from '@/lib/knowledge-base/catalog'
import type { CatalogDocument, ChunkRecord, CourseMetadata } from '@/lib/knowledge-base/types'
import { addKnowledgeChunk, createOrUpdateDocument, extractAssessmentsFromText, extractWeeklyTopicsFromText, upsertCourse } from '@/lib/app-state/service'
import { publishEvent } from '@/lib/app-state/events'
import { extractTextFromUpload } from './extractors'

function normalizeCode(value?: string) {
  return value?.toUpperCase().replace(/\s+/g, '')
}

function detectCourseMetadata(fileName: string, text: string, mimeType: string): CourseMetadata {
  const source = `${fileName}\n${text}`
  const courseMatch = source.match(/\b[A-Z]{3,4}\d{4}\b/)
  const semesterMatch = source.match(/\b(semester\s*[12]|s[12]\s*20\d{2}|term\s*\d)\b/i)
  const lectureMatch = source.match(/\blecture\s*(\d+)\b/i)
  const tutorialMatch = source.match(/\btutorial\s*(\d+)\b/i)
  const assignmentMatch = source.match(/\bassignment\s*(\d+)\b/i)
  const weekMatch = source.match(/\bweek\s*(\d+)\b/i)
  const uniMatch = source.match(/\b(monash|melbourne|unsw|sydney|uq|anu)\b/i)

  const lowerName = fileName.toLowerCase()
  const documentType = lowerName.includes('tutorial')
    ? 'Tutorial'
    : lowerName.includes('assignment')
      ? 'Assignment'
      : lowerName.includes('exam')
        ? 'Past Exam'
        : lowerName.includes('slide')
          ? 'Lecture slides'
          : mimeType.includes('pdf')
            ? 'PDF Note'
            : 'General Resource'

  return {
    courseCode: normalizeCode(courseMatch?.[0]) || 'UNCLASSIFIED',
    semester: semesterMatch?.[0],
    lectureNumber: lectureMatch?.[1] ? Number(lectureMatch[1]) : undefined,
    tutorialNumber: tutorialMatch?.[1] ? Number(tutorialMatch[1]) : undefined,
    assignmentNumber: assignmentMatch?.[1] ? Number(assignmentMatch[1]) : undefined,
    weekNumber: weekMatch?.[1] ? Number(weekMatch[1]) : undefined,
    university: uniMatch?.[0],
    documentType
  }
}

async function writeJson(filePath: string, data: unknown) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

async function saveEmbedding(relativePath: string, embedding: number[]) {
  const fullPath = path.join(KNOWLEDGE_ROOT, relativePath)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await writeJson(fullPath, embedding)
}

export interface UploadPayload {
  userId?: string
  fileName: string
  mimeType: string
  content: Buffer
  textContent?: string
  forceNewCurriculum?: boolean
  batchId?: string
  batchFileId?: string
  originalFilename?: string
  relativePath?: string
  sizeBytes?: number
  metadata?: Partial<CourseMetadata>
  classification?: {
    resourceType?: string
    topic?: string
    week?: number
    semester?: string
    academicYear?: number
  }
}

export interface UploadChunkResult {
  id: string
  chunkIndex: number
  text: string
  section?: string
  embedding: number[]
  keywords: string[]
}

export async function ingestUpload(payload: UploadPayload) {
  await appendLog('uploads', '[UPLOAD] request received', {
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes ?? payload.content.length,
    batchId: payload.batchId || null,
    batchFileId: payload.batchFileId || null
  })

  const catalog = await loadCatalog()
  const fileHash = hashBuffer(payload.content)
  const existing = catalog.documents.find((doc) => doc.fileHash === fileHash && doc.status === 'active')

  if (existing) {
    const existingMetadata = existing.metadata || { courseCode: 'UNCLASSIFIED' }
    const existingCourse = upsertCourse({
      courseCode: normalizeCode(existingMetadata.courseCode) || 'UNCLASSIFIED',
      courseName: existingMetadata.courseName,
      university: existingMetadata.university,
      semester: existingMetadata.semester,
      source: 'catalog_duplicate_recovery',
      userId: payload.userId || 'default'
    })

    createOrUpdateDocument({
      id: existing.documentId,
      courseId: existingCourse.id,
      batchId: payload.batchId,
      batchFileId: payload.batchFileId,
      filename: existing.fileName,
      originalFilename: payload.originalFilename || existing.fileName,
      originalPath: existing.originalPath,
      relativePath: payload.relativePath,
      mimeType: payload.mimeType || existing.mimeType,
      sizeBytes: payload.sizeBytes ?? payload.content.length,
      documentType: existingMetadata.documentType,
      resourceType: payload.classification?.resourceType || existingMetadata.documentType,
      topic: payload.classification?.topic,
      academicYear: payload.classification?.academicYear,
      week: payload.classification?.week ?? existingMetadata.weekNumber,
      lectureNumber: existingMetadata.lectureNumber,
      tutorialNumber: existingMetadata.tutorialNumber,
      assessmentNumber: existingMetadata.assignmentNumber,
      uploadDate: existing.uploadedAt,
      contentHash: existing.fileHash,
      version: existing.version,
      processingStatus: 'tutor_ready',
      extractedTextPath: existing.extractedTextPath,
      metadata: existingMetadata
    })

    await appendLog('uploads', 'Duplicate upload detected; reusing existing document', {
      documentId: existing.documentId,
      fileName: payload.fileName
    })
    return { documentId: existing.documentId, duplicated: true, fileHash, version: existing.version }
  }

  const detected = detectCourseMetadata(payload.fileName, payload.fileName, payload.mimeType)
  const metadata: CourseMetadata = {
    ...detected,
    ...payload.metadata,
    courseCode: normalizeCode(payload.metadata?.courseCode || detected.courseCode) || 'UNCLASSIFIED'
  }

  const appCourse = upsertCourse({
    courseCode: metadata.courseCode,
    courseName: payload.metadata?.courseName,
    university: metadata.university,
    semester: metadata.semester,
    source: 'document_analysis',
    userId: payload.userId || 'default'
  })

  const newCurriculumVersion = `v_${Date.now()}`
  if (payload.forceNewCurriculum) {
    catalog.documents.forEach((doc) => { doc.status = 'archived' })
    catalog.chunks = []
    await activateCurriculumVersion(newCurriculumVersion)
  }

  const version =
    Math.max(
      0,
      ...catalog.documents
        .filter((doc) => doc.metadata.courseCode === metadata.courseCode)
        .map((doc) => doc.version)
    ) + 1

  const courseRoot = await ensureCourseFolders(metadata.courseCode, metadata.semester || 'Unknown-Semester')
  const documentId = makeDocumentId()
  const baseName = `${documentId}_v${version}`
  const uploadedAt = new Date().toISOString()

  const originalPath = path.join(courseRoot, 'Original Files', `${baseName}_${payload.fileName}`)
  const extractedPath = path.join(courseRoot, 'Extracted Text', `${baseName}.txt`)
  const metadataPath = path.join(courseRoot, 'Metadata', `${baseName}.json`)

  await fs.writeFile(originalPath, payload.content)
  await appendLog('uploads', '[UPLOAD] file persisted', {
    documentId,
    originalPath,
    courseCode: metadata.courseCode
  })

  createOrUpdateDocument({
    id: documentId,
    courseId: appCourse.id,
    batchId: payload.batchId,
    batchFileId: payload.batchFileId,
    filename: payload.fileName,
    originalFilename: payload.originalFilename || payload.fileName,
    originalPath,
    relativePath: payload.relativePath,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes ?? payload.content.length,
    documentType: metadata.documentType,
    resourceType: payload.classification?.resourceType || metadata.documentType,
    topic: payload.classification?.topic,
    academicYear: payload.classification?.academicYear,
    week: payload.classification?.week ?? metadata.weekNumber,
    lectureNumber: metadata.lectureNumber,
    tutorialNumber: metadata.tutorialNumber,
    assessmentNumber: metadata.assignmentNumber,
    uploadDate: uploadedAt,
    contentHash: fileHash,
    version,
    processingStatus: 'uploaded',
    metadata
  })

  try {
    await appendLog('uploads', '[UPLOAD] extraction started', { documentId, fileName: payload.fileName })
    const extractedText = payload.textContent || await extractTextFromUpload({
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      content: payload.content
    })

    const enrichedMetadata: CourseMetadata = {
      ...detectCourseMetadata(payload.fileName, extractedText, payload.mimeType),
      ...payload.metadata,
      courseCode: normalizeCode(payload.metadata?.courseCode || metadata.courseCode) || 'UNCLASSIFIED'
    }

    await fs.writeFile(extractedPath, extractedText, 'utf8')
    createOrUpdateDocument({
      id: documentId,
      courseId: appCourse.id,
      batchId: payload.batchId,
      batchFileId: payload.batchFileId,
      filename: payload.fileName,
      originalFilename: payload.originalFilename || payload.fileName,
      originalPath,
      relativePath: payload.relativePath,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes ?? payload.content.length,
      documentType: enrichedMetadata.documentType,
      resourceType: payload.classification?.resourceType || enrichedMetadata.documentType,
      topic: payload.classification?.topic,
      academicYear: payload.classification?.academicYear,
      week: payload.classification?.week ?? enrichedMetadata.weekNumber,
      lectureNumber: enrichedMetadata.lectureNumber,
      tutorialNumber: enrichedMetadata.tutorialNumber,
      assessmentNumber: enrichedMetadata.assignmentNumber,
      uploadDate: uploadedAt,
      contentHash: fileHash,
      version,
      processingStatus: 'processing',
      extractedTextPath: extractedPath,
      summary: extractedText.slice(0, 600),
      metadata: enrichedMetadata
    })

    const blocks = semanticChunk(extractedText)
    const chunkIds: string[] = []
    const chunkResults: UploadChunkResult[] = []

    await appendLog('uploads', '[UPLOAD] indexing started', {
      documentId,
      chunksPlanned: blocks.length
    })

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const chunkId = makeChunkId()
      const relEmbeddingPath = path.join('embeddings', `${chunkId}.json`)
      const embedding = await embedText(block.text)
      await saveEmbedding(relEmbeddingPath, embedding)
      const keywords = extractKeywords(block.text)

      const chunk: ChunkRecord = {
        chunkId,
        documentId,
        version,
        chunkIndex: i,
        sectionTitle: block.title,
        text: block.text,
        keywords,
        relationships: [],
        embeddingPath: relEmbeddingPath,
        sourcePriority: 1
      }

      chunkIds.push(chunkId)
      catalog.chunks.push(chunk)
      chunkResults.push({ id: chunkId, chunkIndex: i, text: block.text, section: block.title, embedding, keywords })

      const chunkPath = path.join(courseRoot, 'Chunks', `${chunkId}.txt`)
      await fs.writeFile(chunkPath, block.text, 'utf8')
    }

    const document: CatalogDocument = {
      documentId,
      version,
      fileHash,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      uploadedAt,
      originalPath,
      extractedTextPath: extractedPath,
      metadataPath,
      chunkIds,
      metadata: enrichedMetadata,
      status: 'active'
    }

    catalog.documents.push(document)
    if (payload.forceNewCurriculum) {
      catalog.activeCurriculumVersion = newCurriculumVersion
    }

    await writeJson(metadataPath, document)
    await saveCatalog(catalog)

    chunkIds.forEach((chunkId, index) => {
      const block = blocks[index]
      addKnowledgeChunk({
        id: chunkId,
        documentId,
        courseId: appCourse.id,
        chunkIndex: index,
        text: block.text,
        section: block.title,
        topic: enrichedMetadata.courseCode,
        metadata: { keywords: extractKeywords(block.text) }
      })
    })

    extractWeeklyTopicsFromText(appCourse.id, extractedText, documentId)
    extractAssessmentsFromText(appCourse.id, extractedText, documentId)

    createOrUpdateDocument({
      id: documentId,
      courseId: appCourse.id,
      batchId: payload.batchId,
      batchFileId: payload.batchFileId,
      filename: payload.fileName,
      originalFilename: payload.originalFilename || payload.fileName,
      originalPath,
      relativePath: payload.relativePath,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes ?? payload.content.length,
      documentType: enrichedMetadata.documentType,
      resourceType: payload.classification?.resourceType || enrichedMetadata.documentType,
      topic: payload.classification?.topic,
      academicYear: payload.classification?.academicYear,
      week: payload.classification?.week ?? enrichedMetadata.weekNumber,
      lectureNumber: enrichedMetadata.lectureNumber,
      tutorialNumber: enrichedMetadata.tutorialNumber,
      assessmentNumber: enrichedMetadata.assignmentNumber,
      uploadDate: uploadedAt,
      contentHash: fileHash,
      version,
      processingStatus: 'tutor_ready',
      extractedTextPath: extractedPath,
      summary: extractedText.slice(0, 600),
      metadata: enrichedMetadata
    })

    publishEvent('DOCUMENT_UPLOADED', {
      courseId: appCourse.id,
      courseCode: enrichedMetadata.courseCode,
      documentId,
      chunks: chunkIds.length
    })

    await appendLog('uploads', '[UPLOAD] response returned', {
      documentId,
      courseCode: enrichedMetadata.courseCode,
      chunks: chunkIds.length,
      curriculumVersion: catalog.activeCurriculumVersion
    })

    return { documentId, duplicated: false, chunks: chunkIds.length, courseCode: enrichedMetadata.courseCode, fileHash, version, chunkData: chunkResults, documentType: enrichedMetadata.documentType }
  } catch (error: any) {
    createOrUpdateDocument({
      id: documentId,
      courseId: appCourse.id,
      batchId: payload.batchId,
      batchFileId: payload.batchFileId,
      filename: payload.fileName,
      originalFilename: payload.originalFilename || payload.fileName,
      originalPath,
      relativePath: payload.relativePath,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes ?? payload.content.length,
      documentType: metadata.documentType,
      resourceType: payload.classification?.resourceType || metadata.documentType,
      topic: payload.classification?.topic,
      academicYear: payload.classification?.academicYear,
      week: payload.classification?.week ?? metadata.weekNumber,
      lectureNumber: metadata.lectureNumber,
      tutorialNumber: metadata.tutorialNumber,
      assessmentNumber: metadata.assignmentNumber,
      uploadDate: uploadedAt,
      contentHash: fileHash,
      version,
      processingStatus: 'failed',
      metadata: {
        ...metadata,
        lastError: error?.message || 'Processing failed'
      }
    })

    await appendLog('uploads', '[UPLOAD ERROR]', {
      documentId,
      stage: 'processing',
      error: error?.message || String(error)
    })

    throw error
  }
}
