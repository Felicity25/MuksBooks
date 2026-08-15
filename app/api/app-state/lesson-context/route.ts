import { NextRequest, NextResponse } from 'next/server'
import { getLessonContext } from '@/lib/app-state/service'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const unit = searchParams.get('unit') || undefined
  const topic = searchParams.get('topic') || undefined
  const data = getLessonContext({ unit, topic })
  return NextResponse.json({ ok: true, data })
}
