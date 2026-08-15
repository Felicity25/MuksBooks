import { NextRequest, NextResponse } from 'next/server'
import { getUploadBatch, listUploadBatches } from '@/lib/app-state/service'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const batchId = searchParams.get('batchId')
  const limit = Number(searchParams.get('limit') || 20)

  if (batchId) {
    const batch = getUploadBatch(batchId)
    if (!batch) {
      return NextResponse.json({ ok: false, error: 'batch not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, batch })
  }

  const batches = listUploadBatches('default', Number.isFinite(limit) ? limit : 20)
  return NextResponse.json({ ok: true, batches })
}
