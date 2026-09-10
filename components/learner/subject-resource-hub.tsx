'use client'

import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { findCurriculumResources, type LearnerCurriculumResource } from '@/lib/learner/curriculum-resources'
import { curriculumPath, getCurriculum, getCurriculumSubject, isSupportedCurriculumId } from '@/lib/learner/curriculum-registry'

const trustLabel = (status: LearnerCurriculumResource['trustStatus']) => status === 'OFFICIAL' ? 'Official' : status === 'VERIFIED' ? 'Verified Resource' : 'General'

function ResourceList({ title, resources, context }: { title: string; resources: LearnerCurriculumResource[]; context: { curriculumId: string; curriculumLabel: string; levelId: string; levelLabel: string; subjectId: string; subjectLabel: string; topicId?: string; topicLabel?: string } }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      {resources.length ? (
        <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
          {resources.map((resource) => (
            <article key={resource.id} className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase"><span className={resource.trustStatus === 'OFFICIAL' ? 'text-teal-700' : resource.trustStatus === 'VERIFIED' ? 'text-blue-700' : 'text-slate-600'}>{trustLabel(resource.trustStatus)}</span><span className="text-slate-500">{resource.type} · {resource.difficulty}</span></div>
                  <h3 className="mt-1 font-semibold text-slate-950">{resource.title}</h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{resource.summary}</p>
                  <p className="mt-2 text-xs text-slate-500">{resource.source} · checked {resource.lastCheckedAt} · {resource.accessType === 'PUBLIC' ? 'Public access' : resource.accessType === 'PROVIDER_LOGIN' ? 'Provider login required' : 'Paid access'}</p>
                  <details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold text-slate-700">Why is this resource shown?</summary><p className="mt-1">{(() => {
                    const alignment = resource.alignments.find((item) => item.curriculumId === context.curriculumId && (!item.levelIds?.length || item.levelIds.includes(context.levelId)) && (!item.subjectIds?.length || item.subjectIds.includes(context.subjectId)) && (!item.topicIds?.length || Boolean(context.topicId && item.topicIds.includes(context.topicId))))
                    if (!alignment) return `General ${resource.canonicalAreas.join(', ')} resource matched to ${context.subjectLabel}; it is not curriculum-authoritative.`
                    const subjectMatch = alignment.subjectIds?.length ? context.subjectLabel : 'curriculum-wide guidance'
                    const topicMatch = alignment.topicIds?.length && context.topicLabel ? `, ${context.topicLabel}` : ''
                    return `Matched to ${context.curriculumLabel}, ${context.levelLabel}, ${subjectMatch}${topicMatch}. ${alignment.matchConfidence ? `${alignment.matchConfidence.toLowerCase()} alignment; ` : ''}${resource.trustStatus === 'OFFICIAL' ? 'published by the curriculum authority.' : 'reviewed supplementary content, not an official syllabus.'}`
                  })()}</p></details>
                </div>
                <a href={resource.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-teal-800">Open <ExternalLink className="h-3.5 w-3.5" /></a>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="mt-3 border border-dashed border-slate-300 p-4 text-sm text-slate-600">No resources are available in this group yet.</p>}
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
  if (topicId && !topic) return <div className="p-8">Topic not found.</div>
  const resources = findCurriculumResources({ curriculumId: curriculum.id, levelId, subjectId: subject.id, subjectTitle: subject.title, canonicalArea: subject.canonicalArea, topicId })
  const topicLabel = curriculum.terminology.topic === 'Area of Study' ? 'Areas of Study' : `${curriculum.terminology.topic}s`
  const allResources = [...resources.aligned, ...resources.additional]
  const grouped = {
    Official: allResources.filter((resource) => resource.trustStatus === 'OFFICIAL'),
    Learn: allResources.filter((resource) => resource.trustStatus !== 'OFFICIAL' && ['Curriculum / Syllabus', 'Study Notes', 'Topic Explanation', 'Video', 'Interactive Resource'].includes(resource.type)),
    Practise: allResources.filter((resource) => resource.trustStatus !== 'OFFICIAL' && ['Worked Examples', 'Practice Questions'].includes(resource.type)),
    'Exam preparation': allResources.filter((resource) => resource.trustStatus !== 'OFFICIAL' && ['Past Paper', 'Marking Guideline / Memorandum', 'Examiner Report', 'Specimen Paper', 'Formula / Data Sheet', 'Assessment Guidance', 'Revision Guide'].includes(resource.type))
  }
  const resourceContext = { curriculumId: curriculum.id, curriculumLabel: curriculum.shortName, levelId: level.id, levelLabel: level.label, subjectId: subject.id, subjectLabel: subject.title, topicId, topicLabel: topic?.title }

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

      {!grouped.Official.length ? <p className="border border-dashed border-slate-300 p-4 text-sm text-slate-600">No verified official resource found yet for this exact selection. Verified and general supplements are shown where available.</p> : null}
      {(Object.entries(grouped) as Array<[string, LearnerCurriculumResource[]]>).filter(([, items]) => items.length).map(([title, items]) => <ResourceList key={title} title={title} resources={items} context={resourceContext} />)}

      <aside className="border-t border-slate-200 pt-5 text-sm text-slate-600">
        <strong className="text-slate-900">Curriculum authority:</strong> {curriculum.authority}. {curriculum.gradingSummary}
      </aside>
    </div>
  )
}
