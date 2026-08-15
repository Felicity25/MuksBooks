import { NextRequest, NextResponse } from 'next/server'
import { searchKnowledgeBase } from '@/lib/knowledge-base/search'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const unit = searchParams.get('unit') || undefined

  if (!q.trim()) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 })
  }

  const results = await searchKnowledgeBase(q, unit, 10)
  return NextResponse.json({
    ok: true,
    results: results.map((item) => ({
      score: item.score,
      chunkId: item.chunk.chunkId,
      sectionTitle: item.chunk.sectionTitle,
      text: item.chunk.text,
      keywords: item.chunk.keywords,
      documentId: item.chunk.documentId
    }))
  })
}
