import type { AiTutorRequestBody } from '@/lib/ai-helper'
import { searchKnowledgeBase } from '@/lib/knowledge-base/search'
import { appendLog } from '@/lib/logging'
import { getLessonContext, listDocuments } from '@/lib/app-state/service'
import { listCloudDocuments } from '@/lib/supabase/documents-service'
import type { TutorCitation } from '@/lib/tutor/types'

export interface TutorRetrievalContext {
  availableUnits: string[]
  selectedUnitCode: string | null
  detectedUnitCode: string | null
  effectiveUnitCode: string | null
  unitSelectionMode: 'general' | 'auto' | 'manual'
  detectionConfidence: number
  curriculumResourceSummary: string
  relevantChunks: string[]
  uploadedContext: string
  unitContext: string
  citations: TutorCitation[]
}

function normalizeUnitCode(value?: string | null) {
  return value?.toUpperCase().replace(/\s+/g, '') || ''
}

function detectMentionedUnit(message: string, availableUnits: string[]) {
  const normalizedMessage = message.toUpperCase()
  for (const unit of availableUnits) {
    const escaped = unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'i')
    if (regex.test(normalizedMessage)) return unit
  }
  return null
}

function getHitUnitCode(hit: any) {
  return normalizeUnitCode((hit?.chunk as any)?.courseCode)
}

function detectStrongUnitFromHits(hits: any[], availableUnits: string[]) {
  const scoreByUnit = new Map<string, { total: number; max: number; count: number }>()

  for (const hit of hits.slice(0, 12)) {
    const unitCode = getHitUnitCode(hit)
    if (!unitCode || !availableUnits.includes(unitCode)) continue
    const current = scoreByUnit.get(unitCode) || { total: 0, max: 0, count: 0 }
    const score = Number(hit?.score || 0)
    current.total += score
    current.max = Math.max(current.max, score)
    current.count += 1
    scoreByUnit.set(unitCode, current)
  }

  const ranked = Array.from(scoreByUnit.entries())
    .map(([unitCode, stats]) => ({ unitCode, stats }))
    .sort((a, b) => b.stats.total - a.stats.total)

  if (!ranked.length) return { detectedUnitCode: null as string | null, confidence: 0 }

  const best = ranked[0]
  const second = ranked[1]
  const margin = best.stats.total - (second?.stats.total || 0)
  const confidence = best.stats.total
  const strong = (
    best.stats.max >= 0.24
    && best.stats.total >= 0.52
    && (margin >= 0.12 || best.stats.count >= 2)
  )

  return {
    detectedUnitCode: strong ? best.unitCode : null,
    confidence
  }
}

function resolveSelectionMode(request: AiTutorRequestBody): 'general' | 'auto' | 'manual' {
  if (request.unitSelectionMode === 'general' || request.unitSelectionMode === 'auto' || request.unitSelectionMode === 'manual') {
    return request.unitSelectionMode
  }

  const normalizedUnit = normalizeUnitCode(request.selectedUnitCode || request.unit)
  if (normalizedUnit) return 'manual'
  return 'auto'
}

export async function buildTutorRetrievalContext(request: AiTutorRequestBody, userId?: string): Promise<TutorRetrievalContext> {
  const lessonContext = await getLessonContext({ unit: request.unit, topic: request.topic })

  // Prefer Supabase document list (persistent) when authenticated
  let allDocuments: Array<{ document_id?: string | null; course_code: string | null; filename: string; document_type?: string | null; processing_status?: string | null; indexing_status?: string | null }> = []
  if (userId) {
    const cloudDocs = await listCloudDocuments(userId)
    if (cloudDocs !== null && cloudDocs.length > 0) {
      allDocuments = cloudDocs.map((d) => ({
        document_id: d.document_id ?? null,
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

  const unitSelectionMode = resolveSelectionMode(request)
  const normalizedSelectedUnit = normalizeUnitCode(request.selectedUnitCode || request.unit)
  const selectedUnitCode = normalizedSelectedUnit && availableUnits.includes(normalizedSelectedUnit)
    ? normalizedSelectedUnit
    : null

  const mentionedUnitCode = detectMentionedUnit(request.message, availableUnits)

  // Pass userId so search prefers Supabase chunks
  const unscopedHits = await searchKnowledgeBase(request.message, undefined, 24, userId)
  const strongDetection = detectStrongUnitFromHits(unscopedHits, availableUnits)

  const detectedUnitCode = mentionedUnitCode || strongDetection.detectedUnitCode

  let effectiveUnitCode: string | null = null
  if (unitSelectionMode === 'manual') {
    effectiveUnitCode = selectedUnitCode
  } else if (unitSelectionMode === 'general') {
    effectiveUnitCode = mentionedUnitCode
  } else {
    effectiveUnitCode = mentionedUnitCode || strongDetection.detectedUnitCode
  }

  const scopedHits = effectiveUnitCode
    ? await searchKnowledgeBase(request.message, effectiveUnitCode, 12, userId)
    : unscopedHits

  const relevantHits = scopedHits.filter((hit) => hit.score >= 0.2)
  const topHits = (relevantHits.length ? relevantHits : scopedHits.slice(0, 3)).slice(0, 5)
  const relevantChunks = topHits.map((hit) => `${hit.chunk.text.slice(0, 700)}\n[section:${hit.chunk.sectionTitle || 'general'}][score:${hit.score.toFixed(3)}]`)
  const hitCitations: TutorCitation[] = topHits.map((hit) => ({
    id: hit.chunk.chunkId,
    label: hit.chunk.sectionTitle || 'Knowledge chunk',
    unit: getHitUnitCode(hit) || effectiveUnitCode || null,
    section: hit.chunk.sectionTitle || null,
    score: Number(hit.score.toFixed(3))
  }))

  const topHitDocumentIds = new Set(topHits.map((hit) => String(hit.chunk.documentId || '')))
  const scopedDocuments = effectiveUnitCode
    ? allDocuments.filter((document) => normalizeUnitCode(document.course_code) === effectiveUnitCode)
    : allDocuments.filter((document) => document.document_id && topHitDocumentIds.has(String(document.document_id))).slice(0, 8)

  const curriculumResourceSummary = scopedDocuments.length
    ? scopedDocuments
        .map((document) => `${document.filename} (${document.course_code || 'unclassified'}; ${document.document_type || 'resource'}; ${document.indexing_status || 'processing'})`)
        .join(' | ')
    : lessonContext.uploadedContext || 'No strongly relevant uploaded resource found for this question.'

  const documentCitations: TutorCitation[] = scopedDocuments.slice(0, 6).map((document, index) => ({
    id: `doc-${index}-${document.filename}`,
    label: document.filename,
    unit: document.course_code || effectiveUnitCode || null,
    section: document.document_type || null,
    score: null
  }))

  const unitContext = effectiveUnitCode
    ? [
        `Effective unit: ${effectiveUnitCode}.`,
        lessonContext.contextSummary,
        `Curriculum resources used: ${curriculumResourceSummary}`,
        scopedDocuments.length
          ? `Documents in scope: ${scopedDocuments.map((document) => `${document.filename} [${document.processing_status || 'uploaded'}]`).join(' | ')}`
          : 'No documents found in scope.'
      ].filter(Boolean).join(' ')
    : 'Effective unit: General. No strong unit evidence was applied.'

  await appendLog('retrievals', 'Tutor retrieval context created', {
    selectedUnitCode,
    detectedUnitCode,
    effectiveUnitCode,
    unitSelectionMode,
    detectionConfidence: strongDetection.confidence,
    availableUnits,
    resultCount: topHits.length,
    documentCount: scopedDocuments.length,
    source: userId ? 'cloud' : 'local'
  })

  return {
    availableUnits,
    selectedUnitCode,
    detectedUnitCode,
    effectiveUnitCode,
    unitSelectionMode,
    detectionConfidence: strongDetection.confidence,
    curriculumResourceSummary,
    relevantChunks,
    uploadedContext: lessonContext.uploadedContext || curriculumResourceSummary,
    unitContext,
    citations: [...documentCitations, ...hitCitations]
  }
}
