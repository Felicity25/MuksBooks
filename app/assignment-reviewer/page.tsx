import { SectionShell } from '@/components/section-shell'
import { AssignmentReviewer } from '@/components/assignment-reviewer'

export default function AssignmentReviewerPage() {
  return (
    <SectionShell title="Assignment reviewer" description="Strict rubric-based assignment feedback" actionLabel="Review submission">
      <AssignmentReviewer />
    </SectionShell>
  )
}
