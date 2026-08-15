import { Card } from '@/components/ui/card'
import { SectionShell } from '@/components/section-shell'

const templates = [
  { title: 'Deep Learning Session', time: '90 min' },
  { title: 'Exam Revision Plan', time: '120 min' },
  { title: 'Weak Topic Recovery', time: '60 min' },
  { title: 'Assignment Planner', time: '45 min' }
]

export default function TemplatesPage() {
  return (
    <SectionShell title="Study templates" description="Use structured sessions for deep work and exam preparation" actionLabel="Use template">
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Templates</p>
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">{template.title}</p>
              <p className="mt-2 text-sm text-slate-600">Estimated time: {template.time}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Template details</p>
        <p className="text-sm leading-6 text-slate-600">Each study template provides steps, prompts and checkpoints for more effective revision.</p>
      </Card>
    </SectionShell>
  )
}
