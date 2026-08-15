import { Card } from '@/components/ui/card'
import { SectionShell } from '@/components/section-shell'

const masteryRows = [
  { topic: 'Markov chains', level: 'Apply independently' },
  { topic: 'Hypothesis testing', level: 'Understand' },
  { topic: 'Survival models', level: 'Recognise' }
]

export default function MasteryPage() {
  return (
    <SectionShell title="Mastery tracker" description="Track topic confidence and exam readiness" actionLabel="Review mastery">
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Feature coming soon</p>
        <p className="text-sm leading-6 text-slate-600">The mastery tracker will monitor your progress on topics with levels from recognition to exam-ready. This feature is under development.</p>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Topic mastery</p>
        <div className="space-y-3">
          {masteryRows.map((item) => (
            <div key={item.topic} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">{item.topic}</p>
              <p className="text-sm text-slate-600">Level: {item.level}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Progress levels</p>
        <ul className="space-y-3 text-sm leading-6 text-slate-600">
          <li>Recognise</li>
          <li>Understand</li>
          <li>Apply with help</li>
          <li>Apply independently</li>
          <li>Exam ready</li>
          <li>HD level</li>
        </ul>
      </Card>
    </SectionShell>
  )
}
