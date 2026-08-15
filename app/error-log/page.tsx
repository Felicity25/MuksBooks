import { Card } from '@/components/ui/card'
import { SectionShell } from '@/components/section-shell'

const errors = [
  { topic: 'Survival models', mistake: 'Misreading censoring assumptions', correction: 'Clarify right censoring vs interval censoring' },
  { topic: 'Asset pricing', mistake: 'Mixing spot and forward rates', correction: 'Separate the discount factor from the pricing kernel' }
]

export default function ErrorLogPage() {
  return (
    <SectionShell title="Error log" description="Capture topic mistakes and the next practice action" actionLabel="Add error">
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Feature coming soon</p>
        <p className="text-sm leading-6 text-slate-600">The error log will track mistakes from quizzes and assignments with corrections and practice recommendations. This feature is under development.</p>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Recent mistakes</p>
        <div className="space-y-3">
          {errors.map((item) => (
            <div key={item.topic} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">{item.topic}</p>
              <p className="text-sm text-slate-600">{item.mistake}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Correction: {item.correction}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Why use an error log?</p>
        <p className="text-sm leading-6 text-slate-600">Logging mistakes turns weak areas into targeted practice tasks so you learn from each error instead of repeating it.</p>
      </Card>
    </SectionShell>
  )
}
