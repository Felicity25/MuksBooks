import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { deleteProviderCredential, listProviderCredentials, saveProviderCredential } from '@/lib/tutor/persistence'
import { encryptSecret } from '@/lib/tutor/crypto'

export const runtime = 'nodejs'

function validateProvider(value: unknown): value is 'openai' | 'anthropic' {
  return value === 'openai' || value === 'anthropic'
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const credentials = await listProviderCredentials(user.id)
  return NextResponse.json({ ok: true, credentials })
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!validateProvider(body?.provider)) {
    return NextResponse.json({ ok: false, error: 'provider must be openai or anthropic' }, { status: 400 })
  }

  const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'apiKey is required' }, { status: 400 })
  }

  const encrypted = encryptSecret(apiKey)
  const ok = await saveProviderCredential({
    userId: user.id,
    provider: body.provider,
    label: typeof body?.label === 'string' ? body.label.trim() || 'default' : 'default',
    encryptedApiKey: encrypted.encrypted,
    encryptionIv: encrypted.iv,
    encryptionTag: encrypted.authTag
  })

  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Failed to store provider credential' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!validateProvider(body?.provider)) {
    return NextResponse.json({ ok: false, error: 'provider must be openai or anthropic' }, { status: 400 })
  }

  const ok = await deleteProviderCredential(
    user.id,
    body.provider,
    typeof body?.label === 'string' ? body.label.trim() || 'default' : 'default'
  )

  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Failed to delete provider credential' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
