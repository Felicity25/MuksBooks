import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends PropsWithChildren<{ className?: string; variant?: 'default' | 'secondary' | 'outline'; onClick?: () => void }> {}

export function Badge({ children, className, variant = 'secondary', onClick }: BadgeProps) {
  const variantClasses = {
    default: 'bg-slate-900 text-slate-50',
    secondary: 'bg-slate-100 text-slate-700',
    outline: 'border border-slate-300 bg-white text-slate-700'
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
