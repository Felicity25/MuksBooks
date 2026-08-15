'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { emitAppStateUpdate } from '@/lib/app-state/client-events'

interface DocumentRecord {
  id: string
  filename: string
  original_path?: string | null
  document_type?: string | null
  week?: number | null
  lecture_number?: number | null
  tutorial_number?: number | null
  workshop_number?: number | null
  assessment_number?: number | null
  upload_date?: string | null
  content_hash?: string | null
  version?: number | null
  processing_status?: string | null
  extraction_status?: string | null
  indexing_status?: string | null
  tutor_ready?: boolean
  knowledge_available?: string | null
  summary?: string | null
  metadata?: string | null
  chunk_count?: number | null
  embedded_chunk_count?: number | null
  course_id?: string | null
  course_code?: string | null
  course_name?: string | null
}

interface UploadFormState {
  title: string
  category: string
  source: string
  unit: string
}

interface CourseOption {
  id: string
  code: string
  name: string
}

interface StagedFile {
  id: string
  file: File
  unit: string
  resourceType: string
  relativePath?: string
  status: 'READY' | 'UPLOADING' | 'PROCESSING' | 'INDEXING' | 'COMPLETE' | 'FAILED'
  error?: string
}

interface UploadBatchSummary {
  id: string
  name: string
  status: string
  total_files: number
  completed_files: number
  failed_files: number
  created_at: string
  course_code?: string | null
}

async function readJsonResponse<T>(response: Response, label: string): Promise<T> {
  const raw = await response.text()

  if (!raw) {
    throw new Error(`${label} returned an empty response (${response.status})`)
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`${label} returned invalid JSON (${response.status})`)
  }
}

function normalizeUnitCode(value?: string | null) {
  return value?.toUpperCase().replace(/\s+/g, '') || ''
}

function formatDate(value?: string | null) {
  if (!value) return 'Unknown date'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function inferResourceType(fileName: string) {
  const value = fileName.toLowerCase()
  if (/unit\s*(guide|outline|handbook)/i.test(value)) return 'UNIT_GUIDE'
  if (/formula\s*sheet|cheat\s*sheet/i.test(value)) return 'FORMULA_SHEET'
  if (/exam\s*(solution|answers?)/i.test(value)) return 'EXAM_SOLUTIONS'
  if (/past\s*exam|final\s*exam|exam\s*20\d{2}/i.test(value)) return 'PAST_EXAM'
  if (/assignment\s*\d*\s*(solution|answers?)/i.test(value)) return 'ASSIGNMENT_SOLUTIONS'
  if (/assignment\s*\d*\s*(brief|instruction|spec)/i.test(value)) return 'ASSIGNMENT_INSTRUCTIONS'
  if (/assignment\s*\d*/i.test(value)) return 'ASSIGNMENT'
  if (/(tutorial|tute|tut)\s*\d*\s*(solution|answers?)/i.test(value)) return 'TUTORIAL_SOLUTIONS'
  if (/(tutorial|tute|tut)\s*\d*/i.test(value)) return 'TUTORIAL'
  if (/workshop\s*\d*\s*(solution|answers?)/i.test(value)) return 'WORKSHOP_SOLUTIONS'
  if (/workshop\s*\d*/i.test(value)) return 'WORKSHOP'
  if (/lecture|lec\d+|slides?/i.test(value)) return 'LECTURE_SLIDES'
  if (/reading|paper|journal|article/i.test(value)) return 'READING'
  if (/\.csv$|\.xlsx$|\.xls$/i.test(value)) return 'DATASET'
  if (/notes?/i.test(value)) return 'NOTES'
  return 'OTHER'
}

function statusTone(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('fail')) return 'border-rose-200 bg-rose-50 text-rose-700'
  if (normalized.includes('indexed') || normalized.includes('ready')) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (normalized.includes('extract') || normalized.includes('process')) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function metadataSummary(document: DocumentRecord) {
  const pieces = [
    document.course_code ? document.course_code : null,
    document.document_type,
    document.week ? `Week ${document.week}` : null,
    document.lecture_number ? `Lecture ${document.lecture_number}` : null,
    document.tutorial_number ? `Tutorial ${document.tutorial_number}` : null,
    document.workshop_number ? `Workshop ${document.workshop_number}` : null,
    document.assessment_number ? `Assessment ${document.assessment_number}` : null
  ].filter(Boolean)

  return pieces.length ? pieces.join(' • ') : 'No structured metadata yet'
}

export function UploadsManager() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<UploadFormState>({ title: '', category: 'Lecture slides', source: 'PDF', unit: '' })
  const [selectedUnit, setSelectedUnit] = useState('')
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [batches, setBatches] = useState<UploadBatchSummary[]>([])
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([])
  const [batchResult, setBatchResult] = useState<{ total: number; succeeded: number; failed: number; duplicated: number } | null>(null)
  const [search, setSearch] = useState('')
  const [selectedLibraryUnit, setSelectedLibraryUnit] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedWeek, setSelectedWeek] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'filename' | 'unit' | 'week' | 'fileType'>('newest')
  const [viewMode, setViewMode] = useState<'all' | 'unit'>('all')

  const loadDocuments = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/app-state/documents?sort=newest&limit=1000', { cache: 'no-store' })
      const payload = await readJsonResponse<{ ok?: boolean; documents?: DocumentRecord[]; error?: string }>(response, 'Documents API')

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Failed to load documents')
      }

      setDocuments(Array.isArray(payload.documents) ? payload.documents : [])
    } catch (fetchError: any) {
      setError(fetchError?.message || 'Failed to load uploaded files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDocuments()
    void loadBatches()
    void loadCourses()
  }, [])

  const loadBatches = async () => {
    try {
      const response = await fetch('/api/course-manager/batches?limit=20', { cache: 'no-store' })
      const payload = await readJsonResponse<{ ok?: boolean; batches?: UploadBatchSummary[] }>(response, 'Upload batches API')
      if (response.ok && payload?.ok && Array.isArray(payload.batches)) {
        setBatches(payload.batches)
      }
    } catch {
      setBatches([])
    }
  }

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/app-state/courses', { cache: 'no-store' })
      const payload = await readJsonResponse<{ ok?: boolean; courses?: Array<{ id: string; course_code: string; course_name?: string }> }>(response, 'Courses API')
      if (response.ok && payload?.ok && Array.isArray(payload.courses)) {
        const mapped = payload.courses.map((course) => ({
          id: course.id,
          code: normalizeUnitCode(course.course_code),
          name: course.course_name || course.course_code
        }))
        setCourseOptions(mapped)
      }
    } catch {
      setCourseOptions([])
    }
  }

  const availableUnits = useMemo(() => {
    const units = new Map<string, string>()
    documents.forEach((document) => {
      const code = normalizeUnitCode(document.course_code)
      if (!code) return
      units.set(code, document.course_name || code)
    })
    return Array.from(units.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [documents])

  const availableTypes = useMemo(() => {
    const types = new Set<string>()
    documents.forEach((document) => {
      if (document.document_type) types.add(document.document_type)
    })
    return Array.from(types).sort((a, b) => a.localeCompare(b))
  }, [documents])

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const normalizedUnit = normalizeUnitCode(selectedUnit)

    return documents
      .filter((document) => {
        if (viewMode === 'unit' && normalizedUnit && normalizeUnitCode(document.course_code) !== normalizedUnit) {
          return false
        }

        if (selectedType && (document.document_type || '').toLowerCase() !== selectedType.toLowerCase()) {
          return false
        }

        if (selectedStatus && (document.processing_status || '').toLowerCase() !== selectedStatus.toLowerCase()) {
          return false
        }

        if (selectedWeek) {
          const week = Number(selectedWeek)
          if (!Number.isFinite(week) || Number(document.week ?? NaN) !== week) return false
        }

        if (!normalizedSearch) return true

        const haystack = [
          document.filename,
          document.course_code,
          document.course_name,
          document.document_type,
          document.summary,
          document.metadata,
          document.processing_status,
          document.extraction_status,
          document.indexing_status,
          String(document.week ?? ''),
          String(document.lecture_number ?? ''),
          String(document.tutorial_number ?? ''),
          String(document.workshop_number ?? ''),
          String(document.assessment_number ?? '')
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(normalizedSearch)
      })
      .sort((a, b) => {
        const getDate = (document: DocumentRecord) => new Date(document.upload_date || 0).getTime() || 0

        switch (sortBy) {
          case 'oldest':
            return getDate(a) - getDate(b)
          case 'filename':
            return a.filename.localeCompare(b.filename)
          case 'unit':
            return (a.course_code || '').localeCompare(b.course_code || '') || a.filename.localeCompare(b.filename)
          case 'week':
            return Number(a.week ?? 9999) - Number(b.week ?? 9999) || getDate(b) - getDate(a)
          case 'fileType':
            return (a.document_type || '').localeCompare(b.document_type || '') || getDate(b) - getDate(a)
          case 'newest':
          default:
            return getDate(b) - getDate(a)
        }
      })
  }, [documents, search, selectedLibraryUnit, selectedType, selectedStatus, selectedWeek, sortBy, viewMode])

  const totalCount = documents.length
  const failedCount = documents.filter((document) => /fail/i.test(document.processing_status || '')).length
  const indexedCount = documents.filter((document) => (document.indexing_status || '').toLowerCase() === 'indexed').length
  const activeUnitCount = filteredDocuments.filter((document) => normalizeUnitCode(document.course_code) === normalizeUnitCode(selectedLibraryUnit)).length

  const stagingTotalBytes = stagedFiles.reduce((acc, entry) => acc + entry.file.size, 0)

  const addFilesToStage = (incoming: FileList | File[]) => {
    const files = Array.from(incoming)
    const existingKeys = new Set(stagedFiles.map((entry) => `${entry.file.name}::${entry.file.size}::${entry.file.lastModified}`))
    const additions: StagedFile[] = []

    for (const file of files) {
      const key = `${file.name}::${file.size}::${file.lastModified}`
      if (existingKeys.has(key)) continue
      existingKeys.add(key)

      additions.push({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        file,
        unit: selectedUnit,
        resourceType: inferResourceType(file.name),
        relativePath: (file as any).webkitRelativePath || undefined,
        status: 'READY'
      })
    }

    if (additions.length) {
      setStagedFiles((current) => [...current, ...additions])
    }
  }

  const updateStagedFile = (id: string, update: Partial<StagedFile>) => {
    setStagedFiles((current) => current.map((entry) => (entry.id === id ? { ...entry, ...update } : entry)))
  }

  const removeStagedFile = (id: string) => {
    setStagedFiles((current) => current.filter((entry) => entry.id !== id))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!stagedFiles.length) {
      setError('Select at least one file before uploading.')
      return
    }
    if (!selectedUnit) {
      setError('Select a unit for this batch.')
      return
    }

    setSaving(true)
    setError(null)
    setBatchResult(null)

    stagedFiles.forEach((entry) => updateStagedFile(entry.id, { status: 'UPLOADING', error: undefined }))

    try {
      const form = new FormData()
      form.append('forceNewCurriculum', 'false')
      form.append('courseCode', selectedUnit)
      form.append('batchName', formData.title.trim() || `${selectedUnit} · ${new Date().toLocaleDateString()} · ${stagedFiles.length} files`)

      const fileMetadata = stagedFiles.map((entry) => ({
        fileName: entry.file.name,
        relativePath: entry.relativePath,
        unit: normalizeUnitCode(entry.unit || selectedUnit),
        resourceType: entry.resourceType,
        duplicateStrategy: 'skip'
      }))

      stagedFiles.forEach((entry) => {
        form.append('files', entry.file)
      })
      form.append('fileMetadata', JSON.stringify(fileMetadata))

      const response = await fetch('/api/course-manager/upload', {
        method: 'POST',
        body: form
      })

      const payload = await readJsonResponse<{
        ok?: boolean
        error?: string
        results?: Array<{ fileName: string; ok: boolean; error?: string }>
        summary?: { total: number; succeeded: number; failed: number; duplicated: number }
      }>(response, 'Upload API')
      if (!response.ok) {
        throw new Error(payload?.error || 'Upload failed')
      }

      const results = Array.isArray(payload?.results) ? payload.results : []
      results.forEach((result: any) => {
        const match = stagedFiles.find((entry) => entry.file.name === result.fileName)
        if (!match) return
        updateStagedFile(match.id, {
          status: result.ok ? 'COMPLETE' : 'FAILED',
          error: result.ok ? undefined : (result.error || 'Processing failed')
        })
      })

      if (payload?.summary) {
        setBatchResult(payload.summary)
      }

      await loadDocuments()
      await loadBatches()
      emitAppStateUpdate('uploads')
      setStagedFiles((current) => current.filter((entry) => entry.status === 'FAILED'))
      if (!stagedFiles.some((entry) => entry.status === 'FAILED')) {
        setShowForm(false)
      }
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Upload failed')
      setStagedFiles((current) => current.map((entry) => ({
        ...entry,
        status: entry.status === 'UPLOADING' ? 'FAILED' : entry.status,
        error: entry.status === 'UPLOADING' ? 'Upload failed before processing.' : entry.error
      })))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/app-state/documents?documentId=${encodeURIComponent(documentId)}`, {
        method: 'DELETE'
      })
      const payload = await readJsonResponse<{ ok?: boolean; error?: string }>(response, 'Delete document API')
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Delete failed')
      }

      await loadDocuments()
      emitAppStateUpdate('uploads')
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Delete failed')
    }
  }

  const unitViewLabel = selectedLibraryUnit ? `${selectedLibraryUnit} files` : 'Select a unit to view unit files'

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Persistent file library</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">All academic files, stored once</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              MukBooks now reads uploaded resources from the shared AppState database so files remain available after refresh, restart and new Tutor conversations.
            </p>
          </div>
          <Button onClick={() => setShowForm((current) => !current)}>{showForm ? 'Close upload form' : 'Upload unit resources'}</Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">All files</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{totalCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Indexed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{indexedCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Processing failed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{failedCount}</p>
          </div>
        </div>
      </Card>

      {showForm && (
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Which unit are these files for?</label>
                <select
                  value={selectedUnit}
                  onChange={(event) => {
                    const value = normalizeUnitCode(event.target.value)
                    setSelectedUnit(value)
                    setStagedFiles((current) => current.map((entry) => ({ ...entry, unit: entry.unit || value })))
                  }}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select unit</option>
                  {courseOptions.map((course) => (
                    <option key={course.id} value={course.code}>{course.code} - {course.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Batch name</label>
                <input
                  type="text"
                  placeholder="ETC3420 Full Semester Resources"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Drag your unit files here or choose files/folders</label>
              <div
                onDragOver={(event) => {
                  event.preventDefault()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (event.dataTransfer.files?.length) {
                    addFilesToStage(event.dataTransfer.files)
                  }
                }}
                className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4"
              >
                <p className="text-sm text-slate-600">Upload lectures, tutorials, readings, assignments, exams and more.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                    Choose files
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.xlsx,.xls,image/*"
                      onChange={(event) => {
                        if (event.target.files?.length) {
                          addFilesToStage(event.target.files)
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                    Choose folder
                    <input
                      type="file"
                      multiple
                      onChange={(event) => {
                        if (event.target.files?.length) {
                          addFilesToStage(event.target.files)
                        }
                      }}
                      className="hidden"
                      {...({ webkitdirectory: 'true', directory: 'true' } as any)}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{stagedFiles.length} files selected · {(stagingTotalBytes / (1024 * 1024)).toFixed(1)} MB</p>
                <Button type="button" variant="outline" onClick={() => setStagedFiles([])}>Clear batch</Button>
              </div>

              <div className="mt-3 max-h-72 space-y-2 overflow-auto">
                {stagedFiles.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr_0.4fr] lg:items-center">
                      <div>
                        <p className="truncate text-sm font-semibold text-slate-900">{entry.file.name}</p>
                        <p className="truncate text-xs text-slate-500">{entry.relativePath || 'No folder path'} · {(entry.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <select
                        value={entry.resourceType}
                        onChange={(event) => updateStagedFile(entry.id, { resourceType: event.target.value })}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      >
                        {[
                          'LECTURE', 'LECTURE_SLIDES', 'TUTORIAL', 'TUTORIAL_SOLUTIONS', 'WORKSHOP', 'WORKSHOP_SOLUTIONS',
                          'READING', 'TEXTBOOK_CHAPTER', 'FORMULA_SHEET', 'ASSIGNMENT', 'ASSIGNMENT_INSTRUCTIONS',
                          'ASSIGNMENT_SOLUTIONS', 'PAST_EXAM', 'PRACTICE_EXAM', 'EXAM_SOLUTIONS', 'UNIT_GUIDE', 'DATASET',
                          'NOTES', 'REFERENCE_MATERIAL', 'OTHER'
                        ].map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <input
                        value={entry.unit}
                        onChange={(event) => updateStagedFile(entry.id, { unit: normalizeUnitCode(event.target.value) })}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        placeholder="Unit"
                      />
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(entry.status)}`}>{entry.status}</span>
                      <Button type="button" size="sm" variant="outline" onClick={() => removeStagedFile(entry.id)}>Remove</Button>
                    </div>
                    {entry.error ? <p className="mt-1 text-xs text-rose-700">{entry.error}</p> : null}
                  </div>
                ))}
                {!stagedFiles.length ? <p className="text-sm text-slate-500">No files staged yet.</p> : null}
              </div>
            </div>

            {batchResult ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {batchResult.succeeded} / {batchResult.total} processed, {batchResult.failed} failed, {batchResult.duplicated} duplicates skipped.
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !stagedFiles.length || !selectedUnit}>{saving ? 'Uploading...' : 'Upload & Process Batch'}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setStagedFiles([]) }}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Recent upload batches</p>
        <div className="space-y-2">
          {batches.map((batch) => (
            <div key={batch.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{batch.name}</p>
                <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(batch.status)}`}>{batch.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{batch.course_code || 'UNCLASSIFIED'} · {batch.completed_files}/{batch.total_files} complete · {batch.failed_files} failed · {formatDate(batch.created_at)}</p>
            </div>
          ))}
          {!batches.length ? <p className="text-sm text-slate-500">No upload batches yet.</p> : null}
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Library view</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">{viewMode === 'all' ? 'All files' : unitViewLabel}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={viewMode === 'all' ? 'default' : 'outline'} onClick={() => setViewMode('all')}>All files</Button>
            <Button variant={viewMode === 'unit' ? 'default' : 'outline'} onClick={() => setViewMode('unit')}>Unit files</Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search filename, course, topic, metadata"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm lg:col-span-2"
          />
          <select
            value={viewMode === 'unit' ? selectedLibraryUnit : ''}
            onChange={(event) => setSelectedLibraryUnit(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All units</option>
            {availableUnits.map((unit) => <option key={unit.code} value={unit.code}>{unit.code}</option>)}
          </select>
          <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All file types</option>
            {availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="uploaded">Uploaded</option>
            <option value="processing">Processing</option>
            <option value="processed">Text extracted</option>
            <option value="indexed">Indexed</option>
            <option value="failed">Processing failed</option>
            <option value="archived">Archived</option>
          </select>
          <input
            type="number"
            min="1"
            placeholder="Week"
            value={selectedWeek}
            onChange={(event) => setSelectedWeek(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as any)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="filename">Filename</option>
            <option value="unit">Unit</option>
            <option value="week">Week</option>
            <option value="fileType">File type</option>
          </select>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">Loading stored files...</div>
        ) : filteredDocuments.length ? (
          <div className="space-y-3">
            {filteredDocuments.map((document) => (
              <div key={document.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-slate-950">{document.filename}</p>
                      {document.course_code && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">{document.course_code}</span>}
                      {document.version ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">v{document.version}</span> : null}
                    </div>
                    <p className="text-sm text-slate-500">{metadataSummary(document)}</p>
                    {document.course_name && <p className="text-sm text-slate-500">{document.course_name}</p>}
                    {document.summary && <p className="text-sm leading-6 text-slate-600">{document.summary}</p>}
                    {document.original_path && <p className="break-all text-xs text-slate-400">Source path: {document.original_path}</p>}
                    {document.content_hash && <p className="break-all text-xs text-slate-400">Content hash: {document.content_hash}</p>}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatDate(document.upload_date)}</p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(document.processing_status)}`}>{document.processing_status || 'uploaded'}</span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(document.extraction_status)}`}>{document.extraction_status || 'uploaded'}</span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(document.indexing_status)}`}>{document.indexing_status || 'processing'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <p className="text-xs text-slate-500">{document.chunk_count || 0} chunks</p>
                      <p className="text-xs text-slate-500">{document.tutor_ready ? 'Tutor-ready' : 'Not tutor-ready'}</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleDelete(document.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            {viewMode === 'unit' && !selectedLibraryUnit ? 'Choose a unit to see its stored files.' : 'No files match the current filters.'}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">How it works</p>
        <p className="text-sm leading-6 text-slate-600">
          Files are written to the shared AppState database, linked back to course records, and indexed into the Tutor knowledge pipeline so future sessions can retrieve them again.
        </p>
        <p className="text-sm leading-6 text-slate-600">
          Current filtered count: {filteredDocuments.length}. Unit view count: {activeUnitCount}.
        </p>
      </Card>
    </div>
  )
}
