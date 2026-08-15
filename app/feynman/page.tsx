import { Card } from '@/components/ui/card'
import { SectionShell } from '@/components/section-shell'

export default function FeynmanPage() {
  return (
    <SectionShell title="Feynman room" description="Explain a topic and get follow-up checks" actionLabel="Begin explanation">
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Feature coming soon</p>
        <p className="text-sm leading-6 text-slate-600">The Feynman room will allow voice or text explanations with AI follow-up questions to check understanding. This feature is under development.</p>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Voice / text mode</p>
        <p className="text-sm leading-6 text-slate-600">The system asks why, points out vague reasoning, and corrects misunderstandings against your unit topic.</p>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Mastery update</p>
        <p className="text-sm leading-6 text-slate-600">Feynman explanations contribute to topic mastery and guide your next weak-topic practice.</p>
      </Card>
    </SectionShell>
  )
}
