'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { BookOpen, BriefcaseBusiness, CalendarClock, FileText, GraduationCap, Home, Menu, NotebookPen, School, Settings, Sparkles, Timer, Upload, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { BrandMark } from '@/components/brand/brand-mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
}

const universityNav = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/notes', label: 'MuksNotes', icon: NotebookPen },
  { href: '/units', label: 'University', icon: GraduationCap },
  { href: '/study', label: 'MuksFocus', icon: Timer },
  { href: '/planner', label: 'Planner', icon: CalendarClock },
  { href: '/news', label: 'News', icon: Sparkles },
  { href: '/careers', label: 'Careers', icon: BriefcaseBusiness },
  { href: '/resources', label: 'Resources', icon: BookOpen },
  { href: '/uploads', label: 'Uploads', icon: Upload },
  { href: '/settings', label: 'Personalisation', icon: Settings }
]

const learnerNav = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/notes', label: 'MuksNotes', icon: NotebookPen },
  { href: '/school', label: 'School', icon: School },
  { href: '/study', label: 'MuksFocus', icon: Timer },
  { href: '/planner', label: 'Planner', icon: CalendarClock },
  { href: '/news', label: 'News', icon: Sparkles },
  { href: '/universities', label: 'Universities', icon: GraduationCap },
  { href: '/resources', label: 'Resources', icon: BookOpen },
  { href: '/settings', label: 'Personalisation', icon: Settings }
]

const utilityLinks = [
  { href: '/ai-tutor', label: 'AI Tutor', icon: Sparkles },
  { href: '/semester-timeline', label: 'Semester Timeline', icon: CalendarClock }
]

function NavItem({ href, label, icon: Icon, active, onClick }: { href: string; label: string; icon: any; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
        active
          ? 'border-[var(--border-strong)] bg-[var(--selected-background)] text-[var(--text-primary)]'
          : 'border-transparent text-[var(--sidebar-text)] hover:border-[var(--sidebar-border)] hover:bg-white/10'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className={cn('h-4 w-4', active ? 'text-[var(--accent)]' : 'text-[var(--sidebar-muted)] group-hover:text-[var(--sidebar-text)]')} />
      <span>{label}</span>
    </Link>
  )
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, isGuest, isLoading, requireAuth, signOut, settings } = useAuth()
  const isFocusedRoute = pathname?.startsWith('/auth') || pathname?.startsWith('/onboarding')
  const isLearnerMode = settings.academicMode === 'LEARNER'
  const mainNav = isLearnerMode ? learnerNav : universityNav

  const handleSignIn = () => requireAuth('Sign in to sync your MuksBooks workspace across devices.')

  if (isFocusedRoute) {
    return (
      <div className="min-h-screen bg-[var(--app-background)] text-[var(--text-primary)]">
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
            <BrandMark variant="lockup" showTagline />
            <p className="text-xs text-[var(--text-muted)]">Your MuksFocus space. Your way.</p>
          </div>
        </header>
        <main className="px-4 py-8 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--app-background)] text-[var(--text-primary)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] px-4 py-5 lg:flex lg:flex-col">
          <div className="mb-6">
            <BrandMark variant="compact" showTagline tone="sidebar" />
            <p className="mt-3 text-xs text-[var(--sidebar-muted)]">{isLearnerMode ? 'School-first learning workspace.' : 'Your personalised academia app.'}</p>
          </div>

          <nav className="space-y-1" aria-label="Main navigation">
            {mainNav.map((item) => (
              <NavItem key={item.href} {...item} active={pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))} />
            ))}
          </nav>

          <div className="mt-6 border-t border-[var(--sidebar-border)] pt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--sidebar-muted)]">Tools</p>
            <div className="space-y-1">
              {utilityLinks.map((item) => (
                <NavItem key={item.href} {...item} active={pathname === item.href || pathname?.startsWith(item.href)} />
              ))}
            </div>
          </div>

          <div className="mt-auto rounded-md border border-[var(--sidebar-border)] bg-white/5 p-3 text-xs text-[var(--sidebar-text)]">
            <p className="font-semibold">{settings.name || 'Student workspace'}</p>
            <p className="mt-1 text-[var(--sidebar-muted)]">{settings.degree || 'Configure your academic profile in Personalisation.'}</p>
            {!isLoading ? (
              isGuest ? (
                <Button className="mt-3 w-full" size="sm" onClick={handleSignIn}>Sign in</Button>
              ) : (
                <Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => void signOut().then(() => { window.location.href = '/' })}>Sign out</Button>
              )
            ) : null}
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3 lg:px-8">
              <div className="flex items-center gap-3 lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobileOpen((value) => !value)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)]"
                  aria-label="Toggle navigation"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <BrandMark variant="lockup" showTagline />
              </div>

              <div className="hidden lg:block">
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">MuksBooks</p>
                <p className="text-sm text-[var(--text-secondary)]">For you, by you.</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                {!isGuest && user?.email ? <span className="hidden sm:inline">{user.email}</span> : null}
                <Link href="/settings" className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover-background)]">Settings</Link>
              </div>
            </div>

            {mobileOpen ? (
              <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-3 lg:hidden">
                <nav className="grid grid-cols-1 gap-1">
                  {mainNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'rounded-md border px-3 py-2 text-sm',
                        pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
                          ? 'border-[var(--border-strong)] bg-[var(--selected-background)]'
                          : 'border-transparent hover:bg-[var(--hover-background)]'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ) : null}
          </header>

          <main className="flex-1 px-4 py-6 pb-24 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
