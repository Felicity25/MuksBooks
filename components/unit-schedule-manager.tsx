'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'

interface UnitOption {
  id: string
  code: string
  name: string
}

interface ScheduleRow {
  id?: string
  weekNumber: number
  startDate: string | null
  endDate: string | null
  topic: string
  additionalTopics: string[]
  notes: string | null
  isBreak: boolean
  sourceUploadId?: string | null
  extractionConfidence?: number | null
}

function mapApiRow(row: any): ScheduleRow {
  return {
    id: row.id,
    weekNumber: row.week_number,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    topic: row.topic ?? '',
    additionalTopics: Array.isArray(row.additional_topics) ? row.additional_topics : [],
    notes: row.notes ?? null,
    isBreak: Boolean(row.is_break),
    sourceUploadId: row.source_upload_id ?? null,
    extractionConfidence: row.extraction_confidence ?? null
  }
}

const emptyDraft: ScheduleRow = { weekNumber: 1, startDate: null, endDate: null, topic: '', additionalTopics: [], notes: null, isBreak: false }

export function UnitScheduleManager() {
  const { requireAuth } = useAuth()
  const [units, setUnits] = useState<UnitOption[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')
  const [rows, setRows] = useState<ScheduleRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [draft, setDraft] = useState<ScheduleRow | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const [showUpload, setShowUpload] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [preview, setPreview] = useState<ScheduleRow[] | null>(null)
  const [isSavingPreview, setIsSavingPreview] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [unitsRes, calendarRes] = await Promise.all([
          fetch('/api/app-state/courses', { cache: 'no-store' }),
          fetch('/api/semester-calendar', { cache: 'no-store' })
        ])
        const unitsPayload = await unitsRes.json().catch(() => null)
        if (unitsPayload?.ok) {
          const mapped: UnitOption[] = (unitsPayload.courses || []).map((c: any) => ({ id: c.id, code: c.course_code, name: c.course_name || c.course_code }))
          setUnits(mapped)
          setSelectedUnitId((prev) => prev || mapped[0]?.id || '')
        }
        const calendarPayload = await calendarRes.json().catch(() => null)
        if (calendarPayload?.ok && calendarPayload.current?.weekNumber) {
          setCurrentWeekNumber(calendarPayload.current.weekNumber)
        }
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  const loadSchedule = async (unitId: string) => {
    if (!unitId) { setRows([]); return }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/app-state/unit-schedule?unitId=${encodeURIComponent(unitId)}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        setError(payload?.error || 'Failed to load schedule.')
        setRows([])
        return
      }
      setRows((payload.entries || []).map(mapApiRow))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedUnitId) void loadSchedule(selectedUnitId)
  }, [selectedUnitId])

  const selectedUnit = useMemo(() => units.find((u) => u.id === selectedUnitId) || null, [units, selectedUnitId])

  const weekBadge = (weekNumber: number) => {
    if (currentWeekNumber == null) return null
    if (weekNumber === currentWeekNumber) return <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">This week</span>
    if (weekNumber === currentWeekNumber - 1) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Last week</span>
    if (weekNumber === currentWeekNumber + 1) return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Next week</span>
    return null
  }

  const saveDraft = async () => {
    if (!draft || !selectedUnitId) return
    if (requireAuth('Sign in to edit the semester schedule.')) return
    setIsSavingDraft(true)
    setError(null)
    try {
      const response = await fetch('/api/app-state/unit-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          unitId: selectedUnitId,
          weekNumber: draft.weekNumber,
          startDate: draft.startDate,
          endDate: draft.endDate,
          topic: draft.topic,
          additionalTopics: draft.additionalTopics,
          notes: draft.notes,
          isBreak: draft.isBreak
        })
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        setError(payload?.error || 'Failed to save week.')
        return
      }
      setDraft(null)
      await loadSchedule(selectedUnitId)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const deleteRow = async (entryId?: string) => {
    if (!entryId) return
    if (!window.confirm('Delete this week from the schedule?')) return
    if (requireAuth('Sign in to edit the semester schedule.')) return
    await fetch(`/api/app-state/unit-schedule?entryId=${encodeURIComponent(entryId)}`, { method: 'DELETE' })
    await loadSchedule(selectedUnitId)
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedUnitId) return
    if (requireAuth('Sign in to upload a unit schedule.')) return

    setIsUploading(true)
    setUploadMessage(null)
    setError(null)
    try {
      const form = new FormData()
      form.append('unitId', selectedUnitId)
      Array.from(files).forEach((file) => form.append('files', file))

      const response = await fetch('/api/course-manager/schedule-upload', { method: 'POST', body: form })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.ok) {
        setUploadMessage(payload?.error || 'Failed to process the uploaded file(s).')
        return
      }

      if (payload.message) setUploadMessage(payload.message)

      const extracted: ScheduleRow[] = (payload.entries || []).map((e: any) => ({
        weekNumber: e.weekNumber,
        startDate: null,
        endDate: null,
        topic: e.topic,
        additionalTopics: e.additionalTopics || [],
        notes: null,
        isBreak: Boolean(e.isBreak),
        sourceUploadId: e.sourceUploadId ?? null,
        extractionConfidence: e.confidence ?? null
      }))

      // Merge with existing saved rows so unrelated weeks aren't lost when the preview is saved.
      const merged = new Map<number, ScheduleRow>()
      rows.forEach((row) => merged.set(row.weekNumber, { ...row }))
      extracted.forEach((row) => {
        const existing = merged.get(row.weekNumber)
        merged.set(row.weekNumber, existing ? { ...existing, topic: row.topic, additionalTopics: row.additionalTopics, isBreak: row.isBreak, sourceUploadId: row.sourceUploadId, extractionConfidence: row.extractionConfidence } : row)
      })

      setPreview(Array.from(merged.values()).sort((a, b) => a.weekNumber - b.weekNumber))
    } finally {
      setIsUploading(false)
    }
  }

  const savePreview = async () => {
    if (!preview || !selectedUnitId) return
    if (requireAuth('Sign in to save the semester schedule.')) return
    setIsSavingPreview(true)
    setError(null)
    try {
      const response = await fetch('/api/app-state/unit-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: selectedUnitId, entries: preview })
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        setError(payload?.error || 'Failed to save schedule.')
        return
      }
      setPreview(null)
      setShowUpload(false)
      setUploadMessage(null)
      await loadSchedule(selectedUnitId)
    } finally {
      setIsSavingPreview(false)
    }
  }

  const updatePreviewRow = (index: number, changes: Partial<ScheduleRow>) => {
    setPreview((prev) => {
      if (!prev) return prev
      const next = [...prev]
      next[index] = { ...next[index], ...changes }
      return next
    })
  }

  const removePreviewRow = (index: number) => {
    setPreview((prev) => (prev ? prev.filter((_, i) => i !== index) : prev))
  }

  if (!isLoading && units.length === 0) {
    return (
      <Card className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Unit weekly schedule</p>
        <p className="text-sm text-slate-600">Add a unit first, then upload or build its weekly schedule here.</p>
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Unit weekly schedule</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{selectedUnit ? `${selectedUnit.code} · ${selectedUnit.name}` : 'Select a unit'}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {units.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => { if (requireAuth('Sign in to edit the semester schedule.')) return; setDraft({ ...emptyDraft, weekNumber: (rows[rows.length - 1]?.weekNumber ?? 0) + 1 }) }}>
            Add week
          </Button>
          <Button size="sm" onClick={() => { if (requireAuth('Sign in to upload a unit schedule.')) return; setShowUpload((v) => !v); setUploadMessage(null) }}>
            Upload Unit Schedule
          </Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {showUpload && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">Upload a unit guide, handbook or teaching schedule</p>
          <p className="mt-1 text-sm text-slate-600">PDF, DOCX, PPTX or TXT. We&apos;ll try to detect each week&apos;s topic automatically — you can edit everything before saving.</p>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
            className="mt-3 text-sm"
            onChange={(e) => void handleUpload(e.target.files)}
            disabled={isUploading}
          />
          {isUploading && <p className="mt-2 text-sm text-slate-500">Analyzing document(s)...</p>}
          {uploadMessage && <p className="mt-2 text-sm text-slate-600">{uploadMessage}</p>}
        </div>
      )}

      {preview && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-950">Review extracted schedule ({preview.length} weeks)</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPreview(null)}>Discard</Button>
              <Button size="sm" onClick={() => void savePreview()} disabled={isSavingPreview}>{isSavingPreview ? 'Saving...' : 'Save schedule'}</Button>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {preview.map((row, index) => (
              <div key={`${row.id || 'new'}-${index}`} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                <input
                  type="number"
                  value={row.weekNumber}
                  onChange={(e) => updatePreviewRow(index, { weekNumber: parseInt(e.target.value) || row.weekNumber })}
                  className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  aria-label="Week number"
                />
                <input
                  type="text"
                  value={row.topic}
                  onChange={(e) => updatePreviewRow(index, { topic: e.target.value })}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="Topic"
                />
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input type="checkbox" checked={row.isBreak} onChange={(e) => updatePreviewRow(index, { isBreak: e.target.checked })} />
                  Break/no class
                </label>
                <Button size="sm" variant="ghost" onClick={() => removePreviewRow(index)}>Remove</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {draft && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">{draft.id ? 'Edit week' : 'Add week'}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              placeholder="Week number"
              value={draft.weekNumber}
              onChange={(e) => setDraft({ ...draft, weekNumber: parseInt(e.target.value) || 1 })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              min={1}
            />
            <input
              type="text"
              placeholder="Topic"
              value={draft.topic}
              onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="text"
              placeholder="Additional topics (comma separated)"
              value={draft.additionalTopics.join(', ')}
              onChange={(e) => setDraft({ ...draft, additionalTopics: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              placeholder="Notes"
              value={draft.notes || ''}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              rows={2}
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={draft.isBreak} onChange={(e) => setDraft({ ...draft, isBreak: e.target.checked })} />
              Mark as break / no class
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void saveDraft()} disabled={isSavingDraft || !draft.topic}>{isSavingDraft ? 'Saving...' : 'Save week'}</Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {!isLoading && rows.length === 0 && !preview ? (
          <p className="text-sm text-slate-600">No weekly schedule yet. Upload a unit guide or add weeks manually.</p>
        ) : null}
        {rows.map((row) => (
          <div key={row.id} className={`rounded-2xl border p-3 text-sm ${row.weekNumber === currentWeekNumber ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-950">Week {row.weekNumber}</p>
                  {weekBadge(row.weekNumber)}
                  {row.isBreak && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Break</span>}
                </div>
                <p className="mt-1 text-slate-700">{row.topic}</p>
                {row.additionalTopics.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-slate-600">
                    {row.additionalTopics.map((topic, i) => <li key={i}>{topic}</li>)}
                  </ul>
                )}
                {row.notes && <p className="mt-1 text-xs text-slate-500">{row.notes}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => { if (requireAuth('Sign in to edit the semester schedule.')) return; setDraft(row) }}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => void deleteRow(row.id)}>Delete</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
