import Link from 'next/link'
import { cn } from '@/lib/utils'

type BrandVariant = 'wordmark' | 'lockup' | 'icon' | 'compact'

interface BrandMarkProps {
  variant?: BrandVariant
  href?: string
  className?: string
  showTagline?: boolean
  tone?: 'default' | 'sidebar'
}

function BookSymbol({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('h-7 w-7', className)}>
      <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 10.5c2.2-1.2 4.5-1.7 6-1.7 1.7 0 3.8.5 6 1.7v11.2c-2.2-1.2-4.3-1.7-6-1.7s-3.8.5-6 1.7V10.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 9v12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function BrandWord() {
  return (
    <span className="font-brand text-[1.02rem] font-semibold leading-none tracking-[-0.02em]">
      MuksBooks
    </span>
  )
}

export function BrandMark({ variant = 'lockup', href = '/', className, showTagline = false, tone = 'default' }: BrandMarkProps) {
  const rootTone = tone === 'sidebar' ? 'text-[var(--sidebar-text)]' : 'text-[var(--text-primary)]'
  const mutedTone = tone === 'sidebar' ? 'text-[var(--sidebar-text)]/85' : 'text-[var(--text-muted)]'
  const subtleTone = tone === 'sidebar' ? 'text-[var(--sidebar-text)]/75' : 'text-[var(--text-muted)]'

  const content = (
    <span className={cn('inline-flex items-center gap-2', rootTone, className)}>
      {variant !== 'wordmark' ? <BookSymbol /> : null}
      <span className="flex flex-col items-start leading-none">
        {variant !== 'icon' ? <BrandWord /> : null}
        {showTagline ? <span className={cn('mt-1 text-[0.65rem] font-medium tracking-[0.08em]', mutedTone)}>For you, by you.</span> : null}
      </span>
      {variant === 'compact' ? <span className={cn('text-[0.66rem] font-medium uppercase tracking-[0.22em]', subtleTone)}>Academia</span> : null}
    </span>
  )

  return href ? <Link href={href}>{content}</Link> : content
}
