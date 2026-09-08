import { SectionShell } from '@/components/section-shell'
import { PlannerManager } from '@/components/planner-manager'

export default function PlannerPage() {
  return (
    <SectionShell title="Planner" description="Open MuksBooks and immediately understand your day">
      <PlannerManager />
    </SectionShell>
  )
}
