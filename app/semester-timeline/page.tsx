import { SectionShell } from '@/components/section-shell'
import { SemesterTimeline } from '@/components/semester-timeline'
import { UnitScheduleManager } from '@/components/unit-schedule-manager'

export default function SemesterTimelinePage() {
  return (
    <SectionShell title="Semester Timeline" description="See the current Monash teaching week, break periods and exam windows" actionLabel="View timeline">
      <div className="space-y-6">
        <SemesterTimeline />
        <h2 className="text-lg font-semibold text-slate-950">Curriculum</h2>
        <UnitScheduleManager />
      </div>
    </SectionShell>
  )
}