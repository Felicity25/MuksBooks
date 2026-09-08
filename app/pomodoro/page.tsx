import { SectionShell } from '@/components/section-shell'
import { StudyWorkspace } from '@/components/study/study-workspace'

export default function PomodoroPage() {
  return (
    <SectionShell title="MuksFocus" description="MuksFocus keeps your focus session alive across the whole app" actionLabel="Open Planner" contentClassName="w-full">
      <StudyWorkspace />
    </SectionShell>
  )
}
