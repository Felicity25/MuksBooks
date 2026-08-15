import { SectionShell } from '@/components/section-shell'
import { UploadsManager } from '@/components/uploads-manager'

export default function UploadsPage() {
  return (
    <SectionShell title="Upload centre" description="Store unit files, rubrics and lecture materials" actionLabel="Upload file">
      <UploadsManager />
      <div className="mt-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">How it works</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">Every file is linked to a unit or topic and made available to the AI Tutor for rubric-aware feedback and lesson generation.</p>
        </div>
      </div>
    </SectionShell>
  )
}
