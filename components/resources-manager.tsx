'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import katex from 'katex'
import {
  ArrowUpRight, Bookmark, BookOpen, Calculator, Check, ChevronRight, FlaskConical,
  GraduationCap, Library, Loader2, RefreshCw, Search, ShieldCheck, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { StochasticProcessesLab } from '@/components/resources/stochastic-processes-lab'
import { ACTUARIAL_RESOURCES, PROFESSIONAL_SUBJECTS, relevanceScore, type ActuarialResource, type ResourceKind } from '@/lib/resources/catalog'
import {
  DISTRIBUTIONS, defaultParameters, distributionMetricPoints, distributionQuantile,
  distributionPlotYMax, distributionSummary, intervalProbability, normalizeParameters,
  simulateDistribution, type DistributionId, type DistributionMetric
} from '@/lib/resources/distributions'
import {
  calculateExemptionEstimate,
  type ExemptionRuleSnapshot,
  type UnitResultInput
} from '@/lib/resources/exemption-calculator'
import type { DeepResearchBrief } from '@/lib/resources/research-types'

interface DashboardData {
  currentWeek?: { label: string; weekNumber?: number | null; phase: string } | null
  currentTopics?: Array<{ id: string; name?: string | null; course_code?: string | null }>
  weakTopics?: Array<{ id: string; name?: string | null; course_code?: string | null }>
  upcomingAssessments?: Array<{ id: string; name: string; course_code?: string | null; due_date?: string | null }>
  activeCourses?: Array<{ id: string; course_code: string; course_name?: string | null }>
  recentResources?: Array<{ id: string; filename: string; document_type?: string | null; course_code?: string | null; created_at: string }>
}

interface SavedResource {
  resource_id: string
}

const resourceKinds: Array<'All' | ResourceKind> = ['All', 'Deep Dive', 'Textbook', 'Paper', 'Professional', 'Regulatory']

function compactNumber(value: number | null) {
  if (value === null) return 'Not defined'
  if (!Number.isFinite(value)) return 'Not defined'
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) return value.toExponential(3)
  return Number(value.toFixed(4)).toString()
}

function MathFormula({ value, className = '' }: { value: string; className?: string }) {
  const markup = useMemo(() => katex.renderToString(value, { throwOnError: false, strict: false }), [value])
  return <span className={className} dangerouslySetInnerHTML={{ __html: markup }} />
}

function DistributionChart({ points, discrete, comparison = [], fixedYMax }: { points: Array<{ x: number; y: number }>; discrete: boolean; comparison?: Array<{ x: number; y: number }>; fixedYMax?: number }) {
  const width = 720
  const height = 280
  const padding = 32
  const allPoints = [...points, ...comparison]
  const maxY = Math.max(fixedYMax || 0, ...allPoints.map((point) => point.y), 0.001)
  const minX = Math.min(...allPoints.map((point) => point.x))
  const maxX = Math.max(...allPoints.map((point) => point.x))
  const xScale = (value: number) => padding + (value - minX) / Math.max(maxX - minX, 1) * (width - padding * 2)
  const yScale = (value: number) => height - padding - value / maxY * (height - padding * 2)
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${xScale(point.x)} ${yScale(point.y)}`).join(' ')
  const comparisonPath = comparison.map((point, index) => `${index ? 'L' : 'M'} ${xScale(point.x)} ${yScale(point.y)}`).join(' ')

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Probability distribution plot" className="block h-auto w-full">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#cbd5e1" />
        {discrete ? points.map((point) => (
          <g key={point.x}>
            <line x1={xScale(point.x)} x2={xScale(point.x)} y1={height - padding} y2={yScale(point.y)} stroke="#0f766e" strokeWidth="4" />
            <circle cx={xScale(point.x)} cy={yScale(point.y)} r="4" fill="#0f766e" />
          </g>
        )) : (
          <>
            <path d={`${path} L ${xScale(maxX)} ${height - padding} L ${xScale(minX)} ${height - padding} Z`} fill="#ccfbf1" />
            <path d={path} fill="none" stroke="#0f766e" strokeWidth="4" strokeLinejoin="round" />
          </>
        )}
        {!!comparison.length && <path d={comparisonPath} fill="none" stroke="#fbbf24" strokeWidth="3" strokeDasharray="8 6" strokeLinejoin="round" />}
        <text x={padding} y={height - 8} fontSize="12" fill="#64748b">{compactNumber(minX)}</text>
        <text x={width - padding} y={height - 8} textAnchor="end" fontSize="12" fill="#64748b">{compactNumber(maxX)}</text>
        <text x={padding + 4} y={padding - 8} fontSize="12" fill="#64748b">{compactNumber(maxY)}</text>
      </svg>
    </div>
  )
}

function ResourceCard({ resource, saved, unit, onSave }: { resource: ActuarialResource; saved: boolean; unit?: string; onSave: (resource: ActuarialResource) => void }) {
  const tutorQuery = new URLSearchParams({
    topic: resource.topics[0] || resource.title,
    mode: 'explain',
    prompt: `Teach me ${resource.title} step by step. Start with intuition, then formal mathematics, actuarial applications and common mistakes. Use my uploaded material where relevant.`
  })
  if (unit && unit !== 'All') tutorQuery.set('unit', unit)
  return (
    <article className="flex h-full flex-col border-t border-slate-200 py-5 first:border-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2 text-xs font-semibold uppercase text-slate-500">
            <span>{resource.kind}</span><span aria-hidden="true">/</span><span>{resource.difficulty}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-950">{resource.title}</h3>
        </div>
        <button onClick={() => onSave(resource)} className="grid size-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100" title={saved ? 'Remove bookmark' : 'Save resource'} aria-label={saved ? 'Remove bookmark' : 'Save resource'}>
          {saved ? <Check size={17} /> : <Bookmark size={17} />}
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{resource.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {resource.professionalSubjects.map((subject) => <span key={subject} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{subject}</span>)}
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{resource.access}</span>
      </div>
      <div className="mt-auto flex items-end justify-between gap-4 pt-5 text-xs text-slate-500">
        <div><p className="font-semibold text-slate-700">{resource.sourceName}</p><p>{resource.sourceClass} source / {resource.confidence} confidence</p><p>Catalogue reviewed 18 August 2026</p></div>
        <div className="flex flex-col items-end gap-2"><Link href={`/ai-tutor?${tutorQuery.toString()}`} className="font-semibold text-slate-700 hover:text-teal-900">Ask Tutor</Link><a href={resource.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:text-teal-950">Open source <ArrowUpRight size={14} /></a></div>
      </div>
    </article>
  )
}

function DeepResearchPanel({ selectedUnit }: { selectedUnit: string }) {
  const [research, setResearch] = useState<DeepResearchBrief | null>(null)
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    const query = new URLSearchParams()
    if (selectedUnit !== 'All') query.set('unit', selectedUnit)
    if (requestVersion) query.set('force', 'true')
    fetch(`/api/resources/research?${query.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.ok) throw new Error(payload?.error || 'Deep Research could not be completed.')
        setResearch(payload.research || null)
        setReason(payload.reason || '')
        setStatus('ready')
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setReason(error instanceof Error ? error.message : 'Deep Research could not be completed.')
        setStatus('error')
      })
    return () => controller.abort()
  }, [requestVersion, selectedUnit])

  const tutorQuery = new URLSearchParams({
    topic: research?.displayTopic || '',
    mode: 'explain',
    prompt: `Teach me ${research?.displayTopic || 'this topic'} using the Deep Research evidence. Check my understanding with an actuarial application and do not assume unsupported facts.`
  })
  if (selectedUnit !== 'All') tutorQuery.set('unit', selectedUnit)

  return (
    <section aria-labelledby="deep-research-title" className="border-y border-slate-200 bg-slate-50 px-5 py-7 sm:px-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex items-center gap-2 text-sm font-semibold text-teal-700"><Sparkles size={17} /> Automatic Deep Research</div><h2 id="deep-research-title" className="mt-1 text-2xl font-semibold text-slate-950">{research?.displayTopic || 'Building this week’s evidence brief'}</h2>{research && <p className="mt-2 text-xs text-slate-500">{research.cached ? 'Reused verified cache' : 'Freshly researched'} · {research.generationMode === 'ai-synthesis' ? 'AI synthesis constrained to retrieved evidence' : 'Retrieved evidence only; no AI synthesis'} · {new Date(research.researchedAt).toLocaleString()}</p>}</div>
        <button onClick={() => setRequestVersion((value) => value + 1)} disabled={status === 'loading'} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-50" title="Revalidate sources and rebuild research"><RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} /> Refresh research</button>
      </div>
      {status === 'loading' ? <div className="flex min-h-40 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} /> Retrieving schedule, uploads and authoritative sources</div> : !research ? <div className={`mt-5 border-l-4 p-4 text-sm ${status === 'error' ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-slate-300 bg-white text-slate-600'}`}>{reason}</div> : (
        <div className="mt-6 grid gap-7 lg:grid-cols-[1.35fr_0.65fr]">
          <div><p className="text-sm leading-7 text-slate-700">{research.overview}</p>{research.keyIdeas.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold uppercase text-slate-500">Key ideas</h3><ul className="mt-3 space-y-3">{research.keyIdeas.map((idea, index) => <li key={index} className="border-l-2 border-teal-600 pl-3 text-sm leading-6 text-slate-700">{idea}</li>)}</ul></div>}{research.actuarialApplications.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold uppercase text-slate-500">Actuarial applications</h3><ul className="mt-3 grid gap-2 sm:grid-cols-2">{research.actuarialApplications.map((application, index) => <li key={index} className="bg-white p-3 text-sm leading-6 text-slate-700">{application}</li>)}</ul></div>}</div>
          <aside className="space-y-5 lg:border-l lg:border-slate-200 lg:pl-6"><div><h3 className="text-sm font-semibold text-slate-950">Validated sources</h3><div className="mt-2 divide-y divide-slate-200">{research.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 py-3 text-sm text-slate-700 hover:text-teal-800"><span><strong className="block font-semibold">{source.name}</strong><span className="text-xs text-slate-500">{source.sourceClass} · checked {new Date(source.validatedAt).toLocaleDateString()}</span></span><ArrowUpRight className="mt-0.5 shrink-0" size={15} /></a>)}</div>{!research.sources.length && <p className="mt-2 text-xs text-amber-700">No registry source passed live URL and content validation.</p>}</div><div><h3 className="text-sm font-semibold text-slate-950">Your material</h3><p className="mt-2 text-sm text-slate-600">{research.uploadEvidence.length ? `${research.uploadEvidence.length} relevant upload excerpt${research.uploadEvidence.length === 1 ? '' : 's'} grounded this brief.` : 'No relevant uploaded excerpt was retrieved for this topic.'}</p>{research.uploadEvidence.slice(0, 3).map((upload, index) => <p key={index} className="mt-2 truncate text-xs text-slate-500">{upload.section}</p>)}</div>{research.studyQuestions.length > 0 && <div><h3 className="text-sm font-semibold text-slate-950">Questions to test next</h3><ol className="mt-2 space-y-2 text-sm leading-6 text-slate-600">{research.studyQuestions.slice(0, 3).map((question, index) => <li key={index}>{index + 1}. {question}</li>)}</ol></div>}<Link href={`/ai-tutor?${tutorQuery.toString()}`} className="inline-flex items-center gap-2 font-semibold text-teal-800">Continue with Tutor <ChevronRight size={16} /></Link></aside>
        </div>
      )}
    </section>
  )
}

interface StoredUnitResult {
  unit_code: string
  mark: number | null
  is_hypothetical: boolean
}

function ExemptionPlanner() {
  const { user, requireAuth } = useAuth()
  const [snapshot, setSnapshot] = useState<ExemptionRuleSnapshot | null>(null)
  const [courseLevel, setCourseLevel] = useState<'undergraduate' | 'postgraduate'>('undergraduate')
  const [subjectCode, setSubjectCode] = useState('CS1')
  const [results, setResults] = useState<Record<string, { mark: number | ''; hypothetical: boolean }>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/resources/exemptions', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.ok || !payload.snapshot) return
        setSnapshot(payload.snapshot as ExemptionRuleSnapshot)
        const stored = (payload.results || []) as StoredUnitResult[]
        setResults(Object.fromEntries(stored.map((result) => [result.unit_code, {
          mark: result.mark === null ? '' : Number(result.mark),
          hypothetical: result.is_hypothetical
        }])))
      })
      .catch(() => setSnapshot(null))
  }, [user?.id])

  const subjects = useMemo(() => (snapshot?.rules || []).filter((rule) => rule.courseLevel === courseLevel), [courseLevel, snapshot])
  const selectedRule = subjects.find((rule) => rule.code === subjectCode) || subjects[0]
  const unitRequirements = useMemo(() => {
    if (!selectedRule) return []
    const requirements = new Map<string, { key: string; label: string; weight: number; alternatives: string[] }>()
    for (const pathway of selectedRule.pathways) {
      for (const [index, requirement] of pathway.requirements.entries()) {
        const key = `${pathway.id}:${requirement.unitCodes.join('/') || requirement.label || index}`
        requirements.set(key, {
          key,
          label: requirement.label || requirement.unitCodes.join(' or '),
          weight: requirement.weight,
          alternatives: requirement.unitCodes
        })
      }
    }
    return Array.from(requirements.values())
  }, [selectedRule])
  const unitResults = useMemo<UnitResultInput[]>(() => Object.entries(results).map(([unitCode, result]) => ({
    unitCode,
    mark: result.mark === '' ? null : result.mark,
    hypothetical: result.hypothetical
  })), [results])
  const calculation = selectedRule && snapshot ? calculateExemptionEstimate(selectedRule, unitResults, snapshot) : null

  const updateResult = (unitCode: string, patch: Partial<{ mark: number | ''; hypothetical: boolean }>) => {
    setSaveState('idle')
    setResults((current) => {
      const existing = current[unitCode] || { mark: '', hypothetical: true }
      return {
        ...current,
        [unitCode]: {
          mark: patch.mark !== undefined ? patch.mark : existing.mark,
          hypothetical: patch.hypothetical !== undefined ? patch.hypothetical : existing.hypothetical
        }
      }
    })
  }

  const changeAlternative = (currentCode: string, nextCode: string) => {
    setSaveState('idle')
    setResults((current) => {
      const next = { ...current }
      next[nextCode] = next[currentCode] || { mark: '', hypothetical: true }
      if (nextCode !== currentCode) delete next[currentCode]
      return next
    })
  }

  const saveResults = async () => {
    if (requireAuth('Sign in to save exemption results across devices.', '/resources')) return
    setSaveState('saving')
    const response = await fetch('/api/resources/exemptions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: unitResults.filter((result) => result.mark !== null && /^[A-Z]{3}\d{4}$/.test(result.unitCode)) })
    }).catch(() => null)
    setSaveState(response?.ok ? 'saved' : 'error')
  }

  if (!snapshot || !selectedRule) {
    return <div className="flex min-h-40 items-center justify-center border-y border-slate-200 text-sm text-slate-500"><Loader2 className="mr-2 animate-spin" size={17} /> Loading verified Monash rules</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-y border-slate-200 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <label className="text-sm font-medium text-slate-700">Course level<select value={courseLevel} onChange={(event) => { setCourseLevel(event.target.value as 'undergraduate' | 'postgraduate'); setSubjectCode('CS1') }} className="mt-1 block h-10 rounded-md border border-slate-300 bg-white px-3"><option value="undergraduate">Undergraduate</option><option value="postgraduate">Master / Honours</option></select></label>
          <label className="text-sm font-medium text-slate-700">Professional subject<select value={selectedRule.code} onChange={(event) => setSubjectCode(event.target.value)} className="mt-1 block h-10 rounded-md border border-slate-300 bg-white px-3">{subjects.map((subject) => <option key={subject.code} value={subject.code}>{subject.code} · {subject.title}</option>)}</select></label>
        </div>
        <div className="text-xs text-slate-500 sm:text-right"><p className="font-semibold text-teal-800">Official snapshot verified</p><p>Version {snapshot.version} · source dated {new Date(snapshot.sourcePageDate).toLocaleDateString()}</p><p>Next verification {new Date(snapshot.nextVerificationAt).toLocaleDateString()}</p></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-sm leading-6 text-slate-600">Enter every listed Monash unit. The published rule requires a weighted Distinction average ({snapshot.distinctionMinimum}+) and at least Credit ({snapshot.creditMinimum}+) in each unit.</p>
          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {unitRequirements.map((requirement) => {
              const currentCode = requirement.alternatives.find((code) => results[code]) || requirement.alternatives[0] || requirement.label
              const current = results[currentCode] || { mark: '', hypothetical: true }
              return <div key={requirement.key} className="grid gap-3 py-3 sm:grid-cols-[1fr_120px_145px] sm:items-center"><div>{requirement.alternatives.length > 1 ? <select value={currentCode} onChange={(event) => changeAlternative(currentCode, event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 font-semibold text-slate-950">{requirement.alternatives.map((code) => <option key={code}>{code}</option>)}</select> : <p className="font-semibold text-slate-950">{requirement.label}</p>}<span className="text-sm text-slate-500"> {Math.round(requirement.weight * 100)}%</span></div><input type="number" min="0" max="100" value={current.mark} placeholder="Mark" onChange={(event) => updateResult(currentCode, { mark: event.target.value === '' ? '' : Math.max(0, Math.min(100, Number(event.target.value))) })} className="h-10 rounded-md border border-slate-300 px-3" aria-label={`${currentCode} mark`} /><select value={current.hypothetical ? 'hypothetical' : 'actual'} onChange={(event) => updateResult(currentCode, { hypothetical: event.target.value !== 'actual' })} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="hypothetical">Hypothetical</option><option value="actual">Final result</option></select></div>
            })}
          </div>
          <div className="mt-4 flex items-center gap-3"><Button onClick={saveResults} disabled={saveState === 'saving'}>{saveState === 'saving' ? 'Saving...' : 'Save results'}</Button><p className={`text-sm ${saveState === 'error' ? 'text-rose-700' : 'text-slate-500'}`}>{saveState === 'saved' ? 'Saved across devices.' : saveState === 'error' ? 'Could not save. Apply the Resources migration first.' : !user ? 'Sign in required to persist results.' : ''}</p></div>
          <p className="mt-3 text-xs text-slate-500">Prerequisites noted by Monash: {snapshot.prerequisites[courseLevel].join(', ')}.</p>
        </div>
        <div className="rounded-lg bg-slate-950 p-5 text-white">
          <p className="text-xs font-semibold uppercase text-teal-300">{selectedRule.code} estimate</p>
          <p className="mt-3 text-4xl font-semibold">{!calculation || calculation.weightedMark == null ? '--' : compactNumber(calculation.weightedMark)}</p>
          <p className="mt-1 text-sm text-slate-300">Weighted mark from entered results</p>
          <div className="mt-5 border-t border-slate-700 pt-4 text-sm leading-6"><p className="font-semibold capitalize text-white">{calculation?.status.replace('-', ' ')}</p><p className="text-slate-300">{calculation?.message}</p>{calculation && calculation.requiredRemainingAverage != null && <p className="mt-2 text-teal-300">Required weighted average on remaining work: {compactNumber(calculation.requiredRemainingAverage)}</p>}{calculation?.usesHypotheticalMarks && <p className="mt-2 text-amber-300">Includes hypothetical marks; these are not final results.</p>}</div>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
        <p><strong>Unofficial estimate only.</strong> This calculator does not grant or guarantee an exemption. Monash University recommends eligibility and the Actuaries Institute makes the formal decision.</p>
        <div className="flex shrink-0 gap-3"><a href={snapshot.gradeSourceUrl} target="_blank" rel="noreferrer" className="font-semibold underline">Grade source</a><a href={snapshot.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold underline">Official rules</a></div>
      </div>
    </div>
  )
}

export function ResourcesManager() {
  const { user, requireAuth } = useAuth()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<'All' | ResourceKind>('All')
  const [difficulty, setDifficulty] = useState('All')
  const [professionalSubject, setProfessionalSubject] = useState('All')
  const [selectedUnit, setSelectedUnit] = useState('All')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const dailyDistribution = DISTRIBUTIONS[Math.floor(Date.now() / 86400000) % DISTRIBUTIONS.length]
  const [distributionId, setDistributionId] = useState<DistributionId>(dailyDistribution.id)
  const distribution = DISTRIBUTIONS.find((item) => item.id === distributionId) || dailyDistribution
  const [parameters, setParameters] = useState<Record<string, number>>(() => defaultParameters(dailyDistribution))
  const [metric, setMetric] = useState<DistributionMetric>('density')
  const [comparisonId, setComparisonId] = useState<'None' | DistributionId>('None')
  const [probabilityBounds, setProbabilityBounds] = useState({ lower: 0, upper: 1 })
  const [quantileProbability, setQuantileProbability] = useState(0.95)
  const [simulation, setSimulation] = useState<number[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/app-state/dashboard', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/resources/saved', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).catch(() => null)
    ]).then(([dashboardPayload, savedPayload]) => {
      if (dashboardPayload?.ok) setDashboard(dashboardPayload.data)
      if (savedPayload?.ok) setSavedIds(new Set((savedPayload.resources as SavedResource[]).map((resource) => resource.resource_id)))
    }).finally(() => setIsLoading(false))
  }, [user?.id])

  const contextTopics = useMemo(() => [
    ...(dashboard?.currentTopics || []).filter((topic) => selectedUnit === 'All' || topic.course_code === selectedUnit).map((topic) => topic.name || ''),
    ...(dashboard?.weakTopics || []).filter((topic) => selectedUnit === 'All' || topic.course_code === selectedUnit).map((topic) => topic.name || ''),
    ...(dashboard?.recentResources || []).filter((resource) => selectedUnit === 'All' || resource.course_code === selectedUnit).flatMap((resource) => [resource.filename, resource.document_type || '', resource.course_code || ''])
  ].filter(Boolean), [dashboard, selectedUnit])

  const recommendations = useMemo(() => [...ACTUARIAL_RESOURCES]
    .sort((left, right) => relevanceScore(right, contextTopics) - relevanceScore(left, contextTopics))
    .slice(0, 3), [contextTopics])

  const filteredResources = useMemo(() => ACTUARIAL_RESOURCES.filter((resource) => {
    const query = search.toLowerCase().trim()
    const matchesKind = kind === 'All' || resource.kind === kind
    const matchesDifficulty = difficulty === 'All' || resource.difficulty === difficulty
    const matchesSubject = professionalSubject === 'All' || resource.professionalSubjects.includes(professionalSubject)
    const haystack = [resource.title, resource.summary, ...resource.topics, ...resource.professionalSubjects].join(' ').toLowerCase()
    return matchesKind && matchesDifficulty && matchesSubject && (!query || haystack.includes(query))
  }), [difficulty, kind, professionalSubject, search])

  const points = useMemo(() => distributionMetricPoints(distribution.id, parameters, metric), [distribution, metric, parameters])
  const plotYMax = useMemo(() => distributionPlotYMax(distribution.id, metric), [distribution.id, metric])
  const comparisonPoints = useMemo(() => {
    if (comparisonId === 'None') return []
    const compared = DISTRIBUTIONS.find((item) => item.id === comparisonId)
    return compared ? distributionMetricPoints(compared.id, defaultParameters(compared), metric) : []
  }, [comparisonId, metric])
  const summary = useMemo(() => distributionSummary(distribution.id, parameters), [distribution, parameters])
  const probability = useMemo(() => intervalProbability(distribution.id, probabilityBounds.lower, probabilityBounds.upper, parameters), [distribution, parameters, probabilityBounds])
  const quantile = useMemo(() => distributionQuantile(distribution.id, quantileProbability, parameters), [distribution, parameters, quantileProbability])
  const simulatedMean = simulation.length ? simulation.reduce((sum, value) => sum + value, 0) / simulation.length : null

  const selectDistribution = (id: DistributionId) => {
    const next = DISTRIBUTIONS.find((item) => item.id === id) || DISTRIBUTIONS[0]
    setDistributionId(next.id)
    setParameters(defaultParameters(next))
    setSimulation([])
  }

  const toggleSaved = async (resource: ActuarialResource) => {
    if (requireAuth('Sign in to keep your actuarial library across devices.', '/resources')) return
    const wasSaved = savedIds.has(resource.id)
    setSavedIds((current) => {
      const next = new Set(current)
      wasSaved ? next.delete(resource.id) : next.add(resource.id)
      return next
    })
    const response = await fetch('/api/resources/saved', {
      method: wasSaved ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resourceId: resource.id })
    }).catch(() => null)
    if (!response?.ok) {
      setSavedIds((current) => {
        const next = new Set(current)
        wasSaved ? next.add(resource.id) : next.delete(resource.id)
        return next
      })
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-12 overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-teal-700">Actuarial knowledge system</p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-950 sm:text-5xl">Resources</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Move from this week&apos;s Monash topics into rigorous mathematics, professional syllabi, primary sources and interactive models.</p>
          </div>
          <div className="grid min-w-0 grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-3 text-center lg:min-w-[430px]">
            <div><p className="text-2xl font-semibold text-slate-950">{dashboard?.activeCourses?.length || 0}</p><p className="text-xs text-slate-500">Active units</p></div>
            <div><p className="text-2xl font-semibold text-slate-950">{dashboard?.currentTopics?.length || 0}</p><p className="text-xs text-slate-500">Weekly topics</p></div>
            <div><p className="text-2xl font-semibold text-slate-950">{savedIds.size}</p><p className="text-xs text-slate-500">Saved</p></div>
          </div>
        </div>
      </header>

      <section aria-labelledby="for-you-title">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold text-teal-700">{dashboard?.currentWeek?.label || 'Current study context'}</p><h2 id="for-you-title" className="mt-1 text-2xl font-semibold text-slate-950">For you this week</h2></div>
          <div className="flex items-center gap-3"><label className="text-sm text-slate-600">Unit <select value={selectedUnit} onChange={(event) => setSelectedUnit(event.target.value)} className="ml-2 h-9 rounded-md border border-slate-300 bg-white px-2"><option>All</option>{dashboard?.activeCourses?.map((course) => <option key={course.id} value={course.course_code}>{course.course_code}</option>)}</select></label><Link href="/planner" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">Open semester plan <ChevronRight size={16} /></Link></div>
        </div>
        {isLoading ? <div className="flex h-36 items-center justify-center border-y border-slate-200 text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} /> Reading your study context</div> : (
          <div className="grid border-y border-slate-200 lg:grid-cols-[0.75fr_2fr]">
            <div className="border-b border-slate-200 py-6 lg:border-b-0 lg:border-r lg:pr-6">
              <p className="text-xs font-semibold uppercase text-slate-500">Detected topics</p>
              <div className="mt-4 flex min-w-0 flex-wrap gap-2">{contextTopics.length ? contextTopics.slice(0, 8).map((topic) => <span key={topic} className="max-w-full break-words rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700">{topic}</span>) : <p className="text-sm leading-6 text-slate-500">Add weekly topics in Units or upload lecture material to personalise this shelf.</p>}</div>
              {!!dashboard?.recentResources?.length && <p className="mt-5 text-xs text-slate-500">Grounded by {dashboard.recentResources.length} recent upload{dashboard.recentResources.length === 1 ? '' : 's'}.</p>}
            </div>
            <div className="grid gap-x-6 py-6 lg:grid-cols-3 lg:pl-6">{recommendations.map((resource) => <ResourceCard key={resource.id} resource={resource} unit={selectedUnit} saved={savedIds.has(resource.id)} onSave={toggleSaved} />)}</div>
          </div>
        )}
      </section>

      <DeepResearchPanel selectedUnit={selectedUnit} />

      <section aria-labelledby="distribution-title" className="bg-slate-950 px-5 py-8 text-white sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="flex items-center gap-2 text-sm font-semibold text-teal-300"><FlaskConical size={18} /> Distribution laboratory</div><h2 id="distribution-title" className="mt-2 text-3xl font-semibold">Distribution of the day: {distribution.name}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{distribution.intuition}</p></div>
          <label className="text-sm text-slate-300">Distribution<select value={distribution.id} onChange={(event) => selectDistribution(event.target.value as DistributionId)} className="ml-3 h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-white">{DISTRIBUTIONS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{(['density', 'cdf', 'survival', 'hazard'] as DistributionMetric[]).map((item) => <button key={item} onClick={() => setMetric(item)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold uppercase ${metric === item ? 'bg-teal-300 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{item === 'density' ? distribution.family === 'Discrete' ? 'PMF' : 'PDF' : item}</button>)}</div>
        <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.65fr)_minmax(270px,0.75fr)]">
          <div><DistributionChart points={points} comparison={comparisonPoints} fixedYMax={plotYMax} discrete={distribution.family === 'Discrete' && metric === 'density'} /><div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 space-y-1 overflow-x-auto text-xs text-teal-200"><MathFormula value={distribution.latex.density} /><div className="text-slate-300"><MathFormula value={distribution.latex.cdf} /></div></div><label className="shrink-0 text-xs text-slate-300">Compare with <select value={comparisonId} onChange={(event) => setComparisonId(event.target.value as 'None' | DistributionId)} className="ml-2 h-8 rounded-md border border-slate-600 bg-slate-900 px-2"><option>None</option>{DISTRIBUTIONS.filter((item) => item.id !== distribution.id).map((item) => <option key={item.id} value={item.id}>{item.name} defaults</option>)}</select></label></div></div>
          <div className="space-y-5">
            {distribution.parameters.map((parameter) => <label key={parameter.key} className="block text-sm"><span className="flex justify-between"><span>{parameter.label} (<MathFormula value={parameter.symbol} />)</span><strong>{parameters[parameter.key]}</strong></span><input type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={parameters[parameter.key]} onChange={(event) => setParameters((current) => normalizeParameters(distribution, { ...current, [parameter.key]: Number(event.target.value) }))} className="mt-3 w-full accent-teal-400" /><span className="mt-1 block text-xs leading-5 text-slate-400">{parameter.description}</span></label>)}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-slate-700 text-sm"><div className="bg-slate-900 p-3"><p className="text-slate-400">Mean</p><p className="mt-1 font-semibold">{summary.meanNote || compactNumber(summary.mean)}</p><MathFormula value={distribution.latex.mean} className="mt-1 block text-xs text-slate-400" /></div><div className="bg-slate-900 p-3"><p className="text-slate-400">Variance</p><p className="mt-1 font-semibold">{summary.varianceNote || compactNumber(summary.variance)}</p><MathFormula value={distribution.latex.variance} className="mt-1 block text-xs text-slate-400" /></div><div className="bg-slate-900 p-3"><p className="text-slate-400">Std. deviation</p><p className="mt-1 font-semibold">{compactNumber(summary.standardDeviation)}</p></div><div className="bg-slate-900 p-3"><p className="text-slate-400">Support</p><MathFormula value={summary.support} className="mt-1 block font-semibold" /></div></div>
          </div>
        </div>
        <div className="mt-7 grid gap-4 border-t border-slate-700 pt-6 md:grid-cols-2"><div className="text-sm leading-6 text-slate-300"><p><strong className="text-white">Actuarial connection.</strong> {distribution.actuarialUse}</p><div className="mt-2 flex flex-wrap gap-2">{distribution.syllabus.map((subject) => <span key={subject} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-teal-200">{subject}</span>)}</div></div><div className="text-sm leading-6 text-slate-300"><p><strong className="text-white">Watch for.</strong> {distribution.commonMistake}</p><p className="mt-2 text-xs text-slate-400"><strong className="text-slate-200">Related:</strong> {distribution.related}</p>{distribution.latex.moment ? <MathFormula value={distribution.latex.moment} className="mt-2 block overflow-x-auto text-xs text-teal-200" /> : null}</div></div>
        <div className="mt-6 grid gap-px overflow-hidden rounded-lg bg-slate-700 lg:grid-cols-3">
          <div className="bg-slate-900 p-5">
            <p className="text-sm font-semibold">Interval probability</p>
            <div className="mt-3 flex items-center gap-2"><input type="number" value={probabilityBounds.lower} onChange={(event) => setProbabilityBounds((current) => ({ ...current, lower: Number(event.target.value) }))} className="h-10 min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-950 px-2" aria-label="Lower probability bound" /><span>to</span><input type="number" value={probabilityBounds.upper} onChange={(event) => setProbabilityBounds((current) => ({ ...current, upper: Number(event.target.value) }))} className="h-10 min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-950 px-2" aria-label="Upper probability bound" /></div>
            <p className="mt-3 text-xl font-semibold text-teal-300">P = {compactNumber(probability)}</p>
          </div>
          <div className="bg-slate-900 p-5">
            <p className="text-sm font-semibold">Quantile calculator</p>
            <label className="mt-3 block text-xs text-slate-400">Cumulative probability<input type="number" min="0.001" max="0.999" step="0.01" value={quantileProbability} onChange={(event) => setQuantileProbability(Math.min(0.999, Math.max(0.001, Number(event.target.value))))} className="mt-1 h-10 w-full rounded-md border border-slate-600 bg-slate-950 px-2 text-white" /></label>
            <p className="mt-3 text-xl font-semibold text-teal-300">q = {compactNumber(quantile)}</p>
          </div>
          <div className="bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Simulation check</p><button onClick={() => setSimulation(simulateDistribution(distribution.id, parameters, 500))} className="rounded-full bg-teal-300 px-3 py-1.5 text-xs font-semibold text-slate-950">Run 500</button></div>
            <p className="mt-4 text-sm text-slate-400">Simulated mean</p><p className="mt-1 text-xl font-semibold text-teal-300">{simulatedMean === null ? '--' : compactNumber(simulatedMean)}</p><p className="mt-2 text-xs text-slate-500">Theoretical: {compactNumber(summary.mean)}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-700 pt-5"><span className="mr-2 text-xs font-semibold uppercase text-slate-400">Previous days</span>{Array.from({ length: Math.min(4, DISTRIBUTIONS.length - 1) }, (_, offset) => { const item = DISTRIBUTIONS[(DISTRIBUTIONS.indexOf(dailyDistribution) - offset - 1 + DISTRIBUTIONS.length) % DISTRIBUTIONS.length]; return <button key={item.id} onClick={() => selectDistribution(item.id)} className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-teal-300">{item.name}</button> })}</div>
      </section>

      <StochasticProcessesLab />

      <section aria-labelledby="library-title">
        <div className="mb-6 flex items-center gap-3"><Library className="text-teal-700" /><div><p className="text-sm font-semibold text-teal-700">Research and deep learning</p><h2 id="library-title" className="text-2xl font-semibold text-slate-950">Actuarial library</h2></div></div>
        <div className="flex flex-col gap-3 border-y border-slate-200 py-4 xl:flex-row xl:items-center xl:justify-between">
          <label className="relative block lg:w-96"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search MLE, Pareto, CS2 survival..." className="h-11 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-teal-700" /></label>
          <div className="flex gap-2 overflow-x-auto pb-1"><select value={professionalSubject} onChange={(event) => setProfessionalSubject(event.target.value)} className="h-10 shrink-0 rounded-md border border-slate-300 bg-white px-2 text-sm"><option>All</option>{['CS1', 'CS2', 'CM1', 'CM2', 'Actuary Program'].map((subject) => <option key={subject}>{subject}</option>)}</select><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="h-10 shrink-0 rounded-md border border-slate-300 bg-white px-2 text-sm"><option>All</option>{['Introductory', 'University', 'Professional', 'Advanced'].map((level) => <option key={level}>{level}</option>)}</select>{resourceKinds.map((item) => <button key={item} onClick={() => setKind(item)} className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium ${kind === item ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}>{item}</button>)}</div>
        </div>
        <div className="grid gap-x-10 py-6 md:grid-cols-2">{filteredResources.map((resource) => <ResourceCard key={resource.id} resource={resource} unit={selectedUnit} saved={savedIds.has(resource.id)} onSave={toggleSaved} />)}</div>
        {!filteredResources.length && <p className="border-b border-slate-200 py-10 text-center text-slate-500">No curated resources match those filters.</p>}
      </section>

      <section aria-labelledby="professional-title">
        <div className="mb-6 flex items-center gap-3"><GraduationCap className="text-teal-700" /><div><p className="text-sm font-semibold text-teal-700">University to profession</p><h2 id="professional-title" className="text-2xl font-semibold text-slate-950">Professional syllabus map</h2></div></div>
        <div className="grid border-y border-slate-200 md:grid-cols-2">{PROFESSIONAL_SUBJECTS.map((subject, index) => <a key={subject.id} href={subject.sourceUrl} target="_blank" rel="noreferrer" className={`group p-5 hover:bg-slate-50 ${index % 2 === 0 ? 'md:border-r' : ''} ${index < PROFESSIONAL_SUBJECTS.length - 2 ? 'border-b' : ''} border-slate-200`}><p className="text-xs font-semibold uppercase text-teal-700">{subject.institute} / {subject.stage}</p><div className="mt-2 flex items-start justify-between gap-4"><h3 className="font-semibold text-slate-950">{subject.title}</h3><ArrowUpRight className="shrink-0 text-slate-400 group-hover:text-teal-700" size={17} /></div><p className="mt-3 text-sm leading-6 text-slate-600">{subject.themes.join(' / ')}</p></a>)}</div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Indicative topic navigation only. Actuaries Institute Australia and IFoA are shown separately; official syllabi and recognition decisions remain authoritative.</p>
      </section>

      <section aria-labelledby="exemptions-title">
        <div className="mb-6 flex items-center gap-3"><Calculator className="text-teal-700" /><div><p className="text-sm font-semibold text-teal-700">Professional progress</p><h2 id="exemptions-title" className="text-2xl font-semibold text-slate-950">Monash actuarial exemptions</h2></div></div>
        <ExemptionPlanner />
      </section>

      <section aria-labelledby="saved-title" className="border-t border-slate-200 pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-teal-700">Your library</p><h2 id="saved-title" className="text-2xl font-semibold text-slate-950">Saved resources</h2></div>{!user && <Button variant="outline" onClick={() => requireAuth('Sign in to keep your actuarial library across devices.', '/resources')}>Sign in to sync</Button>}</div>
        {savedIds.size ? <div className="mt-5 grid gap-x-10 md:grid-cols-2">{ACTUARIAL_RESOURCES.filter((resource) => savedIds.has(resource.id)).map((resource) => <ResourceCard key={resource.id} resource={resource} saved onSave={toggleSaved} />)}</div> : <div className="mt-5 flex items-center gap-4 border-y border-slate-200 py-7 text-slate-500"><Bookmark size={22} /><p className="text-sm">Bookmark a Deep Dive, book, paper or professional source to build your library.</p></div>}
      </section>

      <aside className="grid gap-4 border-t border-slate-200 pt-8 sm:grid-cols-3">
        <Link href="/ai-tutor" className="flex items-center gap-3 p-4 hover:bg-slate-50"><Sparkles className="text-teal-700" /><div><p className="font-semibold text-slate-950">Ask Tutor</p><p className="text-sm text-slate-500">Work through the mathematics</p></div></Link>
        <Link href="/uploads" className="flex items-center gap-3 p-4 hover:bg-slate-50"><BookOpen className="text-teal-700" /><div><p className="font-semibold text-slate-950">Your materials</p><p className="text-sm text-slate-500">Ground research in uploads</p></div></Link>
        <div className="flex items-center gap-3 p-4"><ShieldCheck className="text-teal-700" /><div><p className="font-semibold text-slate-950">Source integrity</p><p className="text-sm text-slate-500">Primary sources are labelled</p></div></div>
      </aside>
    </div>
  )
}