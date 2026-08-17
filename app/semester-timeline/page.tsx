import { SectionShell } from '@/components/section-shell'
import { SemesterTimeline } from '@/components/semester-timeline'

export default function SemesterTimelinePage() {
  return (
    <SectionShell title="Semester Timeline" description="See the current Monash teaching week, break periods and exam windows" actionLabel="View timeline">
      <SemesterTimeline />
    </SectionShell>
  )
}