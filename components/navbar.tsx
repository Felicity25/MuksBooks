'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/units', label: 'Units' },
  { href: '/uploads', label: 'Uploads' },
  { href: '/ai-tutor', label: 'AI Tutor' },
  { href: '/planner', label: 'Planner' },
  { href: '/news', label: 'News' },
  { href: '/settings', label: 'Settings' }
]

export function Navbar() {
  const { user, isGuest, isLoading, requireAuth, signOut } = useAuth()

  const handleSignIn = () => requireAuth('Sign in to save your work and access it from any device.')
  const handleSignUp = () => {
    requireAuth('Create a free account to save your work and access it from any device.')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <Link href="/" className="text-lg font-semibold text-slate-950">
            MuksBooks
          </Link>
          <p className="text-sm text-slate-500">Study planner, tutor, and assignment coach for Monash actuarial science.</p>
        </div>

        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950">
                {item.label}
              </Link>
            ))}
          </nav>

          {!isLoading && (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              {isGuest ? (
                <>
                  <span className="hidden text-xs text-slate-400 sm:inline">Browsing as guest</span>
                  <button type="button" onClick={handleSignIn}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                    Sign In
                  </button>
                  <button type="button" onClick={handleSignUp}
                    className="rounded-full bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700">
                    Create Account
                  </button>
                </>
              ) : (
                <>
                  <span className="hidden max-w-[140px] truncate text-xs text-slate-500 sm:inline">{user?.email}</span>
                  <button type="button" onClick={() => signOut().then(() => { window.location.href = '/' })}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                    Sign Out
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

