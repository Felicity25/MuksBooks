import { Card } from '@/components/ui/card'
import { SectionShell } from '@/components/section-shell'
import { UnitsManager } from '@/components/units-manager'

export default function UnitsPage() {
  return (
    <SectionShell title="Units system" description="Manage academic years, semesters and unit planning" actionLabel="Create new unit">
      <div className="space-y-4">
        <Card>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Academic years</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="font-semibold text-slate-950">2026 - 2027</p>
                <p className="text-sm text-slate-600">Semester 1 and Semester 2 mapped to Monash dates.</p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">2 semesters</span>
            </div>
          </div>
        </Card>

        <UnitsManager />

        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Unit planning guidance</p>
          <p className="text-sm leading-6 text-slate-600">Link every unit to topics, assessments, exam dates and uploaded materials so your study workflow stays aligned.</p>
        </Card>
      </div>
    </SectionShell>
  )
}
