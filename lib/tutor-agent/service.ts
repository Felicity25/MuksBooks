import type { AiTutorRequestBody } from '@/lib/ai-helper'
import { searchKnowledgeBase } from '@/lib/knowledge-base/search'
import { appendLog } from '@/lib/logging'
import { getLessonContext, listDocuments } from '@/lib/app-state/service'
import { listCloudDocuments } from '@/lib/supabase/documents-service'

export interface TutorRetrievalContext {
  availableUnits: string[]
  curriculumResourceSummary: string
  relevantChunks: string[]
  uploadedContext: string
  unitContext: string
}

export async function buildTutorRetrievalContext(request: AiTutorRequestBody, userId?: string): Promise<TutorRetrievalContext> {
  const lessonContext = await getLessonContext({ unit: request.unit, topic: request.topic })

  // Prefer Supabase document list (persistent) when authenticated
  let allDocuments: Array<{ course_code: string | null; filename: string; document_type?: string | null; processing_status?: string | null; indexing_status?: string | null }> = []
  if (userId) {
    const cloudDocs = await listCloudDocuments(userId)
    if (cloudDocs !== null && cloudDocs.length > 0) {
      allDocuments = cloudDocs.map((d) => ({
        course_code: d.course_code ?? null,
        filename: d.original_filename,
        document_type: d.document_type ?? null,
        processing_status: d.processing_status ?? null,
        indexing_status: d.processing_status === 'tutor_ready' ? 'indexed' : null
      }))
    }
  }
  if (allDocuments.length === 0) {
    allDocuments = await listDocuments({ limit: 1000 })
  }

  const availableUnits = Array.from(
    new Set(
      allDocuments
        .map((document) => document.course_code)
        .filter((code): code is string => Boolean(code))
    )
  )

  const normalizedRequestedUnit = request.unit?.trim().toUpperCase()
  const chosenUnit = normalizedRequestedUnit && availableUnits.includes(normalizedRequestedUnit)
    ? normalizedRequestedUnit
    : lessonContext.units[0]?.code || availableUnits[0]

  // Pass userId so search prefers Supabase chunks
  const hits = await searchKnowledgeBase(request.message, chosenUnit, 10, userId)
  const relevantChunks = hits.map((hit) => `${hit.chunk.text.slice(0, 800)}\n[section:${hit.chunk.sectionTitle || 'general'}][score:${hit.score.toFixed(3)}]`)

  const scopedDocuments = chosenUnit
    ? allDocuments.filter((document) => document.course_code === chosenUnit)
    : allDocuments.slice(0, 12)

  const curriculumResourceSummary = scopedDocuments.length
    ? scopedDocuments
        .map((document) => `${document.filename} (${document.course_code || 'unclassified'}; ${document.document_type || 'resource'}; ${document.indexing_status || 'processing'})`)
        .join(' | ')
    : lessonContext.uploadedContext || 'No matching uploaded resource found.'

  const unitContext = chosenUnit
    ? [
        `Selected unit: ${chosenUnit}.`,
        lessonContext.contextSummary,
        `Curriculum resources used: ${curriculumResourceSummary}`,
        scopedDocuments.length
          ? `Documents in scope: ${scopedDocuments.map((document) => `${document.filename} [${document.processing_status || 'uploaded'}]`).join(' | ')}`
          : 'No documents found in scope.'
      ].filter(Boolean).join(' ')
    : 'No active curriculum unit detected. Please upload course resources first.'

  await appendLog('retrievals', 'Tutor retrieval context created', {
    selectedUnit: chosenUnit || null,
    availableUnits,
    resultCount: hits.length,
    documentCount: scopedDocuments.length,
    source: userId ? 'cloud' : 'local'
  })

  return {
    availableUnits,
    curriculumResourceSummary,
    relevantChunks,
    uploadedContext: lessonContext.uploadedContext || curriculumResourceSummary,
    unitContext
  }
}
