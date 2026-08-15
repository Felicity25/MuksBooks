import { SectionShell } from '@/components/section-shell'
import { AiTutorChat } from '@/components/ai-tutor-chat'

export default function AiTutorPage() {
  return (
    <SectionShell title="AI Tutor" description="Ask for concept explanations, lesson generation and assignment marking" actionLabel="Start session">
      <AiTutorChat />
    </SectionShell>
  )
}
