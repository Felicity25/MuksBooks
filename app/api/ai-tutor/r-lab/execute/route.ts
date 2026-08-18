import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { executeRInSandbox } from '@/lib/tutor/r-lab'

export const runtime = 'nodejs'

const ALLOWED_FILE_EXTENSIONS = new Set(['.r', '.rmd', '.csv', '.tsv', '.txt'])

type UploadedRFile = {
  name: string
  contentBase64: string
  mimeType?: string
}

function isUploadedRFile(value: unknown): value is UploadedRFile {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.name === 'string' && typeof candidate.contentBase64 === 'string'
}

function isAllowedFileName(name: string) {
  const lower = name.toLowerCase()
  return Array.from(ALLOWED_FILE_EXTENSIONS).some((ext) => lower.endsWith(ext))
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code : ''

  if (!code.trim()) {
    return NextResponse.json({ ok: false, error: 'R code is required' }, { status: 400 })
  }

  const files = Array.isArray(body?.files) ? body.files.filter((item: unknown) => {
    if (!isUploadedRFile(item)) return false
    const name = item.name
    if (!isAllowedFileName(name)) return false
    const content = item.contentBase64
    return Boolean(name && content)
  }).slice(0, 8) : []

  const result = await executeRInSandbox({
    code,
    files,
    timeoutMs: Number(body?.timeoutMs || 25000)
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
