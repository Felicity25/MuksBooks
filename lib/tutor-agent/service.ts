import type { AiTutorRequestBody } from '@/lib/ai-helper'
import { searchKnowledgeBase } from '@/lib/knowledge-base/search'
import { appendLog } from '@/lib/logging'
import { getLessonContext, listDocuments } from '@/lib/app-state/service'
import { listCloudDocuments } from '@/lib/supabase/documents-service'
import type { TutorCitation } from '@/lib/tutor/types'

export interface TutorRetrievalContext {
  availableUnits: string[]
  selectedUnit: string | null
  curriculumResourceSummary: string
  relevantChunks: string[]
  uploadedContext: string
  unitContext: string
  citations: TutorCitation[]
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
  const selectedUnit = normalizedRequestedUnit && availableUnits.includes(normalizedRequestedUnit)
    ? normalizedRequestedUnit
    : lessonContext.units[0]?.code || availableUnits[0] || null

  // Pass userId so search prefers Supabase chunks
  const hits = await searchKnowledgeBase(request.message, selectedUnit || undefined, 8, userId)
  const relevantHits = hits.filter((hit) => hit.score >= 0.18)
  const topHits = (relevantHits.length ? relevantHits : hits.slice(0, 3)).slice(0, 5)
  const relevantChunks = topHits.map((hit) => `${hit.chunk.text.slice(0, 700)}\n[section:${hit.chunk.sectionTitle || 'general'}][score:${hit.score.toFixed(3)}]`)
  const hitCitations: TutorCitation[] = topHits.map((hit) => ({
    id: hit.chunk.chunkId,
    label: hit.chunk.sectionTitle || 'Knowledge chunk',
    unit: selectedUnit || null,
    section: hit.chunk.sectionTitle || null,
    score: Number(hit.score.toFixed(3))
  }))

  const scopedDocuments = selectedUnit
    ? allDocuments.filter((document) => document.course_code === selectedUnit)
    : allDocuments.slice(0, 8)

  const curriculumResourceSummary = scopedDocuments.length
    ? scopedDocuments
        .map((document) => `${document.filename} (${document.course_code || 'unclassified'}; ${document.document_type || 'resource'}; ${document.indexing_status || 'processing'})`)
        .join(' | ')
    : lessonContext.uploadedContext || 'No matching uploaded resource found.'

  const documentCitations: TutorCitation[] = scopedDocuments.slice(0, 6).map((document, index) => ({
    id: `doc-${index}-${document.filename}`,
    label: document.filename,
    unit: document.course_code || selectedUnit || null,
    section: document.document_type || null,
    score: null
  }))

  const unitContext = selectedUnit
    ? [
        `Selected unit: ${selectedUnit}.`,
        lessonContext.contextSummary,
        `Curriculum resources used: ${curriculumResourceSummary}`,
        scopedDocuments.length
          ? `Documents in scope: ${scopedDocuments.map((document) => `${document.filename} [${document.processing_status || 'uploaded'}]`).join(' | ')}`
          : 'No documents found in scope.'
      ].filter(Boolean).join(' ')
    : 'No active curriculum unit detected. Please upload course resources first.'

  await appendLog('retrievals', 'Tutor retrieval context created', {
    selectedUnit,
    availableUnits,
    resultCount: topHits.length,
    documentCount: scopedDocuments.length,
    source: userId ? 'cloud' : 'local'
  })

  return {
    availableUnits,
    selectedUnit,
    curriculumResourceSummary,
    relevantChunks,
    uploadedContext: lessonContext.uploadedContext || curriculumResourceSummary,
    unitContext,
    citations: [...documentCitations, ...hitCitations]
  }
}
