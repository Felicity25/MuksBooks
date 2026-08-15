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

export async function searchKnowledgeBase(query: string, courseCode?: string, limit = 8): Promise<SearchResult[]> {
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
