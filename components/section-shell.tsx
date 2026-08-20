import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface SectionShellProps {
  title: string
  description: string
  actionLabel?: string
  contentClassName?: string
  children: ReactNode
}

export function SectionShell({ title, description, actionLabel, contentClassName, children }: SectionShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">{title}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{description}</h1>
        </div>
        {actionLabel ? <Button variant="secondary">{actionLabel}</Button> : null}
      </div>
      <div className={contentClassName || 'grid gap-4 lg:grid-cols-[0.9fr_0.6fr]'}>{children}</div>
    </div>
  )
}
