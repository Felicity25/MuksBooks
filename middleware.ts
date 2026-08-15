import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const protectedPaths = ['/', '/units', '/planner', '/uploads', '/mastery', '/ai-tutor', '/settings']
  const pathname = request.nextUrl.pathname

  const isProtected = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  if (!isProtected) {
    return NextResponse.next()
  }

  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name)
  const hasSupabaseAuthCookie = cookieNames.some((name) => name.startsWith('sb-') && name.includes('auth-token'))

  if (!hasSupabaseAuthCookie) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|auth/login).*)']
}
