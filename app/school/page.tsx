'use client'

import { CalendarClock, GraduationCap, NotebookPen, Sparkles, Upload, Waypoints } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { SubjectManager } from '@/components/learner/subject-manager'
import { ReportUploadPanel } from '@/components/learner/report-upload-panel'
import { TimetableReviewer } from '@/components/learner/timetable-reviewer'
import { MajorProjectsManager } from '@/components/learner/major-projects-manager'
import { AssessmentTracker } from '@/components/learner/assessment-tracker'
import { SectionShell } from '@/components/section-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const sampleSubjects = [
  { name: 'Mathematics: Analysis & Approaches HL', level: 'HL', grade: 'A', trend: '+8%' },
  { name: 'Economics HL', level: 'HL', grade: 'A-', trend: '+5%' },
  { name: 'English Language & Literature SL', level: 'SL', grade: 'A', trend: '+4%' },
  { name: 'Biology SL', level: 'SL', grade: 'B+', trend: '+2%' }
]

const majorProjects = [
  { title: 'Economics IA', status: 'Draft due in 12 days', type: 'Internal Assessment' },
  { title: 'Extended Essay', status: 'Research plan approved', type: 'EE' },
  { title: 'TOK exhibition', status: 'Reflection stage', type: 'TOK' },
  { title: 'Biology test', status: 'Next assessment this Friday', type: 'Assessment' }
]

export default function SchoolPage() {
  const { settings } = useAuth()

  return (
    <SectionShell
      title="School"
      description={`${settings.curriculum || 'IB Diploma Programme'} — ${settings.schoolName || 'Your school profile'}`}
      actionLabel="Upload report"
      contentClassName="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]"
    >
      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            <GraduationCap className="h-4 w-4" />
            School overview
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">School</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{settings.schoolName || 'Awaiting school name'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Curriculum</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{settings.curriculum || 'IB Diploma Programme'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Academic year</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{settings.schoolYear || 'DP1'}</p>
            </div>
          </div>
        </Card>

        <SubjectManager />

        <MajorProjectsManager />

        <AssessmentTracker />

        <ReportUploadPanel />
      </div>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Waypoints className="h-4 w-4 text-sky-700" />
            Next priority
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">Economics IA draft</p>
          <p className="mt-2 text-sm text-slate-600">Deadline in 12 days. Review your plan, outline, and evidence before submission.</p>
          <Button type="button" className="mt-4 w-full">Open planner</Button>
        </Card>

        <TimetableReviewer />

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-sky-700" />
            AI support
          </div>
          <p className="mt-3 text-sm text-slate-600">Break your EE into milestones, plan revision around exams, and keep deadlines realistic.</p>
          <div className="mt-4 flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm">Ask AI Tutor</Button>
            <Upload className="h-4 w-4 text-slate-500" />
          </div>
        </Card>
      </div>
    </SectionShell>
  )
}
