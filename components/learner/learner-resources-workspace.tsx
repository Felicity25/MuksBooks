'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, ExternalLink } from 'lucide-react'
import { CurriculumSelector } from './curriculum-selector'
import { useCurriculum } from './curriculum-context'
import { curriculumPath } from '@/lib/learner/curriculum-registry'

export function LearnerResourcesWorkspace() {
  const { profile, viewingCurriculum, curriculum, selectedLevelId, isProfileLoading } = useCurriculum()
  const [exploreAll, setExploreAll] = useState(false)
  const personalisedSubjects = useMemo(() => {
    if (viewingCurriculum !== 'MY' || profile.curriculum !== curriculum.id) return []
    const profileNames = new Set(profile.subjects.map((subject) => subject.name.toLowerCase()))
    const profileCodes = new Set(profile.subjects.map((subject) => subject.curriculumSubjectCode).filter(Boolean))
    return curriculum.subjects.filter((subject) => profileNames.has(subject.title.toLowerCase()) || profileCodes.has(subject.id))
  }, [curriculum, profile.curriculum, profile.subjects, viewingCurriculum])
  const visibleSubjects = !exploreAll && personalisedSubjects.length ? personalisedSubjects : curriculum.subjects
  const level = curriculum.levels.find((item) => item.id === selectedLevelId)
  const topicLabel = curriculum.terminology.topic === 'Area of Study' ? 'Areas of Study' : `${curriculum.terminology.topic}s`

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 px-4 py-7 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Learner resources</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950">Resources</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Browse from curriculum to {curriculum.terminology.level.toLowerCase()}, {curriculum.terminology.subject.toLowerCase()}, and {curriculum.terminology.topic.toLowerCase()}.</p>
          </div>
          <CurriculumSelector />
        </div>
      </header>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-teal-700">{curriculum.shortName} · {level?.label}</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{personalisedSubjects.length && !exploreAll ? 'Your subjects' : `Explore ${curriculum.terminology.subject.toLowerCase()}s`}</h2>
          </div>
          {personalisedSubjects.length ? (
            <button type="button" onClick={() => setExploreAll((value) => !value)} className="text-sm font-semibold text-teal-800 hover:text-teal-950">
              {exploreAll ? 'Show my subjects' : 'Explore all subjects'}
            </button>
          ) : null}
        </div>

        {isProfileLoading ? <p className="mt-5 text-sm text-slate-500">Loading your academic profile...</p> : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSubjects.map((subject) => (
            <Link key={subject.id} href={curriculumPath(curriculum.id, selectedLevelId, subject.id)} className="group border-t border-slate-200 py-4 transition hover:border-teal-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{subject.canonicalArea}</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">{subject.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{curriculum.terminology.syllabus}, {topicLabel.toLowerCase()}, practice and examination material</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-700" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 border-y border-slate-200 py-6 lg:grid-cols-[1fr_0.65fr]">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">How {curriculum.shortName} is structured</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><dt className="text-xs uppercase text-slate-500">Academic hierarchy</dt><dd className="mt-1 text-sm font-medium text-slate-900">{curriculum.terminology.subject} → {curriculum.terminology.syllabus} → {curriculum.terminology.topic}</dd></div>
            <div><dt className="text-xs uppercase text-slate-500">Assessment language</dt><dd className="mt-1 text-sm font-medium text-slate-900">{curriculum.terminology.assessment} / {curriculum.terminology.examination}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">{curriculum.assessmentTypes.map((type) => <span key={type} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{type}</span>)}</div>
        </div>
        <div className="border-l-0 border-slate-200 lg:border-l lg:pl-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Authority</p>
          <p className="mt-2 font-semibold text-slate-900">{curriculum.authority}</p>
          <p className="mt-1 text-sm text-slate-600">{curriculum.activeVersion}</p>
          {curriculum.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-800">Official source <ExternalLink className="h-3.5 w-3.5" /></a>)}
        </div>
      </section>

      {!visibleSubjects.length ? (
        <div className="border border-dashed border-slate-300 p-6 text-center">
          <BookOpen className="mx-auto h-5 w-5 text-slate-400" />
          <p className="mt-2 font-semibold text-slate-900">More curriculum-aligned resources are being added.</p>
          <p className="mt-1 text-sm text-slate-600">You can still browse general subject resources while this curriculum dataset grows.</p>
        </div>
      ) : null}
    </div>
  )
}
