import Link from 'next/link'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/units', label: 'Units' },
  { href: '/uploads', label: 'Uploads' },
  { href: '/ai-tutor', label: 'AI Tutor' },
  { href: '/planner', label: 'Planner' },
  { href: '/news', label: 'News' },
  { href: '/error-dashboard', label: 'Errors' },
  { href: '/settings', label: 'Settings' }
]

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <Link href="/" className="text-lg font-semibold text-slate-950">
            MuksBooks
          </Link>
          <p className="text-sm text-slate-500">Study planner, tutor, and assignment coach for Monash actuarial science.</p>
        </div>
        <nav className="hidden items-center gap-4 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
