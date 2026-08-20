import type { AiTutorRequestBody } from '@/lib/ai-helper'
import { cosineSimilarity, embedText } from '@/lib/knowledge-base/embeddings'
import { searchKnowledgeBase } from '@/lib/knowledge-base/search'
import { appendLog } from '@/lib/logging'
import { listDocuments } from '@/lib/app-state/service'
import { listCloudDocuments, listCloudUnits, listScheduleEntries, searchCloudChunks } from '@/lib/supabase/documents-service'
import type { TutorCitation, TutorMessage } from '@/lib/tutor/types'

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

function getHitPageRange(hit: any) {
  const page = Number((hit?.chunk as any)?.pageNumber)
  if (!Number.isFinite(page)) return null
  return { pageStart: page, pageEnd: page }
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

function parsePageNumbers(message: string) {
  const pageSet = new Set<number>()

  const addPage = (value: number) => {
    if (!Number.isFinite(value) || value <= 0 || value > 3000) return
    pageSet.add(Math.trunc(value))
  }

  const rangePattern = /pages?\s*(\d{1,4})\s*(?:-|–|to)\s*(\d{1,4})/gi
  for (const match of message.matchAll(rangePattern)) {
    const start = Number(match[1])
    const end = Number(match[2])
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    const lo = Math.min(start, end)
    const hi = Math.max(start, end)
    if (hi - lo > 40) continue
    for (let page = lo; page <= hi; page += 1) addPage(page)
  }

  const listPattern = /pages?\s*([\d\s,and–-]{1,120})/gi
  for (const match of message.matchAll(listPattern)) {
    const text = String(match[1] || '')
    const nums = text.match(/\d{1,4}/g) || []
    for (const n of nums) addPage(Number(n))
  }

  return Array.from(pageSet).sort((a, b) => a - b)
}

function hasPageFollowUpReference(message: string) {
  return /\b(those|these|that|this)\s+pages?\b/i.test(message)
}

function hasDocumentPronounReference(message: string) {
  return /\b(this\s+file|that\s+pdf|the\s+pdf|lecturer\s+set|lecture\s+set|the\s+notes|the\s+upload)\b/i.test(message)
}

function collectRecentPages(recentMessages: Array<Pick<TutorMessage, 'role' | 'content'>>) {
  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    const msg = recentMessages[index]
    if (msg.role !== 'user') continue
    const pages = parsePageNumbers(msg.content || '')
    if (pages.length) return pages
  }
  return [] as number[]
}

function tokenizeForFilenameMatch(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4)
}

function selectDocumentCandidates(input: {
  message: string
  recentMessages: TutorMessage[]
  documents: Array<{ document_id?: string | null; filename: string; course_code: string | null }>
  effectiveUnitCode: string | null
}) {
  const scoped = input.documents.filter((doc) => {
    if (!input.effectiveUnitCode) return true
    return normalizeUnitCode(doc.course_code) === input.effectiveUnitCode
  })

  if (!scoped.length) return [] as Array<{ document_id: string; filename: string; score: number }>

  const recentCitationIds = new Set(
    input.recentMessages
      .slice(-8)
      .flatMap((msg) => msg.citations || [])
      .map((citation) => String(citation.id || ''))
      .filter(Boolean)
  )

  const combinedHint = `${input.message}\n${input.recentMessages.slice(-4).map((msg) => msg.content).join('\n')}`
  const hintTokens = tokenizeForFilenameMatch(combinedHint)
  const lecturerHint = /\blecturer\s+set|lecture\s+set|lecture\s+slides|notes\b/i.test(combinedHint)

  const scored = scoped
    .filter((doc) => Boolean(doc.document_id))
    .map((doc) => {
      const filename = String(doc.filename || '')
      const lower = filename.toLowerCase()
      let score = 0

      if (recentCitationIds.has(String(doc.document_id))) score += 3
      if (lecturerHint && /(lecture|lecturer|slide|notes?)/i.test(lower)) score += 2

      for (const token of hintTokens) {
        if (lower.includes(token)) score += 1
      }

      return {
        document_id: String(doc.document_id),
        filename,
        score
      }
    })
    .sort((a, b) => b.score - a.score)

  return scored
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

export async function buildTutorRetrievalContext(
  request: AiTutorRequestBody,
  userId?: string,
  recentMessages: TutorMessage[] = []
): Promise<TutorRetrievalContext> {
  const cloudUnits = userId
    ? ((await listCloudUnits(userId)) || []).map((unit: any) => ({ id: String(unit.id), code: normalizeUnitCode(unit.code) }))
    : []

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
  const selectedUnitCode = normalizedSelectedUnit || null

  const mentionedUnitCode = detectMentionedUnit(request.message, availableUnits)

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

  const pagesFromCurrentMessage = parsePageNumbers(request.message)
  const inheritedPages = hasPageFollowUpReference(request.message) ? collectRecentPages(recentMessages) : []
  const requestedPages = pagesFromCurrentMessage.length ? pagesFromCurrentMessage : inheritedPages
  const hasPageIntent = requestedPages.length > 0 || hasPageFollowUpReference(request.message)

  const schedule = await resolveScheduleContext({
    userId,
    unitCode: effectiveUnitCode,
    message: request.message,
    cloudUnits
  })

  const retrievalQuery = [
    request.message,
    schedule?.text,
    request.topic ? `Topic: ${request.topic}` : '',
    requestedPages.length ? `Requested pages: ${requestedPages.join(', ')}` : ''
  ].filter(Boolean).join('\n')

  let scopedHits: any[] = effectiveUnitCode
    ? await searchKnowledgeBase(retrievalQuery, effectiveUnitCode, 16, userId)
    : unscopedHits

  const diagnostics: Record<string, unknown> = {
    requestedPages,
    selectedUnitCode,
    effectiveUnitCode,
    candidateDocuments: [] as string[],
    chosenDocumentId: null,
    retrievedChunkIds: [] as string[],
    retrievedPageRanges: [] as Array<{ pageStart: number | null; pageEnd: number | null }>,
    retrievalScores: [] as number[]
  }

  let pageModeNote = ''

  if (userId && hasPageIntent && requestedPages.length) {
    const candidates = selectDocumentCandidates({
      message: request.message,
      recentMessages,
      documents: allDocuments,
      effectiveUnitCode
    })
    diagnostics.candidateDocuments = candidates.slice(0, 5).map((item) => `${item.document_id}:${item.filename}`)

    const minRequested = Math.min(...requestedPages)
    const maxRequested = Math.max(...requestedPages)
    const preferredDocumentIds = candidates.filter((item) => item.score > 0).slice(0, 3).map((item) => item.document_id)

    const pageChunks = await searchCloudChunks(userId, effectiveUnitCode || undefined, 2500, {
      pageStart: minRequested,
      pageEnd: maxRequested,
      documentIds: preferredDocumentIds.length ? preferredDocumentIds : undefined
    })

    const filteredByExactPages = (pageChunks || []).filter((chunk) => {
      if (typeof chunk.page_start !== 'number' || typeof chunk.page_end !== 'number') return false
      const pageStart = chunk.page_start
      const pageEnd = chunk.page_end
      return requestedPages.some((page) => page >= pageStart && page <= pageEnd)
    })

    if (filteredByExactPages.length) {
      const byDocument = new Map<string, typeof filteredByExactPages>()
      for (const chunk of filteredByExactPages) {
        const key = String(chunk.document_id)
        if (!byDocument.has(key)) byDocument.set(key, [])
        byDocument.get(key)!.push(chunk)
      }

      const rankedDocs = Array.from(byDocument.entries())
        .map(([documentId, chunks]) => {
          const candidateScore = candidates.find((candidate) => candidate.document_id === documentId)?.score || 0
          return {
            documentId,
            chunks,
            score: chunks.length * 2 + candidateScore
          }
        })
        .sort((a, b) => b.score - a.score)

      const docAmbiguous = rankedDocs.length > 1 && Math.abs(rankedDocs[0].score - rankedDocs[1].score) <= 1
      if (docAmbiguous && !hasDocumentPronounReference(request.message) && !(candidates[0] && candidates[0].score >= 2)) {
        const ambiguous = rankedDocs.slice(0, 2).map((item) => {
          const name = allDocuments.find((doc) => String(doc.document_id) === item.documentId)?.filename || item.documentId
          return `${name}`
        })
        pageModeNote = `Page request is ambiguous across documents: ${ambiguous.join(' | ')}. Ask the user which document they mean.`
      } else {
        const chosen = rankedDocs[0]
        diagnostics.chosenDocumentId = chosen.documentId

        const queryEmbedding = await embedText(retrievalQuery)
        const scored = chosen.chunks
          .map((chunk) => {
            const emb = Array.isArray(chunk.embedding) ? chunk.embedding : []
            const score = emb.length ? cosineSimilarity(queryEmbedding, emb) : 0
            return {
              chunk: {
                chunkId: chunk.id,
                documentId: chunk.document_id,
                chunkIndex: chunk.chunk_index,
                sectionTitle: chunk.section || '',
                pageNumber: typeof chunk.page_start === 'number' ? chunk.page_start : undefined,
                text: chunk.text,
                keywords: [],
                relationships: [],
                embeddingPath: '',
                sourcePriority: 1,
                version: 1,
                courseCode: chunk.course_code,
                sourceFileName: chunk.source_filename
              },
              score
            }
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)

        diagnostics.retrievedChunkIds = scored.map((item) => String(item.chunk.chunkId))
        diagnostics.retrievedPageRanges = scored.map((item) => {
          const page = Number(item.chunk.pageNumber)
          return { pageStart: Number.isFinite(page) ? page : null, pageEnd: Number.isFinite(page) ? page : null }
        })
        diagnostics.retrievalScores = scored.map((item) => Number(item.score.toFixed(4)))

        scopedHits = scored
      }
    } else {
      const coarseChunks = await searchCloudChunks(userId, effectiveUnitCode || undefined, 600, {
        documentIds: candidates.map((candidate) => candidate.document_id)
      })
      const visibleDocs = new Set((coarseChunks || []).map((chunk) => String(chunk.document_id)))
      const docsWithMissingPageIndex = allDocuments
        .filter((doc) => doc.document_id && visibleDocs.has(String(doc.document_id)))
        .map((doc) => doc.filename)

      if (docsWithMissingPageIndex.length) {
        pageModeNote = `I can see the uploaded document, but its page-level text was not indexed correctly for exact page retrieval. A page-aware re-index is needed for: ${docsWithMissingPageIndex.slice(0, 3).join(' | ')}.`
      } else {
        pageModeNote = 'No uploaded chunks matched the requested page range in the current unit context.'
      }
    }
  }

  const relevantHits = scopedHits.filter((hit) => hit.score >= 0.2 || (hit.chunk && typeof hit.chunk.pageNumber === 'number'))
  const topHits = relevantHits.slice(0, 6)
  const relevantChunks = topHits.map((hit, index) => {
    const sourceName = hit.chunk.sourceFileName || 'Uploaded material'
    const section = hit.chunk.sectionTitle || `Chunk ${hit.chunk.chunkIndex + 1}`
    const page = getHitPageRange(hit)
    const pageLabel = page ? `Pages ${page.pageStart}${page.pageEnd !== page.pageStart ? `-${page.pageEnd}` : ''}` : 'Page unknown'
    return `[SOURCE ${index + 1}: ${sourceName} | ${section} | ${pageLabel} | ${getHitUnitCode(hit) || effectiveUnitCode || 'General'}]\n${hit.chunk.text.slice(0, 1200)}`
  })

  const citationByDocument = new Map<string, TutorCitation>()
  for (const hit of topHits) {
    if (citationByDocument.has(hit.chunk.documentId)) continue
    const page = getHitPageRange(hit)
    citationByDocument.set(hit.chunk.documentId, {
      id: hit.chunk.documentId,
      label: hit.chunk.sourceFileName || hit.chunk.sectionTitle || 'Uploaded material',
      unit: getHitUnitCode(hit) || effectiveUnitCode || null,
      section: page
        ? `Pages ${page.pageStart}${page.pageEnd !== page.pageStart ? `-${page.pageEnd}` : ''}`
        : (hit.chunk.sectionTitle || null),
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
      requestedPages.length ? `Requested page range: ${requestedPages.join(', ')}.` : '',
      pageModeNote,
      topHits.length
        ? `Retrieved ${topHits.length} substantive chunks from ${hitCitations.length} source document(s).`
        : 'No substantive uploaded chunks passed the relevance threshold.',
      scopedDocuments.length
        ? `Sources actually used: ${scopedDocuments.map((document) => document.filename).join(' | ')}`
        : 'Uploaded sources were insufficient; answer from general knowledge and state that limitation.'
    ].filter(Boolean).join(' ')
    : 'Effective unit: General. No strong unit evidence was applied.'

  await appendLog('retrievals', 'Tutor document/page retrieval diagnostics', diagnostics).catch(() => {})

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
  }).catch(() => {})

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
