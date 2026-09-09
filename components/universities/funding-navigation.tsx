import Link from 'next/link'
import { Calculator, CalendarDays, Search, WalletCards } from 'lucide-react'

const items = [
  { href: '/universities/funding', label: 'Discover', icon: Search },
  { href: '/universities/funding/applications', label: 'Applications', icon: WalletCards },
  { href: '/universities/funding/plan', label: 'Funding plan', icon: Calculator },
  { href: '/universities/calendar', label: 'Deadlines', icon: CalendarDays }
]

export function FundingNavigation() {
  return <nav aria-label="Funding workspace" className="flex max-w-full flex-wrap gap-2 border-b border-slate-200 pb-3">{items.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-800"><Icon className="h-4 w-4" />{item.label}</Link> })}</nav>
}