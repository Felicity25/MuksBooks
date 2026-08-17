'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/units', label: 'Units' },
  { href: '/planner', label: 'Planner' },
  { href: '/uploads', label: 'Uploads' },
  { href: '/ai-tutor', label: 'AI Tutor' },
  { href: '/news', label: 'Actuarial News' },
  { href: '/careers', label: 'Careers' },
  { href: '/resources', label: 'Resources' },
  { href: '/semester-timeline', label: 'Semester Timeline' },
  { href: '/settings', label: 'Settings' }
]

export function Navbar() {
  const { user, isGuest, isLoading, requireAuth, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignIn = () => requireAuth('Sign in to save your work and access it from any device.')
  const handleSignUp = () => {
    requireAuth('Create a free account to save your work and access it from any device.')
  }

  const handleMobileSignOut = () => {
    setIsMobileMenuOpen(false)
    void signOut().then(() => {
      window.location.href = '/'
    })
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
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100 sm:hidden"
          >
            {isMobileMenuOpen ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950">
                {item.label}
              </Link>
            ))}
          </nav>

          {!isLoading && (
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
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
                  <span className="hidden max-w-[160px] truncate text-xs text-slate-500 sm:inline">{user?.email}</span>
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

      {isMobileMenuOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3 sm:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {!isLoading ? (
            <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
              {isGuest ? (
                <>
                  <p className="px-1 text-xs text-slate-500">Browsing as guest</p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        handleSignIn()
                      }}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        handleSignUp()
                      }}
                      className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                    >
                      Create Account
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="truncate px-1 text-xs text-slate-500">{user?.email}</p>
                  <button
                    type="button"
                    onClick={handleMobileSignOut}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}

