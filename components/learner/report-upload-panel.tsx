'use client'

import { useMemo, useState } from 'react'
import { Check, FileText, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCurriculum } from '@/components/learner/curriculum-context'
import type { ReportEntry } from '@/lib/learner/store'

interface ExtractedReport {
  subject: string
  level: 'HL' | 'SL'
  grade: string
  predicted: string
  comment: string
}

function analyseFile(fileName: string): ExtractedReport {
  const lower = fileName.toLowerCase()
  const subject = lower.includes('economics') ? 'Economics' : lower.includes('math') ? 'Mathematics: Analysis & Approaches' : lower.includes('biology') ? 'Biology' : 'English Language & Literature'
  const level = lower.includes('sl') ? 'SL' : 'HL'

  return {
    subject,
    level,
    grade: lower.includes('report') ? 'A-' : 'A',
    predicted: lower.includes('report') ? 'A' : 'A',
    comment: lower.includes('economics') ? 'Teacher highlights strong analysis and evidence; continue to strengthen evaluation.' : 'Teacher notes stronger performance in analysis and consistency; continue revision around application depth.'
  }
}

export function ReportUploadPanel() {
  const { profile, saveProfile } = useCurriculum()
  const [files, setFiles] = useState<File[]>([])
  const [draft, setDraft] = useState<ExtractedReport[]>([])
  const [confirmed, setConfirmed] = useState<string[]>([])

  const extractedSummary = useMemo(() => draft, [draft])

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || [])
    setFiles(nextFiles)
    setDraft(nextFiles.map((file) => analyseFile(file.name)))
  }

  const confirmDraft = async () => {
    if (!extractedSummary.length) return

    const nextReports: ReportEntry[] = extractedSummary.map((item, index) => ({
      id: `${Date.now()}-${index}`,
      title: `${item.subject} report`,
      date: new Date().toISOString().slice(0, 10),
      subject: item.subject,
      level: item.level,
      grade: item.grade,
      predictedGrade: item.predicted,
      teacherComments: item.comment,
      term: 'Term 1',
      year: '2026'
    }))

    const saved = await saveProfile({ reports: [...nextReports, ...profile.reports] })
    setConfirmed(saved.reports.slice(0, nextReports.length).map((report) => report.subject))
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <UploadCloud className="h-4 w-4 text-sky-700" />
        Assessment and report upload
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
          <FileText className="h-4 w-4" />
          Upload PDF, screenshot, or photo
          <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,image/*" className="hidden" onChange={onFileChange} />
        </label>
      </div>

      {files.length ? <p className="mt-3 text-xs text-slate-500">{files.length} file(s) selected</p> : null}

      {draft.length ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">Extracted values to review</p>
          {draft.map((item, index) => (
            <div key={`${item.subject}-${item.level}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{item.subject}</p>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">{item.level}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">Current grade: {item.grade} • Predicted: {item.predicted}</p>
              <p className="mt-2 text-xs text-slate-600">{item.comment}</p>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => void confirmDraft()} size="sm">Confirm values</Button>
            <Button type="button" variant="secondary" size="sm">Adjust</Button>
          </div>
        </div>
      ) : null}

      {confirmed.length ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <Check className="h-4 w-4" />
          Added to profile: {confirmed.join(', ')}
        </div>
      ) : null}
    </Card>
  )
}
