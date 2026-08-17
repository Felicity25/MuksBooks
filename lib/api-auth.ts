import { NextRequest, NextResponse } from 'next/server'

/**
 * Returns 401 JSON if no Supabase auth cookie is present, otherwise null.
 * Used by mutation API routes to reject unauthenticated write requests.
 */
export function requireAuthCookie(request: NextRequest): NextResponse | null {
  const cookieNames = request.cookies.getAll().map(c => c.name)
  const authenticated = cookieNames.some(n => n.startsWith('sb-') && n.includes('auth-token'))
  if (!authenticated) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }
  return null
}
