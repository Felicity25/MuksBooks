import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-6 shadow-soft', className)}>{children}</div>
  )
}
