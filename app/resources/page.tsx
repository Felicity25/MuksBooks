import { Card } from '@/components/ui/card'
import { SectionShell } from '@/components/section-shell'

const resources = [
  { title: 'Actuarial pricing models video', type: 'Video', coverage: 'Asset pricing', worth: 'High' },
  { title: 'Hypothesis testing notes', type: 'Article', coverage: 'Inference', worth: 'Medium' },
  { title: 'Monte Carlo practice set', type: 'Practice', coverage: 'Simulation', worth: 'Worth it' }
]

export default function ResourcesPage() {
  return (
    <SectionShell title="Learning resources" description="Recommended reading, videos and practice for each topic" actionLabel="Analyse resource">
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Top resources</p>
        <div className="space-y-3">
          {resources.map((resource) => (
            <div key={resource.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">{resource.title}</p>
              <p className="text-sm text-slate-600">{resource.type} • {resource.coverage}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Worth using: {resource.worth}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Resource analysis</p>
        <p className="text-sm leading-6 text-slate-600">Each link is evaluated by the unit or learning objective it supports, what it covers, and what it misses.</p>
      </Card>
    </SectionShell>
  )
}
