import { promises as fs } from 'fs'
import path from 'path'
import { appendLog } from '@/lib/logging'
import { embedText, cosineSimilarity } from './embeddings'
import { loadCatalog, KNOWLEDGE_ROOT } from './catalog'
import type { ChunkRecord, SearchResult } from './types'

function embeddingGlobalPath(relativePath: string) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(KNOWLEDGE_ROOT, relativePath)
}

async function loadEmbedding(chunk: ChunkRecord) {
  const file = embeddingGlobalPath(chunk.embeddingPath)
  const raw = await fs.readFile(file, 'utf8')
  return JSON.parse(raw) as number[]
}

function addNeighborChunks(sorted: SearchResult[], allChunks: ChunkRecord[]) {
  const byDoc = new Map<string, ChunkRecord[]>()
  for (const chunk of allChunks) {
    if (!byDoc.has(chunk.documentId)) byDoc.set(chunk.documentId, [])
    byDoc.get(chunk.documentId)!.push(chunk)
  }
  byDoc.forEach((chunks) => chunks.sort((a, b) => a.chunkIndex - b.chunkIndex))

  const picked = new Map<string, SearchResult>()
  for (const hit of sorted) {
    picked.set(hit.chunk.chunkId, hit)
  }

  for (const hit of sorted.slice(0, 4)) {
    const docChunks = byDoc.get(hit.chunk.documentId) || []
    const idx = docChunks.findIndex((c) => c.chunkId === hit.chunk.chunkId)
    for (const offset of [-1, 1]) {
      const neighbor = docChunks[idx + offset]
      if (neighbor && !picked.has(neighbor.chunkId)) {
        picked.set(neighbor.chunkId, { chunk: neighbor, score: hit.score * 0.92 })
      }
    }
  }

  return Array.from(picked.values()).sort((a, b) => b.score - a.score)
}

/**
 * Search the knowledge base for chunks relevant to `query`.
 * When `userId` is provided and authenticated, prefers Supabase document_chunks
 * (persistent across Vercel redeploys) over the local filesystem catalog.
 */
export async function searchKnowledgeBase(query: string, courseCode?: string, limit = 8, userId?: string): Promise<SearchResult[]> {
  // ── Supabase path (production, persistent) ─────────────────────────────────
  if (userId) {
    try {
      const { searchCloudChunks } = await import('@/lib/supabase/documents-service')
      const cloudChunks = await searchCloudChunks(userId, courseCode, limit * 4)
      if (cloudChunks && cloudChunks.length > 0) {
        const queryEmbedding = await embedText(query)
        const scored = cloudChunks
          .map((c) => {
            const emb: number[] = Array.isArray(c.embedding) ? c.embedding : []
            return {
              chunk: {
                chunkId: c.id,
                documentId: c.document_id,
                chunkIndex: c.chunk_index,
                sectionTitle: c.section ?? '',
                text: c.text,
                keywords: [],
                relationships: [],
                embeddingPath: '',
                sourcePriority: 1,
                version: 1
              } as ChunkRecord,
              score: emb.length > 0 ? cosineSimilarity(queryEmbedding, emb) : 0
            }
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)

        await appendLog('searches', 'Knowledge base search (cloud)', { returned: scored.length }).catch(() => {})
        return scored
      }
    } catch {
      // Fall through to local filesystem search
    }
  }

  // ── Local filesystem path (local dev / fallback) ────────────────────────────
  const catalog = await loadCatalog()
  const queryEmbedding = await embedText(query)

  const activeDocuments = catalog.documents.filter((doc) => doc.status === 'active' && doc.metadata.courseCode)
  const activeDocIds = new Set(
    activeDocuments
      .filter((doc) => !courseCode || doc.metadata.courseCode.toUpperCase() === courseCode.toUpperCase())
      .map((doc) => doc.documentId)
  )

  const candidates = catalog.chunks.filter((chunk) => activeDocIds.has(chunk.documentId))
  const scored: SearchResult[] = []

  for (const chunk of candidates) {
    try {
      const emb = await loadEmbedding(chunk)
      const score = cosineSimilarity(queryEmbedding, emb) + (1 / chunk.sourcePriority) * 0.02
      scored.push({ chunk, score })
    } catch {
      // skip unreadable embedding
    }
  }

  const ranked = scored.sort((a, b) => b.score - a.score)
  const withNeighbors = addNeighborChunks(ranked, candidates)
  const result = withNeighbors.slice(0, limit)

  await appendLog('searches', 'Knowledge base search executed', {
    queryLength: query.length,
    courseCode: courseCode || null,
    candidates: candidates.length,
    returned: result.length
  })

  return result
}
