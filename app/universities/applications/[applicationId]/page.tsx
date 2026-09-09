'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, CalendarPlus, Check, ExternalLink, Plus, RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getInstitution, getProgramme } from '@/lib/universities/catalog'
import {
  APPLICANT_ROUTES,
  APPLICATION_STATUSES,
  addOffer,
  deadlinesForApplication,
  describeResultsTiming,
  formatDeadlineDate,
  matchResultsEvent,
  plannerPayloadForTask,
  syncDeadlineTasks
} from '@/lib/universities/application-domain'
import { ADMISSIONS_DEADLINES, CURRICULUM_RESULTS_EVENTS } from '@/lib/universities/fresh-data'
import { getLearnerProfile, type LearnerProfile } from '@/lib/learner/store'
import { universityStorage } from '@/lib/universities/storage'
import type {
  ApplicantRoute,
  ApplicationDocument,
  ApplicationStatus,
  ApplicationTask,
  OfferCondition,
  OfferConditionType,
  OfferType,
  UniversityApplication,
  UniversityOffer
} from '@/lib/universities/types'

const DOCUMENT_STATUSES: ApplicationDocument['status'][] = ['NOT_STARTED', 'REQUESTED', 'READY', 'UPLOADED', 'SUBMITTED', 'NOT_REQUIRED']
const OFFER_TYPES: OfferType[] = ['CONDITIONAL', 'UNCONDITIONAL', 'WAITLIST', 'PATHWAY', 'DEFERRED_ENTRY', 'OTHER']
const CONDITION_TYPES: OfferConditionType[] = ['OVERALL_SCORE', 'SUBJECT_SCORE', 'FINAL_TRANSCRIPT', 'ENGLISH_TEST', 'ADMISSION_TEST', 'PORTFOLIO', 'QUALIFICATION_COMPLETION', 'DEPOSIT', 'OTHER']
const RESULT_CURRICULA = ['IB', 'A_LEVEL', 'VCE', 'HSC', 'QCE', 'NSC', 'IEB', 'AP'] as const
interface OwnedUpload { id: string; filename: string }
const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'

export default function ApplicationDetailPage() {
  const params = useParams<{ applicationId: string }>()
  const { isGuest, settings, saveSettings } = useAuth()
  const [application, setApplication] = useState<UniversityApplication | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueAt, setTaskDueAt] = useState('')
  const [offerType, setOfferType] = useState<OfferType>('CONDITIONAL')
  const [offerConditionType, setOfferConditionType] = useState<OfferConditionType>('OVERALL_SCORE')
  const [offerCondition, setOfferCondition] = useState('')
  const [offerResponseDeadline, setOfferResponseDeadline] = useState('')
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile | null>(null)
  const [uploads, setUploads] = useState<OwnedUpload[]>([])
  const [plannerMessage, setPlannerMessage] = useState('')

  useEffect(() => {
    const applications = isGuest ? universityStorage.getApplications() : settings.universityApplications
    setApplication(applications.find((item) => item.id === params.applicationId) ?? null)
  }, [isGuest, params.applicationId, settings.universityApplications])

  useEffect(() => {
    setLearnerProfile(getLearnerProfile())
    if (isGuest) return
    void fetch('/api/app-state/documents?sort=newest&limit=1000', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => setUploads(Array.isArray(payload.documents) ? payload.documents.map((document: { id: string; filename: string }) => ({ id: document.id, filename: document.filename })) : []))
      .catch(() => setUploads([]))
  }, [isGuest])

  const persist = (next: UniversityApplication) => {
    const applications = isGuest ? universityStorage.getApplications() : settings.universityApplications
    const nextApplications = applications.map((item) => item.id === next.id ? next : item)
    if (isGuest) universityStorage.saveApplications(nextApplications)
    else void saveSettings({ universityApplications: nextApplications })
    setApplication(next)
  }

  const update = (updates: Partial<UniversityApplication>, timelineDescription?: string) => {
    if (!application) return
    const now = new Date().toISOString()
    persist({
      ...application,
      ...updates,
      timeline: timelineDescription ? [...application.timeline, { id: `event-${Date.now()}`, type: 'APPLICATION_UPDATED', occurredAt: now, description: timelineDescription }] : application.timeline,
      updatedAt: now
    })
  }

  const updateStatus = (status: ApplicationStatus) => update({ status, submittedAt: status === 'APPLIED' && !application?.submittedAt ? new Date().toISOString() : application?.submittedAt }, `Status changed to ${label(status)}.`)

  const addTask = (title = taskTitle, dueAt = taskDueAt || undefined, sourceDeadlineId?: string) => {
    if (!application || !title.trim()) return
    const now = new Date().toISOString()
    const task: ApplicationTask = { id: `task-${Date.now()}`, title: title.trim(), dueAt, completed: false, sourceDeadlineId, createdAt: now, updatedAt: now }
    update({ tasks: [...application.tasks, task] }, `Task added: ${task.title}.`)
    setTaskTitle('')
    setTaskDueAt('')
  }

  const updateTask = (taskId: string, updates: Partial<ApplicationTask>) => {
    if (!application) return
    update({ tasks: application.tasks.map((task) => task.id === taskId ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task) })
  }

  const addTaskToPlanner = async (task: ApplicationTask) => {
    if (!application) return
    if (isGuest) {
      setPlannerMessage('Sign in to add application tasks to Planner. Your application remains saved on this device.')
      return
    }
    setPlannerMessage('Adding task to Planner...')
    try {
      const response = await fetch('/api/app-state/planner-tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(plannerPayloadForTask(application, task)) })
      const result = await response.json()
      if (!response.ok || !result.taskId) throw new Error(result.error || 'Could not add task')
      updateTask(task.id, { plannerTaskId: result.taskId })
      setPlannerMessage('Task added to Planner.')
    } catch (error) {
      setPlannerMessage(error instanceof Error ? error.message : 'Could not add task to Planner.')
    }
  }

  const syncDeadlines = async () => {
    if (!application) return
    const deadlineMap = new Map(ADMISSIONS_DEADLINES.map((deadline) => [deadline.id, deadline]))
    const synced = syncDeadlineTasks(application, ADMISSIONS_DEADLINES)
    const changed = application.tasks.filter((task) => synced.changedTaskIds.includes(task.id))
    if (!isGuest) {
      await Promise.all(changed.filter((task) => task.plannerTaskId).map((task) => {
        const deadline = deadlineMap.get(task.sourceDeadlineId!)!
        return fetch('/api/app-state/planner-tasks', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taskId: task.plannerTaskId, plannedDate: deadline.dueAt, dueDate: deadline.dueAt }) })
      }))
    }
    persist(synced.application)
    setPlannerMessage(changed.length ? `University deadline updated. ${changed.length} linked task${changed.length === 1 ? '' : 's'} and Planner date${changed.length === 1 ? '' : 's'} changed.` : 'Deadline-linked tasks are current.')
  }

  const recordOffer = () => {
    if (!application) return
    const now = new Date().toISOString()
    const conditions: OfferCondition[] = offerCondition.trim() ? [{ id: `condition-${Date.now()}`, type: offerConditionType, description: offerCondition.trim() }] : []
    const offer: UniversityOffer = { id: `offer-${Date.now()}`, applicationId: application.id, offerType, receivedAt: now, responseDeadline: offerResponseDeadline || undefined, conditions, status: offerType === 'CONDITIONAL' ? 'AWAITING_RESULTS' : 'RECEIVED', notes: '' }
    persist(addOffer(application, offer))
    setOfferCondition('')
    setOfferResponseDeadline('')
  }

  if (!application) return <main className="mx-auto max-w-4xl px-4 py-10"><Card className="p-6"><h1 className="text-xl font-semibold text-slate-950">Application not found</h1><Link href="/universities/applications" className="mt-4 inline-flex text-sm font-medium text-sky-700">Return to Applications</Link></Card></main>

  const programme = getProgramme(application.programmeId)
  const institution = getInstitution(application.institutionId)
  if (!programme || !institution) return null
  const deadlines = deadlinesForApplication(application, ADMISSIONS_DEADLINES)
  const resultsContext = application.resultsContext ?? { curriculum: learnerProfile?.curriculum ?? 'IB', examSession: 'MAY', examYear: application.intakeYear }
  const resultsEvent = matchResultsEvent(resultsContext.curriculum, resultsContext.examSession, resultsContext.examYear, CURRICULUM_RESULTS_EVENTS)

  return <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/universities/applications" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Applications</Link>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase text-sky-700">{institution.name}</p><h1 className="mt-1 text-3xl font-semibold text-slate-950">{programme.name}</h1><p className="mt-2 text-slate-600">{institution.city}, {institution.country} • {application.intakeYear} intake</p></div><Link href={`/universities/${institution.id}/${programme.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">Programme details <ExternalLink className="h-4 w-4" /></Link></header>

    <Card className="p-5"><div className="grid gap-4 md:grid-cols-4"><label className="text-sm font-medium text-slate-700">Status<select value={application.status} onChange={(event) => updateStatus(event.target.value as ApplicationStatus)} className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3">{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Applicant route<select value={application.applicantRoute} onChange={(event) => update({ applicantRoute: event.target.value as ApplicantRoute }, `Applicant route changed to ${label(event.target.value)}.`)} className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3">{APPLICANT_ROUTES.map((route) => <option key={route} value={route}>{label(route)}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Intake year<input type="number" min="2026" max="2035" value={application.intakeYear} onChange={(event) => update({ intakeYear: Number(event.target.value) })} className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3" /></label><label className="text-sm font-medium text-slate-700">Application reference<input value={application.applicationReference ?? ''} onChange={(event) => update({ applicationReference: event.target.value })} className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3" placeholder="Optional" /></label></div></Card>

    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <section className="space-y-6">
        <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Admissions requirements</h2>{programme.requirements?.length ? <div className="mt-4 space-y-3">{programme.requirements.map((requirement) => <div key={`${requirement.curriculum}-${requirement.admissionsCycle ?? ''}`} className="border-l-2 border-sky-500 pl-3"><p className="text-sm font-semibold text-slate-900">{requirement.curriculum}{requirement.admissionsCycle ? ` • ${requirement.admissionsCycle}` : ''}</p><p className="mt-1 text-sm text-slate-600">{requirement.minimumOverall !== undefined ? `Published minimum overall: ${requirement.minimumOverall}.` : requirement.notes || 'Review the official requirement.'}</p><a href={requirement.officialRequirementsUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-sky-700">Official requirement</a></div>)}</div> : <p className="mt-3 text-sm text-slate-600">Current curriculum-specific requirements are not structured yet. Review the official programme page before applying.</p>}{programme.prerequisiteSubjects.length ? <p className="mt-4 text-sm text-slate-700"><strong>Subjects to check:</strong> {programme.prerequisiteSubjects.join(', ')}</p> : null}</Card>

        <Card className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Deadlines</h2><p className="text-sm text-slate-600">Only source-backed dates are shown in the source timezone.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => void syncDeadlines()}><RefreshCw className="mr-2 h-4 w-4" />Sync tasks</Button></div><div className="mt-4 space-y-3">{deadlines.length ? deadlines.map((deadline) => { const linked = application.tasks.some((task) => task.sourceDeadlineId === deadline.id); return <div key={deadline.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3"><div><p className="text-sm font-semibold text-slate-900">{label(deadline.deadlineType)}</p><p className="text-sm text-slate-600">{formatDeadlineDate(deadline)} • {deadline.description}</p><a href={deadline.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-sky-700">Official source</a></div><Button type="button" size="sm" variant="secondary" disabled={linked} onClick={() => addTask(`Prepare for ${label(deadline.deadlineType)}`, deadline.dueAt, deadline.id)}><CalendarPlus className="mr-2 h-4 w-4" />{linked ? 'Linked' : 'Create task'}</Button></div> }) : <p className="mt-4 text-sm text-slate-600">No verified deadline is available for this institution, intake and route yet. Check the official application page before acting.</p>}</div></Card>

        <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Documents</h2><p className="mt-1 text-sm text-slate-600">Link account-owned uploads without copying private files into a separate store.</p><div className="mt-4 space-y-3">{application.documents.map((document) => <div key={document.id} className="grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-[1fr_180px]"><div><p className="text-sm font-medium text-slate-900">{document.label}{document.required ? ' *' : ''}</p><select value={document.uploadId ?? ''} disabled={isGuest} onChange={(event) => update({ documents: application.documents.map((item) => item.id === document.id ? { ...item, uploadId: event.target.value || undefined, status: event.target.value ? 'UPLOADED' : item.status } : item) })} className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">{isGuest ? 'Sign in to link a private upload' : 'No linked upload'}</option>{uploads.map((upload) => <option key={upload.id} value={upload.id}>{upload.filename}</option>)}</select></div><select aria-label={`${document.label} status`} value={document.status} onChange={(event) => update({ documents: application.documents.map((item) => item.id === document.id ? { ...item, status: event.target.value as ApplicationDocument['status'] } : item) })} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">{DOCUMENT_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div>)}</div><Link href="/uploads" className="mt-4 inline-flex text-sm font-medium text-sky-700">Open private uploads</Link></Card>

        <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Results &amp; grades</h2><p className="mt-1 text-sm text-slate-600">Link this application to the exact curriculum session and year. Grades remain in your canonical academic profile.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-sm font-medium text-slate-700">Curriculum<select value={resultsContext.curriculum} onChange={(event) => update({ resultsContext: { ...resultsContext, curriculum: event.target.value as typeof resultsContext.curriculum } })} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3">{RESULT_CURRICULA.map((curriculum) => <option key={curriculum} value={curriculum}>{label(curriculum)}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Exam session<select value={resultsContext.examSession} onChange={(event) => update({ resultsContext: { ...resultsContext, examSession: event.target.value } })} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"><option value="MAY">May</option><option value="NOVEMBER">November</option><option value="OTHER">Other</option></select></label><label className="text-sm font-medium text-slate-700">Exam year<input type="number" min="2025" max="2035" value={resultsContext.examYear} onChange={(event) => update({ resultsContext: { ...resultsContext, examYear: Number(event.target.value) } })} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3" /></label></div><div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">{describeResultsTiming(resultsEvent)}</p>{resultsEvent ? <p className="mt-1 text-sm text-slate-600">Expected {formatDate(resultsEvent.dateTime)} from the <a href={resultsEvent.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-sky-700">official curriculum source</a>.</p> : <p className="mt-1 text-sm text-slate-600">No date is shown because no exact official event matches {label(resultsContext.curriculum)} {label(resultsContext.examSession)} {resultsContext.examYear}.</p>}</div>{learnerProfile ? <div className="mt-4 text-sm text-slate-700"><p><strong>Predicted overall:</strong> {learnerProfile.universityPlanning.predictedOverall ?? 'Not recorded'}</p><p className="mt-1"><strong>Subject profile:</strong> {learnerProfile.subjects.length ? learnerProfile.subjects.map((subject) => `${subject.name} ${subject.level || ''}: predicted ${subject.predictedGrade || 'not recorded'}, current ${subject.currentGrade || 'not recorded'}, target ${subject.targetGrade || 'not recorded'}`).join(' • ') : 'No subjects recorded'}</p><Link href="/school" className="mt-3 inline-flex font-medium text-sky-700">Review academic profile</Link></div> : null}</Card>

        <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Tasks</h2><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]"><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} className="h-10 rounded-md border border-slate-300 px-3 text-sm" placeholder="Next application action" /><input type="date" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} className="h-10 rounded-md border border-slate-300 px-3 text-sm" /><Button type="button" size="sm" onClick={() => addTask()}><Plus className="mr-2 h-4 w-4" />Add</Button></div>{plannerMessage ? <p className="mt-3 text-sm text-slate-600">{plannerMessage}</p> : null}<div className="mt-4 space-y-2">{application.tasks.map((task) => <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3"><label className="flex items-center gap-3 text-sm text-slate-900"><input type="checkbox" checked={task.completed} onChange={(event) => updateTask(task.id, { completed: event.target.checked })} />{task.title}{task.dueAt ? <span className="text-slate-500">{formatDate(task.dueAt)}</span> : null}</label>{task.plannerTaskId ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><Check className="h-3.5 w-3.5" />In Planner</span> : <Button type="button" variant="secondary" size="sm" onClick={() => void addTaskToPlanner(task)}>Add to Planner</Button>}</div>)}</div></Card>
      </section>

      <aside className="space-y-6">
        <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Offers</h2><p className="mt-1 text-sm text-slate-600">Record the offer wording exactly. MuksBooks does not infer admission certainty.</p><div className="mt-4 space-y-3"><label className="block text-sm font-medium text-slate-700">Offer type<select value={offerType} onChange={(event) => setOfferType(event.target.value as OfferType)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{OFFER_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">Condition type<select value={offerConditionType} onChange={(event) => setOfferConditionType(event.target.value as OfferConditionType)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{CONDITION_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label><textarea value={offerCondition} onChange={(event) => setOfferCondition(event.target.value)} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Condition exactly as stated (optional)" /><label className="block text-sm font-medium text-slate-700">Response deadline<input type="date" value={offerResponseDeadline} onChange={(event) => setOfferResponseDeadline(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label><Button type="button" onClick={recordOffer}>Record offer</Button></div><div className="mt-5 space-y-3">{application.offers.map((offer) => <div key={offer.id} className="border-t border-slate-200 pt-3"><p className="text-sm font-semibold text-slate-900">{label(offer.offerType)} offer</p><p className="text-xs text-slate-500">Received {formatDate(offer.receivedAt)} • {label(offer.status)}{offer.responseDeadline ? ` • Respond by ${formatDate(offer.responseDeadline)}` : ''}</p>{offer.conditions.map((condition) => <p key={condition.id} className="mt-2 text-sm text-slate-700"><span className="font-medium">{label(condition.type)}:</span> {condition.description}</p>)}</div>)}</div></Card>

        <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Application portal</h2><label className="mt-3 block text-sm font-medium text-slate-700">Method<input value={application.applicationMethod ?? ''} onChange={(event) => update({ applicationMethod: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" placeholder="UCAS, direct, Common App..." /></label><label className="mt-3 block text-sm font-medium text-slate-700">Official portal URL<input type="url" value={application.applicationPortalUrl ?? ''} onChange={(event) => update({ applicationPortalUrl: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" placeholder="https://" /></label>{application.applicationPortalUrl ? <a href={application.applicationPortalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-sky-700">Open official portal <ExternalLink className="h-4 w-4" /></a> : null}</Card>

        <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Notes</h2><textarea value={application.notes} onChange={(event) => update({ notes: event.target.value })} rows={5} className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Questions, decisions, interview details..." /></Card>

        <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Timeline</h2><div className="mt-4 space-y-4">{[...application.timeline].reverse().map((event) => <div key={event.id} className="border-l-2 border-sky-200 pl-3"><p className="text-sm text-slate-900">{event.description}</p><p className="text-xs text-slate-500">{formatDate(event.occurredAt)}</p></div>)}</div></Card>
      </aside>
    </div>
  </main>
}
