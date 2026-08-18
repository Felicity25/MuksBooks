'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/components/auth-provider'
import { useGlobalStudy } from '@/components/study/global-study-provider'
import { useReadAloud } from '@/components/study/read-aloud-provider'

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function GlobalStudyBar() {
  const { user } = useAuth()
  const {
    tasks,
    prefs,
    state,
    summary,
    recentSessions,
    setActiveTask,
    setCustomTaskTitle,
    updatePrefs,
    start,
    pause,
    resume,
    reset,
    skip,
    addMinutes,
    currentRemainingMs
  } = useGlobalStudy()
  const readAloud = useReadAloud()

  const [expanded, setExpanded] = useState(false)
  const [readerText, setReaderText] = useState('')
  const [readerStatus, setReaderStatus] = useState<string | null>(null)

  const canRun = Boolean(state.activeTaskTitle.trim())
  const phaseLabel = state.phase === 'focus' ? 'Focus' : state.phase === 'short_break' ? 'Short break' : 'Long break'
  const phaseTone = state.phase === 'focus' ? 'bg-slate-950 text-white' : 'bg-emerald-100 text-emerald-900'

  const readAloudStatus = useMemo(() => {
    if (readAloud.status === 'idle') return 'Idle'
    if (readAloud.status === 'paused') return 'Paused'
    return `Reading chunk ${readAloud.currentChunkIndex + 1}`
  }, [readAloud.currentChunkIndex, readAloud.status])

  if (!user) return null

  const onReaderFile = async (file?: File) => {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !['txt', 'md', 'csv'].includes(extension)) {
      setReaderStatus('This file type cannot be safely read aloud yet. Please use .txt, .md or .csv, or paste text.')
      return
    }
    const text = await file.text()
    setReaderText(text)
    setReaderStatus(`Loaded ${file.name}`)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:px-6">
        <span className={`inline-flex min-w-[96px] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${phaseTone}`} aria-label={`Current phase: ${phaseLabel}`}>
          {phaseLabel}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{state.activeTaskTitle || 'Choose a task to start studying'}</p>
          <p className="text-xs text-slate-500">Today: {summary.focusedMinutes} min · {summary.sessionCount} sessions</p>
        </div>
        <p className="w-16 text-right font-mono text-lg font-semibold text-slate-950" aria-live="polite">{formatRemaining(currentRemainingMs)}</p>
        {state.status === 'running' ? <Button size="sm" onClick={pause} aria-label="Pause timer">Pause</Button> : null}
        {state.status === 'paused' ? <Button size="sm" onClick={resume} aria-label="Resume timer">Resume</Button> : null}
        {state.status === 'idle' ? <Button size="sm" onClick={start} disabled={!canRun} aria-label="Start focus timer">Start</Button> : null}
        <Button size="sm" variant="outline" onClick={() => setExpanded((prev) => !prev)} aria-expanded={expanded} aria-controls="global-study-panel">
          {expanded ? 'Hide' : 'Study'}
        </Button>
      </div>

      {expanded ? (
        <div id="global-study-panel" className="border-t border-slate-200 px-3 pb-3 pt-2 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-3">
            <Card className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Task + Timer</p>
              <label className="text-xs font-medium text-slate-700">Planner task</label>
              <select
                value={state.activeTaskId || ''}
                onChange={(event) => {
                  const value = event.target.value || null
                  setActiveTask(value)
                }}
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                aria-label="Select planner task"
              >
                <option value="">Custom task</option>
                {tasks.map((task) => <option key={task.id} value={task.id}>{task.courseCode ? `${task.courseCode} · ` : ''}{task.title}</option>)}
              </select>
              <input
                value={state.activeTaskTitle}
                onChange={(event) => setCustomTaskTitle(event.target.value)}
                placeholder="Current study task"
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                aria-label="Current task title"
              />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="space-y-1">Focus
                  <input type="number" min={5} max={180} value={prefs.focusMinutes} onChange={(event) => updatePrefs({ focusMinutes: Number(event.target.value) || 25 })} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" aria-label="Focus duration minutes" />
                </label>
                <label className="space-y-1">Short break
                  <input type="number" min={1} max={60} value={prefs.shortBreakMinutes} onChange={(event) => updatePrefs({ shortBreakMinutes: Number(event.target.value) || 5 })} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" aria-label="Short break duration minutes" />
                </label>
                <label className="space-y-1">Long break
                  <input type="number" min={1} max={90} value={prefs.longBreakMinutes} onChange={(event) => updatePrefs({ longBreakMinutes: Number(event.target.value) || 20 })} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" aria-label="Long break duration minutes" />
                </label>
                <label className="space-y-1">Cycles
                  <input type="number" min={1} max={12} value={prefs.cycles} onChange={(event) => updatePrefs({ cycles: Number(event.target.value) || 4 })} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" aria-label="Pomodoro cycle count" />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => addMinutes(5)} aria-label="Add five minutes">+5m</Button>
                <Button size="sm" variant="outline" onClick={skip} aria-label="Skip current phase">Skip</Button>
                <Button size="sm" variant="outline" onClick={reset} aria-label="Reset timer">Reset</Button>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.autoStartBreaks} onChange={(event) => updatePrefs({ autoStartBreaks: event.target.checked })} />Auto-start breaks</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.autoStartFocus} onChange={(event) => updatePrefs({ autoStartFocus: event.target.checked })} />Auto-start focus</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.notificationsEnabled} onChange={(event) => {
                  if (event.target.checked && 'Notification' in window && Notification.permission === 'default') {
                    void Notification.requestPermission()
                  }
                  updatePrefs({ notificationsEnabled: event.target.checked })
                }} />Completion notifications</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.muted} onChange={(event) => updatePrefs({ muted: event.target.checked })} />Mute bell</label>
                <label className="block">Bell volume
                  <input type="range" min={0} max={1} step={0.05} value={prefs.volume} onChange={(event) => updatePrefs({ volume: Number(event.target.value) })} className="w-full" aria-label="Bell volume" />
                </label>
              </div>
            </Card>

            <Card className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Study Reader</p>
              <textarea
                value={readerText}
                onChange={(event) => setReaderText(event.target.value)}
                placeholder="Paste notes, tutor response, or revision text..."
                className="h-32 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                aria-label="Study reader text"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => readAloud.speakText(readerText)} disabled={!readerText.trim()}>Read aloud</Button>
                <Button size="sm" variant="outline" onClick={readAloud.readSelection}>Read selection</Button>
                <input
                  type="file"
                  accept=".txt,.md,.csv"
                  onChange={(event) => { void onReaderFile(event.target.files?.[0]) }}
                  aria-label="Load supported text file"
                  className="text-xs"
                />
              </div>
              {readerStatus ? <p className="text-xs text-slate-500">{readerStatus}</p> : null}
              <p className="text-xs text-slate-500" aria-live="polite">{readAloudStatus}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label>Speed
                  <input type="range" min={0.7} max={1.5} step={0.05} value={readAloud.rate} onChange={(event) => readAloud.setRate(Number(event.target.value))} className="w-full" aria-label="Read aloud speed" />
                </label>
                <label>Volume
                  <input type="range" min={0} max={1} step={0.05} value={readAloud.volume} onChange={(event) => readAloud.setVolume(Number(event.target.value))} className="w-full" aria-label="Read aloud volume" />
                </label>
                <label>Voice
                  <select value={readAloud.voiceURI} onChange={(event) => readAloud.setVoiceURI(event.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" aria-label="Read aloud voice">
                    {readAloud.voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>)}
                  </select>
                </label>
                <label>Math detail
                  <select value={readAloud.mathDetail} onChange={(event) => readAloud.setMathDetail(event.target.value as 'brief' | 'detailed')} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" aria-label="Math speech detail">
                    <option value="brief">Brief</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={readAloud.pause} disabled={readAloud.status !== 'playing'}>Pause</Button>
                <Button size="sm" variant="outline" onClick={readAloud.resume} disabled={readAloud.status !== 'paused'}>Resume</Button>
                <Button size="sm" variant="outline" onClick={readAloud.previousChunk} disabled={!readAloud.chunks.length}>Prev</Button>
                <Button size="sm" variant="outline" onClick={readAloud.nextChunk} disabled={!readAloud.chunks.length}>Next</Button>
                <Button size="sm" variant="outline" onClick={readAloud.stop} disabled={readAloud.status === 'idle'}>Stop</Button>
              </div>
            </Card>

            <Card className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Focus history</p>
              <p className="text-sm text-slate-700">Today: <strong>{summary.focusedMinutes}</strong> focused minutes across <strong>{summary.sessionCount}</strong> sessions.</p>
              <ul className="space-y-2 text-sm text-slate-600" aria-label="Recent focus sessions">
                {recentSessions.length === 0 ? <li>No completed focus sessions yet.</li> : null}
                {recentSessions.map((session) => (
                  <li key={session.id} className="rounded-md border border-slate-200 px-2 py-1">
                    <p className="font-medium text-slate-800">{session.title}</p>
                    <p className="text-xs text-slate-500">{session.duration_minutes} min · {new Date(session.started_at).toLocaleString('en-AU')}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
