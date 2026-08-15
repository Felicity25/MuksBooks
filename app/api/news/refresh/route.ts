import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.NEWS_CRON_SECRET

  if (expectedToken) {
    const provided = authHeader?.replace(/^Bearer\s+/i, '')
    if (!provided || provided !== expectedToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const { collectNews } = await import('@/lib/news/pipeline')
    const result = await collectNews()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('Daily news refresh failed:', error)
    return NextResponse.json({ ok: false, error: 'Refresh failed' }, { status: 500 })
  }
}
