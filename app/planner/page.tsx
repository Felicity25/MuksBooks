import { SectionShell } from '@/components/section-shell'
import { PlannerManager } from '@/components/planner-manager'

export default function PlannerPage() {
  return (
    <SectionShell title="Planner calendar" description="Create weekly study blocks that link to units and tasks" actionLabel="Plan my week">
      <PlannerManager />
      <div className="mt-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Planning features</p>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            <li>Drag and resize sessions by unit, topic, assignment, or exam.</li>
            <li>AI review of your week for better workload balance.</li>
            <li>Today view and semester-level task filtering.</li>
          </ul>
        </div>
      </div>
    </SectionShell>
  )
}
