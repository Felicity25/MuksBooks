import { SectionShell } from '@/components/section-shell'
import { CareersManager } from '@/components/careers/careers-manager'
import { Suspense } from 'react'

export default function CareersPage() {
  return (
    <SectionShell
      title="Careers"
      description="Discover opportunities, follow employers, track applications, and manage recruitment deadlines"
      actionLabel="Open Discover"
    >
      <Suspense fallback={<p className="text-sm text-slate-600">Loading careers workspace...</p>}>
        <CareersManager />
      </Suspense>
      <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Career workflow</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Discover, follow, save, apply, track assessments, and sync urgent actions into Planner from one connected careers area.
        </p>
      </div>
    </SectionShell>
  )
}
