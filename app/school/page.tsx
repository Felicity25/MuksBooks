'use client'

import Link from 'next/link'
import { GraduationCap, Sparkles, Upload, Waypoints } from 'lucide-react'
import { SubjectManager } from '@/components/learner/subject-manager'
import { ReportUploadPanel } from '@/components/learner/report-upload-panel'
import { TimetableReviewer } from '@/components/learner/timetable-reviewer'
import { MajorProjectsManager } from '@/components/learner/major-projects-manager'
import { AssessmentTracker } from '@/components/learner/assessment-tracker'
import { SectionShell } from '@/components/section-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CurriculumSelector } from '@/components/learner/curriculum-selector'
import { useCurriculum } from '@/components/learner/curriculum-context'

export default function SchoolPage() {
  const { profile, curriculum, selectedLevelId } = useCurriculum()
  const level = curriculum.levels.find((item) => item.id === selectedLevelId)
  const nextAssessment = [...profile.assessments]
    .filter((assessment) => assessment.status === 'upcoming')
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0]

  return (
    <SectionShell
      title="School"
      description={`${curriculum.shortName} — ${profile.school?.name || 'Your school profile'}`}
      actionLabel="Upload report"
      contentClassName="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]"
    >
      <div className="space-y-5">
        <CurriculumSelector />
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            <GraduationCap className="h-4 w-4" />
            School overview
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">School</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{profile.school?.name || 'Awaiting school name'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Curriculum</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{curriculum.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{curriculum.terminology.level}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{level?.label || profile.yearLevel || 'Not selected'}</p>
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
          <p className="mt-3 text-xl font-semibold text-slate-900">{nextAssessment?.title || 'No upcoming assessment'}</p>
          <p className="mt-2 text-sm text-slate-600">{nextAssessment ? `${nextAssessment.subject} · due ${nextAssessment.dueDate}` : `Add your next ${curriculum.terminology.assessment.toLowerCase()} to build a priority plan.`}</p>
          <Link href="/planner" className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--primary)] px-5 text-sm font-medium text-white hover:bg-[var(--primary-hover)]">Open planner</Link>
        </Card>

        <TimetableReviewer />

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-sky-700" />
            AI support
          </div>
          <p className="mt-3 text-sm text-slate-600">Plan around {curriculum.terminology.assessment.toLowerCase()} and {curriculum.terminology.examination.toLowerCase()} requirements using your saved subjects.</p>
          <div className="mt-4 flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm">Ask AI Tutor</Button>
            <Upload className="h-4 w-4 text-slate-500" />
          </div>
        </Card>
      </div>
    </SectionShell>
  )
}
