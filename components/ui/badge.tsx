import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends PropsWithChildren<{ className?: string; variant?: 'default' | 'secondary' | 'outline'; onClick?: () => void }> {}

export function Badge({ children, className, variant = 'secondary', onClick }: BadgeProps) {
  const variantClasses = {
    default: 'bg-[var(--primary)] text-white',
    secondary: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]',
    outline: 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
  }

  return (
    <span
      className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide', variantClasses[variant], className)}
      onClick={onClick}
    >
      {children}
    </span>
  )
}
