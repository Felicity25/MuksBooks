import { NextResponse } from 'next/server'

// Guest browsing is allowed everywhere. Authentication is enforced at the
// action level inside components and on mutation API routes, not here.
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
