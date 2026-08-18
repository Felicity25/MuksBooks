'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, GripVertical, MoreHorizontal, Plus, RotateCcw, Settings2, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { onAppStateUpdate } from '@/lib/app-state/client-events'
import { rankSuggestions } from '@/lib/dashboard/suggestions'
import { WIDGETS, WIDGET_BY_ID, WIDGET_SPANS } from '@/lib/dashboard/widgets'
import { HOMEPAGE_PRESETS, type WidgetId, type WidgetLayoutItem, type WidgetSize } from '@/lib/user-settings'

interface DashboardData {
  todayTasks: Array<{ id: string; title: string; due_date?: string | null; planned_date?: string | null; course_code?: string | null }>
  upcomingAssessments: Array<{ id: string; name: string; due_date?: string | null; course_code?: string | null; weighting?: number | null }>
  activeCourses: Array<{ id: string; course_code: string; course_name?: string | null; avg_mastery?: number | null; topic_count?: number | null; mastery_level?: number | null }>
  weakTopics: Array<{ id: string; name?: string | null; mastery_score?: number | null; course_code?: string | null }>
  currentWeek?: { label: string; start: string; end: string; phase: string; weekNumber?: number | null } | null
  currentTopics?: Array<{ id: string; name?: string | null; week?: number | null; course_code?: string | null }>
  recentResources: Array<{ id: string; filename: string; document_type?: string | null; course_code?: string | null; created_at: string }>
  careerPulse?: { activeApplications: number; outstandingAssessments: number; interviews: number; needsAttention: Array<{ title: string; deadline_at_utc: string }> }
}

interface MassItem { id: string; title: string; description?: string; category: string; startsAt?: string | null; url: string; whyRelevant?: string | null }
interface NewsItem { id: string; title: string; summary?: string; url: string }

const quickLinks = {
  upload: { label: 'Upload', href: '/uploads' },
  'ask-tutor': { label: 'Ask Tutor', href: '/ai-tutor' },
  'add-task': { label: 'Add Planner Task', href: '/planner' },
  careers: { label: 'Careers', href: '/careers' },
  'todays-classes': { label: "Today's Classes", href: '/planner' }
}

function greeting(timezone: string) {
  const hour = Number(new Intl.DateTimeFormat('en-AU', { hour: '2-digit', hour12: false, timeZone: timezone }).format(new Date()).split(':')[0])
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

function WidgetFrame({ item, index, editing, onMove, onSize, onHide, onRefresh, onSettings, onDrop, children }: {
  item: WidgetLayoutItem; index: number; editing: boolean
  onMove: (offset: number) => void; onSize: (size: WidgetSize) => void; onHide: () => void; onRefresh: () => void
  onSettings: () => void
  onDrop: (dragged: WidgetId, target: WidgetId) => void; children: React.ReactNode
}) {
  const definition = WIDGET_BY_ID[item.id]
  return (
    <section className={`${WIDGET_SPANS[item.size]} min-w-0`} draggable={editing} onDragStart={(event) => event.dataTransfer.setData('text/widget-id', item.id)} onDragOver={(event) => editing && event.preventDefault()} onDrop={(event) => onDrop(event.dataTransfer.getData('text/widget-id') as WidgetId, item.id)}>
      <Card data-widget-id={item.id} className={`h-full min-h-44 space-y-4 ${editing ? 'border-dashed border-sky-400 ring-2 ring-sky-100' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            {editing ? <GripVertical className="mt-0.5 h-5 w-5 shrink-0 cursor-grab text-slate-400" aria-hidden="true" /> : null}
            <div><h2 className="font-semibold text-slate-950">{definition.title}</h2>{editing ? <p className="mt-1 text-xs text-slate-500">{definition.description}</p> : null}</div>
          </div>
          <details className="relative">
            <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-slate-600 hover:bg-slate-100" aria-label={`${definition.title} menu`}><MoreHorizontal className="h-5 w-5" /></summary>
            <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
              <p className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">Change size</p>
              <div className="flex flex-wrap gap-1 px-2 py-1">{definition.sizes.map((size) => <button key={size} type="button" onClick={() => onSize(size)} className={`rounded px-2 py-1 text-xs ${item.size === size ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>{size}</button>)}</div>
              <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-100 disabled:opacity-40"><ChevronUp className="h-4 w-4" />Move earlier</button>
              <button type="button" onClick={() => onMove(1)} className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-100"><ChevronDown className="h-4 w-4" />Move later</button>
              {definition.refreshable ? <button type="button" onClick={onRefresh} className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-100"><RotateCcw className="h-4 w-4" />Refresh</button> : null}
              <button type="button" onClick={onSettings} className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-100"><Settings2 className="h-4 w-4" />Widget settings</button>
              <button type="button" onClick={onHide} className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-rose-700 hover:bg-rose-50"><X className="h-4 w-4" />Hide from Home</button>
            </div>
          </details>
        </div>
        {children}
      </Card>
    </section>
  )
}

function WidgetBody({ id, size, widgetSettings, dashboard, mass, news, loading }: { id: WidgetId; size: WidgetSize; widgetSettings?: Record<string, unknown>; dashboard: DashboardData | null; mass: MassItem[]; news: NewsItem[]; loading: boolean }) {
  const mastery = (dashboard?.activeCourses || []).filter((unit) => Number.isFinite(Number(unit.mastery_level)))
  const overallMastery = mastery.length ? Math.round(mastery.reduce((sum, unit) => sum + Number(unit.mastery_level || 0), 0) / mastery.length) : 0
  const limit = id === 'suggested-actions' && Number(widgetSettings?.maximum) ? Number(widgetSettings?.maximum) : size === 'small' ? 1 : size === 'medium' ? 3 : 5
  if (loading && !dashboard) return <p className="text-sm text-slate-500">Loading widget…</p>

  if (id === 'suggested-actions') return null
  if (id === 'planner' || id === 'todays-classes') return <div className="space-y-2">{(dashboard?.todayTasks || []).slice(0, limit).map((task) => <div key={task.id} className="rounded-lg bg-slate-50 p-3"><p className="text-sm font-medium text-slate-900">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.course_code || 'General'} · {task.due_date ? new Date(task.due_date).toLocaleDateString('en-AU') : 'No deadline'}</p></div>)}{!dashboard?.todayTasks.length ? <p className="text-sm text-slate-600">Nothing is scheduled yet.</p> : null}<Link href="/planner" className="inline-block text-sm font-medium text-sky-700">Open Planner</Link></div>
  if (id === 'assessments') return <div className="space-y-2">{(dashboard?.upcomingAssessments || []).slice(0, limit).map((assessment) => <div key={assessment.id} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="font-medium text-slate-900">{assessment.name}</span><span className="text-slate-500">{assessment.due_date ? new Date(assessment.due_date).toLocaleDateString('en-AU') : 'TBC'}</span></div>)}{!dashboard?.upcomingAssessments.length ? <p className="text-sm text-slate-600">No upcoming assessments found.</p> : null}</div>
  if (id === 'current-week' || id === 'semester-progress') return <div><p className="text-2xl font-semibold text-slate-950">{dashboard?.currentWeek?.label || 'Semester not configured'}</p><p className="mt-2 text-sm text-slate-600">{dashboard?.currentTopics?.slice(0, limit).map((topic) => `${topic.course_code || ''} ${topic.name || ''}`.trim()).join(' · ') || 'Upload unit schedules to add weekly topics.'}</p></div>
  if (id === 'semester-timeline') return <div><p className="text-2xl font-semibold text-slate-950">{dashboard?.currentWeek?.label || 'Current semester'}</p><p className="mt-2 text-sm text-slate-600">{dashboard?.currentWeek ? `${new Date(dashboard.currentWeek.start).toLocaleDateString('en-AU')} – ${new Date(dashboard.currentWeek.end).toLocaleDateString('en-AU')}` : 'Calendar dates are being prepared.'}</p><Link href="/semester-timeline" className="mt-3 inline-block text-sm font-medium text-sky-700">View timeline</Link></div>
  if (id === 'units') return <div className="space-y-3">{(dashboard?.activeCourses || []).slice(0, limit).map((unit) => <div key={unit.id}><div className="flex justify-between text-sm"><span className="font-medium text-slate-900">{unit.course_code}</span><span>{Math.round(Number(unit.mastery_level || 0))}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-sky-600" style={{ width: `${Math.max(0, Math.min(100, Number(unit.mastery_level || 0)))}%` }} /></div></div>)}{!dashboard?.activeCourses.length ? <p className="text-sm text-slate-600">Add your enrolled units to get started.</p> : null}</div>
  if (id === 'mastery-pulse') return <div><p className="text-3xl font-semibold text-slate-950">{overallMastery}%</p><p className="mt-2 text-sm text-slate-600">Overall mastery across {mastery.length} active units.</p><Link href="/mastery" className="mt-3 inline-block text-sm font-medium text-sky-700">Review mastery</Link></div>
  if (id === 'applications') return <div><p className="text-3xl font-semibold text-slate-950">{dashboard?.careerPulse?.activeApplications || 0}</p><p className="text-sm text-slate-600">active applications · {dashboard?.careerPulse?.outstandingAssessments || 0} assessments</p><Link href="/careers" className="mt-3 inline-block text-sm font-medium text-sky-700">Track applications</Link></div>
  if (id === 'careers') return <div className="space-y-2">{(dashboard?.careerPulse?.needsAttention || []).slice(0, limit).map((item) => <p key={`${item.title}-${item.deadline_at_utc}`} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{item.title} · {new Date(item.deadline_at_utc).toLocaleDateString('en-AU')}</p>)}{!dashboard?.careerPulse?.needsAttention.length ? <p className="text-sm text-slate-600">No urgent career deadlines. Browse verified opportunities when you are ready.</p> : null}<Link href="/careers" className="inline-block text-sm font-medium text-sky-700">Open Careers</Link></div>
  if (id === 'mass-pulse') return <div className="space-y-3">{mass.slice(0, limit).map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block rounded-lg bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.category}{item.startsAt ? ` · ${new Date(item.startsAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</p>{size !== 'small' && item.description ? <p className="mt-2 text-sm text-slate-600">{item.description}</p> : null}{size === 'large' && item.whyRelevant ? <p className="mt-2 text-xs font-medium text-sky-700">Why you might care: {item.whyRelevant}</p> : null}</a>)}{!mass.length ? <p className="text-sm text-slate-600">MASS Pulse is available, but no current public opportunities were found.</p> : null}</div>
  if (id === 'actuarial-news') return <div className="space-y-3">{news.slice(0, limit).map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block border-b border-slate-100 pb-2 last:border-0"><p className="text-sm font-semibold text-slate-900">{item.title}</p>{size === 'large' && item.summary ? <p className="mt-1 text-sm text-slate-600">{item.summary}</p> : null}</a>)}{!news.length ? <p className="text-sm text-slate-600">News is temporarily unavailable.</p> : null}</div>
  if (id === 'recent-uploads' || id === 'saved-resources') return <div className="space-y-2">{(dashboard?.recentResources || []).slice(0, limit).map((resource) => <p key={resource.id} className="truncate rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{resource.filename}</p>)}{!dashboard?.recentResources.length ? <p className="text-sm text-slate-600">No resources uploaded yet.</p> : null}</div>
  if (id === 'distribution') return <div><p className="text-2xl font-semibold text-slate-950">Poisson distribution</p><p className="mt-2 text-sm text-slate-600">Models counts of independent events occurring at a constant average rate.</p></div>
  if (id === 'exemption-progress') return <div><p className="text-3xl font-semibold text-slate-950">Track exemptions</p><p className="mt-2 text-sm text-slate-600">Connect unit results to professional exemption requirements.</p></div>
  const link = id === 'quick-upload' ? '/uploads' : id === 'tutor' ? '/ai-tutor' : '/resources'
  return <div><p className="text-sm text-slate-600">Open this workspace when you need it. It stays out of the way otherwise.</p><Link href={link} className="mt-3 inline-block text-sm font-medium text-sky-700">Open {WIDGET_BY_ID[id].title}</Link></div>
}

export function PersonalHomeDashboard() {
  const { settings, saveSettings } = useAuth()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [mass, setMass] = useState<MassItem[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [settingsWidget, setSettingsWidget] = useState<WidgetId | null>(null)

  const layout = settings.homepageLayout
  const hasMass = layout.some((item) => item.id === 'mass-pulse')
  const hasNews = layout.some((item) => item.id === 'actuarial-news')
  const massCategoriesKey = JSON.stringify(layout.find((item) => item.id === 'mass-pulse')?.settings?.categories || [])

  const loadDashboard = async () => {
    setLoading(true)
    try { const response = await fetch('/api/app-state/dashboard', { cache: 'no-store' }); const payload = await response.json(); if (payload?.ok) setDashboard(payload.data) } finally { setLoading(false) }
  }
  const loadMass = async () => { try { const widget = layout.find((item) => item.id === 'mass-pulse'); const categories = Array.isArray(widget?.settings?.categories) ? widget.settings.categories.join(',') : ''; const response = await fetch(`/api/mass${categories ? `?categories=${encodeURIComponent(categories)}` : ''}`); const payload = await response.json(); if (payload?.ok) setMass(payload.items || []) } catch { setMass([]) } }
  const loadNews = async () => { try { const response = await fetch('/api/news?range=7d&limit=8'); const payload = await response.json(); if (payload?.ok) setNews(payload.items || []) } catch { setNews([]) } }

  useEffect(() => { void loadDashboard(); return onAppStateUpdate(() => void loadDashboard()) }, [])
  useEffect(() => { if (hasMass) void loadMass() }, [hasMass, massCategoriesKey])
  useEffect(() => { if (hasNews) void loadNews() }, [hasNews])

  const saveLayout = (next: WidgetLayoutItem[]) => void saveSettings({ homepageLayout: next, homepagePreset: 'build-my-own' })
  const move = (index: number, offset: number) => { const target = index + offset; if (target < 0 || target >= layout.length) return; const next = [...layout]; [next[index], next[target]] = [next[target], next[index]]; saveLayout(next) }
  const drop = (dragged: WidgetId, target: WidgetId) => { if (!dragged || dragged === target) return; const next = layout.filter((item) => item.id !== dragged); const draggedItem = layout.find((item) => item.id === dragged); const targetIndex = next.findIndex((item) => item.id === target); if (draggedItem) next.splice(targetIndex, 0, draggedItem); saveLayout(next) }
  const setSize = (id: WidgetId, size: WidgetSize) => saveLayout(layout.map((item) => item.id === id ? { ...item, size } : item))
  const setWidgetSettings = (id: WidgetId, widgetSettings: Record<string, unknown>) => saveLayout(layout.map((item) => item.id === id ? { ...item, settings: widgetSettings } : item))
  const hide = (id: WidgetId) => saveLayout(layout.filter((item) => item.id !== id))
  const add = (id: WidgetId) => { const widget = WIDGET_BY_ID[id]; saveLayout([...layout, { id, size: widget.defaultSize }]); setLibraryOpen(false) }

  const suggestions = useMemo(() => rankSuggestions({ todayTasks: dashboard?.todayTasks || [], assessments: dashboard?.upcomingAssessments || [], weakTopics: dashboard?.weakTopics || [], careerItems: dashboard?.careerPulse?.needsAttention || [], massItems: mass }, settings.proactivityLevel, settings.proactivityControls), [dashboard, mass, settings.proactivityLevel, settings.proactivityControls])
  const visibleIds = new Set(layout.map((item) => item.id))

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase text-sky-700">Personal dashboard</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">{greeting(settings.timezone)}, {settings.name || 'Student'} 👋</h1><p className="mt-2 text-sm text-slate-600">{settings.degree || 'Monash student'}{dashboard?.currentWeek?.label ? ` · ${dashboard.currentWeek.label}` : ''}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setEditing(!editing)}><Settings2 className="mr-2 h-4 w-4" />{editing ? 'Done Editing' : 'Edit Homepage'}</Button>{editing ? <Button onClick={() => setLibraryOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Widget</Button> : null}</div></header>
    <nav className="flex flex-wrap gap-2" aria-label="Quick actions">{settings.quickActions.map((id) => <Link key={id} href={quickLinks[id].href} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">{quickLinks[id].label}</Link>)}</nav>
    {editing ? <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"><span className="mr-auto">Drag widgets or use each menu to move, resize, refresh, or hide them.</span><Button size="sm" variant="outline" onClick={() => void saveSettings({ homepageLayout: HOMEPAGE_PRESETS['academic-weapon'].map((item) => ({ ...item })), homepagePreset: 'academic-weapon' })}>Restore recommended</Button><Button size="sm" variant="outline" onClick={() => saveLayout([])}>Reset layout</Button></div> : null}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{layout.map((item, index) => <WidgetFrame key={item.id} item={item} index={index} editing={editing} onMove={(offset) => move(index, offset)} onSize={(size) => setSize(item.id, size)} onHide={() => hide(item.id)} onRefresh={() => item.id === 'mass-pulse' ? void loadMass() : item.id === 'actuarial-news' ? void loadNews() : void loadDashboard()} onSettings={() => setSettingsWidget(item.id)} onDrop={drop}>{item.id === 'suggested-actions' ? <div className="space-y-2">{suggestions.slice(0, Number(item.settings?.maximum) || undefined).map((suggestion) => <Link key={suggestion.id} href={suggestion.href} className="block rounded-lg bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">{suggestion.title}</p><p className="mt-1 text-xs text-slate-500">{suggestion.detail}</p></Link>)}{!suggestions.length ? <p className="text-sm text-slate-600">No high-value suggestions right now. MuksBooks will stay out of your way.</p> : null}</div> : <WidgetBody id={item.id} size={item.size} widgetSettings={item.settings} dashboard={dashboard} mass={mass} news={news} loading={loading} />}</WidgetFrame>)}</div>
    {!layout.length ? <Card className="py-12 text-center"><p className="text-lg font-semibold text-slate-950">Your homepage is clear.</p><p className="mt-2 text-sm text-slate-600">Add only the widgets that help you study.</p><Button className="mt-4" onClick={() => setLibraryOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Widget</Button></Card> : null}
    {libraryOpen ? <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-0 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="Widget Library"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-t-xl bg-white p-5 shadow-2xl sm:rounded-xl"><div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold text-slate-950">Widget Library</h2><p className="mt-1 text-sm text-slate-600">Add only what earns a place on your homepage.</p></div><button onClick={() => setLibraryOpen(false)} className="rounded-full p-2 hover:bg-slate-100" aria-label="Close widget library"><X className="h-5 w-5" /></button></div>{(['Study', 'Learning', 'Career', 'Progress'] as const).map((category) => <section key={category} className="mt-6"><h3 className="font-semibold text-slate-900">{category}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{WIDGETS.filter((widget) => widget.category === category).map((widget) => <div key={widget.id} className="rounded-lg border border-slate-200 p-4"><p className="font-medium text-slate-900">{widget.title}</p><p className="mt-1 text-sm text-slate-600">{widget.description}</p><Button className="mt-3" size="sm" variant={visibleIds.has(widget.id) ? 'outline' : 'default'} disabled={visibleIds.has(widget.id)} onClick={() => add(widget.id)}>{visibleIds.has(widget.id) ? 'On Homepage' : 'Add Widget'}</Button></div>)}</div></section>)}</div></div> : null}
    {settingsWidget ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label="Widget settings"><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-950">{WIDGET_BY_ID[settingsWidget].title} settings</h2><button onClick={() => setSettingsWidget(null)} aria-label="Close widget settings"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-3">{settingsWidget === 'suggested-actions' ? <label className="text-sm font-medium text-slate-700">Show maximum<select value={String(layout.find((item) => item.id === settingsWidget)?.settings?.maximum || 5)} onChange={(event) => setWidgetSettings(settingsWidget, { maximum: Number(event.target.value) })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="3">3</option><option value="5">5</option><option value="8">8</option></select></label> : null}{settingsWidget === 'mass-pulse' ? <fieldset><legend className="text-sm font-medium text-slate-700">Show categories</legend>{['Events', 'MASS Projects', 'Careers', 'Education', 'Community'].map((category) => { const current = layout.find((item) => item.id === settingsWidget)?.settings?.categories; const selected = Array.isArray(current) ? current : ['Events', 'MASS Projects', 'Careers', 'Education', 'Community']; return <label key={category} className="mt-3 flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={selected.includes(category)} onChange={(event) => setWidgetSettings(settingsWidget, { categories: event.target.checked ? [...selected, category] : selected.filter((item) => item !== category) })} />{category}</label> })}</fieldset> : null}{!['suggested-actions', 'mass-pulse'].includes(settingsWidget) ? <p className="text-sm text-slate-600">This widget currently uses your central profile and assistance preferences.</p> : null}</div><Button className="mt-5" onClick={() => { setSettingsWidget(null); if (settingsWidget === 'mass-pulse') void loadMass() }}>Done</Button></div></div> : null}
  </div>
}