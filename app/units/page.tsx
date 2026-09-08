import { AcademicAssessmentsManager } from '@/components/academic-assessments-manager'
import { SectionShell } from '@/components/section-shell'
import { UnitScheduleManager } from '@/components/unit-schedule-manager'
import { UnitsManager } from '@/components/units-manager'

export default function UnitsPage() {
  return (
    <SectionShell title="University" description="Organise units, weekly structure, and assessment deadlines in one academic workspace" actionLabel="Create new unit" contentClassName="w-full">
      <div className="space-y-6">
        <UnitsManager />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <UnitScheduleManager />
          <AcademicAssessmentsManager />
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-secondary)]">
          Link each unit to weekly topics, assessment deadlines, and uploaded material so MuksBooks can support study, planning, and revision without duplicating records.
        </div>
      </div>
    </SectionShell>
  )
}
