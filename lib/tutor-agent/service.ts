import type { AiTutorRequestBody } from '@/lib/ai-helper'
import { searchKnowledgeBase } from '@/lib/knowledge-base/search'
import { appendLog } from '@/lib/logging'
import { getLessonContext, listDocuments } from '@/lib/app-state/service'
import { listCloudDocuments, listCloudUnits, listScheduleEntries } from '@/lib/supabase/documents-service'
import type { TutorCitation } from '@/lib/tutor/types'

export interface TutorRetrievalContext {
  availableUnits: string[]
  selectedUnitCode: string | null
  detectedUnitCode: string | null
  effectiveUnitCode: string | null
  unitSelectionMode: 'general' | 'auto' | 'manual'
  detectionConfidence: number
  retrievalQuery: string
  scheduleContext: string | null
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

function requestedWeekNumber(message: string) {
  const match = message.match(/\b(?:teaching\s+)?week\s*0?(\d{1,2})\b/i)
  return match?.[1] ? Number(match[1]) : null
}

async function resolveScheduleContext(input: {
  userId?: string
  unitCode: string | null
  message: string
  cloudUnits: Array<{ id: string; code: string }>
}) {
  const weekNumber = requestedWeekNumber(input.message)
  if (!input.userId || !input.unitCode || weekNumber === null) return null

  const unit = input.cloudUnits.find((candidate) => normalizeUnitCode(candidate.code) === input.unitCode)
  if (!unit) return null

  const entries = await listScheduleEntries(input.userId, unit.id)
  const entry = entries?.find((candidate: any) => Number(candidate.week_number) === weekNumber)
  if (!entry) return null

  const topics = [entry.topic, ...(Array.isArray(entry.additional_topics) ? entry.additional_topics : [])]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  const activities = Array.isArray(entry.activities)
    ? entry.activities.map((value: unknown) => String(value || '').trim()).filter(Boolean)
    : []

  return {
    weekNumber,
    topics,
    activities,
    text: [
      `${input.unitCode} Week ${weekNumber}`,
      topics.length ? `Topics: ${topics.join('; ')}` : '',
      activities.length ? `Activities: ${activities.join('; ')}` : ''
    ].filter(Boolean).join('. ')
  }
}

export async function buildTutorRetrievalContext(request: AiTutorRequestBody, userId?: string): Promise<TutorRetrievalContext> {
  const lessonContext = await getLessonContext({ unit: request.unit, topic: request.topic })

  const cloudUnits = userId
    ? ((await listCloudUnits(userId)) || []).map((unit: any) => ({ id: String(unit.id), code: normalizeUnitCode(unit.code) }))
    : []

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
      [...cloudUnits.map((unit) => unit.code), ...allDocuments.map((document) => normalizeUnitCode(document.course_code))]
        .filter((code): code is string => Boolean(code))
    )
  )

  const unitSelectionMode = resolveSelectionMode(request)
  const normalizedSelectedUnit = normalizeUnitCode(request.selectedUnitCode || request.unit)
  // Manual selection must remain sticky even when indexed uploads for that unit are missing.
  const selectedUnitCode = normalizedSelectedUnit || null

  const mentionedUnitCode = detectMentionedUnit(request.message, availableUnits)

  // Only Auto/General need an unscoped pass for explicit or evidence-based unit detection.
  const unscopedHits = unitSelectionMode === 'manual'
    ? []
    : await searchKnowledgeBase(request.message, undefined, 24, userId)
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

  const schedule = await resolveScheduleContext({
    userId,
    unitCode: effectiveUnitCode,
    message: request.message,
    cloudUnits
  })
  const retrievalQuery = [
    request.message,
    schedule?.text,
    request.topic ? `Topic: ${request.topic}` : ''
  ].filter(Boolean).join('\n')

  const scopedHits = effectiveUnitCode
    ? await searchKnowledgeBase(retrievalQuery, effectiveUnitCode, 16, userId)
    : unscopedHits

  const relevantHits = scopedHits.filter((hit) => hit.score >= 0.2)
  const topHits = relevantHits.slice(0, 6)
  const relevantChunks = topHits.map((hit, index) => {
    const sourceName = hit.chunk.sourceFileName || 'Uploaded material'
    const section = hit.chunk.sectionTitle || `Chunk ${hit.chunk.chunkIndex + 1}`
    return `[SOURCE ${index + 1}: ${sourceName} | ${section} | ${getHitUnitCode(hit) || effectiveUnitCode || 'General'}]\n${hit.chunk.text.slice(0, 1200)}`
  })

  const citationByDocument = new Map<string, TutorCitation>()
  for (const hit of topHits) {
    if (citationByDocument.has(hit.chunk.documentId)) continue
    citationByDocument.set(hit.chunk.documentId, {
      id: hit.chunk.documentId,
      label: hit.chunk.sourceFileName || hit.chunk.sectionTitle || 'Uploaded material',
      unit: getHitUnitCode(hit) || effectiveUnitCode || null,
      section: hit.chunk.sectionTitle || null,
      score: Number(hit.score.toFixed(3))
    })
  }
  const hitCitations = Array.from(citationByDocument.values())

  const topHitDocumentIds = new Set(topHits.map((hit) => String(hit.chunk.documentId || '')))
  const scopedDocuments = allDocuments
    .filter((document) => document.document_id && topHitDocumentIds.has(String(document.document_id)))
    .slice(0, 6)

  const curriculumResourceSummary = scopedDocuments.length
    ? scopedDocuments
        .map((document) => `${document.filename} (${document.course_code || 'unclassified'}; ${document.document_type || 'resource'}; ${document.indexing_status || 'processing'})`)
        .join(' | ')
    : 'No strongly relevant indexed upload chunks were found for this question.'

  const unitContext = effectiveUnitCode
    ? [
        `Effective unit: ${effectiveUnitCode}.`,
        schedule ? `Schedule mapping: ${schedule.text}.` : '',
        topHits.length
          ? `Retrieved ${topHits.length} substantive chunks from ${hitCitations.length} source document(s).`
          : 'No substantive uploaded chunks passed the relevance threshold.',
        scopedDocuments.length
          ? `Sources actually used: ${scopedDocuments.map((document) => document.filename).join(' | ')}`
          : 'Uploaded sources were insufficient; answer from general knowledge and state that limitation.'
      ].filter(Boolean).join(' ')
    : 'Effective unit: General. No strong unit evidence was applied.'

  await appendLog('retrievals', 'Tutor retrieval context created', {
    selectedUnitCode,
    detectedUnitCode,
    effectiveUnitCode,
    unitSelectionMode,
    detectionConfidence: strongDetection.confidence,
    retrievalQuery,
    scheduleContext: schedule?.text || null,
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
    retrievalQuery,
    scheduleContext: schedule?.text || null,
    curriculumResourceSummary,
    relevantChunks,
    uploadedContext: relevantChunks.length
      ? `Substantive excerpts from ${hitCitations.length} retrieved source document(s) are included below.`
      : 'No substantive uploaded excerpts were retrieved.',
    unitContext,
    citations: hitCitations
  }
}
