'use client'

import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { findCurriculumResources, type LearnerCurriculumResource } from '@/lib/learner/curriculum-resources'
import { curriculumPath, getCurriculum, getCurriculumSubject, isSupportedCurriculumId } from '@/lib/learner/curriculum-registry'

function ResourceList({ title, resources }: { title: string; resources: LearnerCurriculumResource[] }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      {resources.length ? (
        <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
          {resources.map((resource) => (
            <article key={resource.id} className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-teal-700">{resource.type} · {resource.difficulty}</p>
                  <h3 className="mt-1 font-semibold text-slate-950">{resource.title}</h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{resource.summary}</p>
                  <p className="mt-2 text-xs text-slate-500">{resource.source} · verified {resource.lastVerified}</p>
                </div>
                <a href={resource.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-teal-800">Open <ExternalLink className="h-3.5 w-3.5" /></a>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="mt-3 border border-dashed border-slate-300 p-4 text-sm text-slate-600">More curriculum-aligned resources are being added.</p>}
    </section>
  )
}

export function SubjectResourceHub({ curriculumId, levelId, subjectId, topicId }: { curriculumId: string; levelId: string; subjectId: string; topicId?: string }) {
  if (!isSupportedCurriculumId(curriculumId.toUpperCase())) return <div className="p-8">Curriculum not found.</div>
  const curriculum = getCurriculum(curriculumId.toUpperCase())
  const subject = getCurriculumSubject(curriculum.id, subjectId)
  const level = curriculum.levels.find((item) => item.id === levelId)
  if (!subject || !level) return <div className="p-8">Subject or {curriculum.terminology.level.toLowerCase()} not found.</div>
  const topic = topicId ? subject.topics.find((item) => item.id === topicId) : undefined
  const resources = findCurriculumResources({ curriculumId: curriculum.id, levelId, subjectId: subject.id, subjectTitle: subject.title, canonicalArea: subject.canonicalArea, topicId })
  const topicLabel = curriculum.terminology.topic === 'Area of Study' ? 'Areas of Study' : `${curriculum.terminology.topic}s`

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-7 sm:px-6 lg:px-8">
      <Link href="/resources" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700"><ArrowLeft className="h-4 w-4" /> Resources</Link>
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-teal-700">{curriculum.shortName} · {level.label}</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{topic?.title || subject.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{curriculum.terminology.syllabus} · {curriculum.terminology.assessment} · {curriculum.terminology.examination}</p>
      </header>

      {!topicId ? (
        <section>
          <h2 className="text-xl font-semibold text-slate-950">{topicLabel}</h2>
          {subject.topics.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{subject.topics.map((item) => <Link key={item.id} href={curriculumPath(curriculum.id, level.id, subject.id, item.id)} className="border border-slate-200 p-4 font-semibold text-slate-900 hover:border-teal-600">{item.title}</Link>)}</div> : <p className="mt-3 border border-dashed border-slate-300 p-4 text-sm text-slate-600">Verified {curriculum.terminology.topic.toLowerCase()} data is not yet available for this subject. Official syllabus links and general subject resources remain available below.</p>}
        </section>
      ) : null}

      <ResourceList title="For your curriculum" resources={resources.aligned} />
      <ResourceList title="Additional resources" resources={resources.additional} />

      <aside className="border-t border-slate-200 pt-5 text-sm text-slate-600">
        <strong className="text-slate-900">Curriculum authority:</strong> {curriculum.authority}. {curriculum.gradingSummary}
      </aside>
    </div>
  )
}
