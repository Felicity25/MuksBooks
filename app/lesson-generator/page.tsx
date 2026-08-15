import { SectionShell } from '@/components/section-shell'
import { LessonGenerator } from '@/components/lesson-generator'

export default function LessonGeneratorPage() {
  return (
    <SectionShell title="Lesson generator" description="Create topic lessons linked to units and objectives" actionLabel="Generate lesson">
      <LessonGenerator />
    </SectionShell>
  )
}
