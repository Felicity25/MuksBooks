import { SectionShell } from '@/components/section-shell'
import { SemesterTimeline } from '@/components/semester-timeline'
import { UnitScheduleManager } from '@/components/unit-schedule-manager'

export default function SemesterTimelinePage() {
  return (
    <SectionShell title="Semester Timeline" description="See the current Monash teaching week, break periods and exam windows" actionLabel="View timeline">
      <div className="space-y-6">
        <SemesterTimeline />
        <UnitScheduleManager />
      </div>
    </SectionShell>
  )
}