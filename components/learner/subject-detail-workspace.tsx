'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink, FileUp, Save } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useCurriculum } from '@/components/learner/curriculum-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { learnerSubjectContainer } from '@/lib/academic-context'
import { getCurriculumSubject } from '@/lib/learner/curriculum-registry'
import { buildLearnerResourceContexts, personalisedResourcesForContext, type SubjectTopicProposal } from '@/lib/learner/subject-context'
import type { ConfirmedSubjectTopic, LearnerSubject } from '@/lib/learner/store'

type Tab = 'Overview' | 'Topics' | 'Resources' | 'Assessments' | 'Uploads'
type SubjectUpload = { id: string; filename: string; document_type?: string | null; upload_date?: string | null; processing_status?: string | null }

export function SubjectDetailWorkspace({ subjectId }: { subjectId: string }) {
  const { profile, saveProfile, isProfileLoading } = useCurriculum()
  const { user, settings } = useAuth()
  const subject = profile.subjects.find((item) => item.id === subjectId && item.active !== false)
  const [tab, setTab] = useState<Tab>('Overview')
  const [draft, setDraft] = useState<LearnerSubject | null>(subject || null)
  const [uploads, setUploads] = useState<SubjectUpload[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [proposals, setProposals] = useState<Array<SubjectTopicProposal & { selected: boolean }>>([])
  const [source, setSource] = useState<{ documentId: string; fileName: string } | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => setDraft(subject || null), [subject])
  useEffect(() => {
    if (!user || !subjectId) return
    fetch(`/api/app-state/documents?subjectId=${encodeURIComponent(subjectId)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => setUploads(Array.isArray(payload?.documents) ? payload.documents : []))
      .catch(() => setUploads([]))
  }, [subjectId, user])

  const catalogueSubject = subject?.curriculumSubjectCode
    ? getCurriculumSubject(subject.curriculumId || profile.curriculum, subject.curriculumSubjectCode)
    : undefined
  const resourceContext = useMemo(() => subject
    ? buildLearnerResourceContexts({ ...profile, subjects: [subject] }, settings.academicInterests || [])[0]
    : undefined, [profile, settings.academicInterests, subject])
  const resources = useMemo(() => resourceContext ? personalisedResourcesForContext(resourceContext).slice(0, 12) : [], [resourceContext])
  const assessments = subject ? profile.assessments.filter((item) => item.subjectId === subject.id || item.subject === subject.name) : []

  if (isProfileLoading) return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">Loading subject...</main>
  if (!subject || !draft) return <main className="mx-auto max-w-6xl px-4 py-8"><Link href="/school" className="text-sm font-semibold text-sky-700">Back to School</Link><p className="mt-6 text-slate-700">This subject is not in your active academic profile.</p></main>

  const saveDetails = async () => {
    setStatus('Saving...')
    await saveProfile({ subjects: profile.subjects.map((item) => item.id === subject.id ? draft : item) })
    setStatus('Subject saved.')
  }

  const upload = async () => {
    if (!file || !user) return
    setStatus('Uploading and analysing...')
    const form = new FormData()
    form.set('subjectId', subject.id)
    form.set('file', file)
    const response = await fetch('/api/learner/subjects/upload', { method: 'POST', body: form })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setStatus(payload?.error || 'Upload failed.')
      return
    }
    setSource(payload.upload)
    setProposals((payload.proposals || []).map((proposal: SubjectTopicProposal) => ({ ...proposal, selected: proposal.confidence === 'HIGH' })))
    setUploads((current) => [{ id: payload.upload.documentId, filename: payload.upload.fileName, document_type: 'School subject material', processing_status: 'tutor_ready', upload_date: new Date().toISOString() }, ...current.filter((item) => item.id !== payload.upload.documentId)])
    setFile(null)
    setStatus(payload.proposals?.length ? 'Review the proposed topics before confirming.' : 'Upload saved. No confident topic matches were found.')
  }

  const confirmTopics = async () => {
    if (!source) return
    const confirmedAt = new Date().toISOString()
    const additions: ConfirmedSubjectTopic[] = proposals.filter((proposal) => proposal.selected && proposal.title.trim()).map((proposal) => ({
      id: `${source.documentId}-${proposal.id}`,
      title: proposal.title.trim(),
      officialTopicId: proposal.officialTopicId,
      sourceDocumentId: source.documentId,
      sourceFileName: source.fileName,
      confirmedAt,
      provenance: 'LEARNER_UPLOAD'
    }))
    const retained = (subject.confirmedTopics || []).filter((topic) => topic.sourceDocumentId !== source.documentId)
    await saveProfile({ subjects: profile.subjects.map((item) => item.id === subject.id ? { ...item, confirmedTopics: [...retained, ...additions] } : item) })
    setProposals([])
    setSource(null)
    setStatus(`${additions.length} topic${additions.length === 1 ? '' : 's'} confirmed.`)
  }

  const openUpload = async (documentId: string) => {
    const response = await fetch(`/api/app-state/documents/signed-url?documentId=${encodeURIComponent(documentId)}`)
    const payload = await response.json().catch(() => null)
    if (response.ok && payload?.url) window.open(payload.url, '_blank', 'noopener,noreferrer')
    else setStatus(payload?.error || 'This file could not be opened.')
  }

  const container = learnerSubjectContainer(profile, subject)
  return <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
    <Link href="/school" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"><ArrowLeft className="h-4 w-4" />School</Link>
    <header className="border-b border-slate-200 pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">{profile.curriculumLabel} · {subject.level || 'Level not set'}</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950">{subject.name}</h1>
      <p className="mt-2 text-sm text-slate-600">Subject ID: {container.id}</p>
    </header>
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Subject sections">
      {(['Overview', 'Topics', 'Resources', 'Assessments', 'Uploads'] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${tab === item ? 'border-sky-700 text-sky-800' : 'border-transparent text-slate-600'}`}>{item}</button>)}
    </nav>

    {tab === 'Overview' ? <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-950">Subject details</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700">Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm text-slate-700">Teacher<input value={draft.teacher || ''} onChange={(event) => setDraft({ ...draft, teacher: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm text-slate-700">Current grade<input value={draft.currentGrade || ''} onChange={(event) => setDraft({ ...draft, currentGrade: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm text-slate-700">Target grade<input value={draft.targetGrade || ''} onChange={(event) => setDraft({ ...draft, targetGrade: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm text-slate-700 sm:col-span-2">Notes<textarea value={draft.notes || ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      </div>
      <Button type="button" onClick={() => void saveDetails()} className="mt-4"><Save className="mr-2 h-4 w-4" />Save details</Button>
    </Card> : null}

    {tab === 'Topics' ? <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Confirmed school topics</h2><p className="mt-1 text-sm text-slate-600">These are your school-specific topics. Official curriculum topics remain unchanged.</p><div className="mt-4 divide-y divide-slate-200">{(subject.confirmedTopics || []).map((topic) => <div key={topic.id} className="py-3"><p className="font-medium text-slate-900">{topic.title}</p><p className="mt-1 text-xs text-slate-500">Confirmed from {topic.sourceFileName} · {new Date(topic.confirmedAt).toLocaleDateString()}</p></div>)}{!subject.confirmedTopics?.length ? <p className="py-4 text-sm text-slate-600">No uploaded topics have been confirmed yet.</p> : null}</div>{catalogueSubject ? <p className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500">Official {catalogueSubject.title} topics are reference data and are not edited by this page.</p> : null}</Card> : null}

    {tab === 'Resources' ? <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Resources for {subject.name}</h2><p className="mt-1 text-sm text-slate-600">Exact curriculum, subject and level matches are ranked first, followed by confirmed current topics.</p><div className="mt-4 divide-y divide-slate-200">{resources.map(({ resource }) => <article key={resource.id} className="flex items-start justify-between gap-4 py-3"><div><p className="text-xs font-semibold uppercase text-teal-700">{resource.trustStatus} · {resource.type}</p><p className="mt-1 font-semibold text-slate-950">{resource.title}</p><p className="mt-1 text-sm text-slate-600">{resource.summary}</p></div><a href={resource.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open ${resource.title}`} className="shrink-0 p-2 text-teal-800"><ExternalLink className="h-4 w-4" /></a></article>)}{!resources.length ? <p className="py-4 text-sm text-slate-600">No exact resources yet. Manual subjects receive general matches when the catalogue recognises the subject name.</p> : null}</div></Card> : null}

    {tab === 'Assessments' ? <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Assessments</h2><div className="mt-4 divide-y divide-slate-200">{assessments.map((assessment) => <div key={assessment.id} className="py-3"><p className="font-medium text-slate-900">{assessment.title}</p><p className="mt-1 text-sm text-slate-600">{assessment.type} · {assessment.dueDate || 'No due date'} · {assessment.status}</p></div>)}{!assessments.length ? <p className="py-4 text-sm text-slate-600">No assessments linked to this subject.</p> : null}</div></Card> : null}

    {tab === 'Uploads' ? <div className="space-y-5"><Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Upload subject material</h2><p className="mt-1 text-sm text-slate-600">Upload an outline, syllabus, term plan or teacher topic list. MuksBooks will propose topics for your review.</p>{user ? <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"><input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} className="min-w-0 flex-1 text-sm" /><Button type="button" onClick={() => void upload()} disabled={!file}><FileUp className="mr-2 h-4 w-4" />Upload and analyse</Button></div> : <p className="mt-4 text-sm font-medium text-amber-800">Sign in to store subject files securely.</p>}
      {proposals.length ? <div className="mt-5 border-t border-slate-200 pt-4"><h3 className="font-semibold text-slate-950">Review proposed topics</h3><p className="mt-1 text-sm text-slate-600">Edit labels and select only topics that belong in your school plan.</p><div className="mt-3 space-y-2">{proposals.map((proposal, index) => <label key={proposal.id} className="flex items-start gap-3 border border-slate-200 p-3"><input type="checkbox" checked={proposal.selected} onChange={(event) => setProposals((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, selected: event.target.checked } : item))} className="mt-2" /><span className="min-w-0 flex-1"><input value={proposal.title} onChange={(event) => setProposals((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" /><span className="mt-1 block text-xs text-slate-500">{proposal.confidence} confidence · matched “{proposal.evidence}”</span></span></label>)}</div><div className="mt-3 flex gap-2"><Button type="button" onClick={() => void confirmTopics()}>Confirm selected</Button><Button type="button" variant="outline" onClick={() => { setProposals([]); setSource(null); setStatus('Suggestions discarded. The upload remains available.') }}>Discard suggestions</Button></div></div> : null}</Card>
      <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Subject uploads</h2><div className="mt-3 divide-y divide-slate-200">{uploads.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium text-slate-900">{item.filename}</p><p className="text-xs text-slate-500">{item.document_type || 'Subject material'} · {item.processing_status || 'uploaded'}</p></div><button type="button" onClick={() => void openUpload(item.id)} aria-label={`Open ${item.filename}`} className="p-2 text-sky-700"><ExternalLink className="h-4 w-4" /></button></div>)}{!uploads.length ? <p className="py-4 text-sm text-slate-600">No files uploaded for this subject.</p> : null}</div></Card></div> : null}
    {status ? <p role="status" className="text-sm text-slate-600">{status}</p> : null}
  </main>
}