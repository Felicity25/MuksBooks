'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { emitAppStateUpdate } from '@/lib/app-state/client-events'
import { useAuth } from '@/components/auth-provider'

interface Unit {
  id: string
  code: string
  name: string
  status: string
  semester: string
  year: number | null
  color: string | null
  topics: number
  masteryLevel: number
}

const COLOR_OPTIONS = [
  { value: 'sky', label: 'Sky' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'amber', label: 'Amber' },
  { value: 'rose', label: 'Rose' },
  { value: 'violet', label: 'Violet' },
  { value: 'slate', label: 'Slate' }
]

const emptyForm = { code: '', name: '', status: 'In progress', semester: '', year: new Date().getFullYear(), color: 'sky' }

export function UnitsManager() {
  const { requireAuth } = useAuth()
  const [units, setUnits] = useState<Unit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadUnits = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/app-state/courses', { cache: 'no-store' })
      const payload = await response.json()
      if (payload?.ok) {
        const mapped = (payload.courses || []).map((course: any) => ({
          id: course.id,
          code: course.course_code,
          name: course.course_name || course.course_code,
          status: course.status === 'completed' ? 'Completed' : course.status === 'planned' ? 'Planned' : 'In progress',
          semester: course.semester || '',
          year: course.year ?? null,
          color: course.color ?? null,
          topics: 0,
          masteryLevel: Math.max(0, Math.min(100, Math.round(Number(course.mastery_level ?? 0))))
        }))
        setUnits(mapped)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadUnits()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (requireAuth('Sign in to create and manage your units.')) return

    setIsSaving(true)
    setError(null)

    try {
      const response = editingUnit
        ? await fetch('/api/app-state/courses', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: editingUnit.id,
              courseCode: formData.code.toUpperCase(),
              courseName: formData.name,
              semester: formData.semester || null,
              year: formData.year || null,
              color: formData.color || null
            })
          })
        : await fetch('/api/app-state/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseCode: formData.code.toUpperCase(),
              courseName: formData.name,
              semester: formData.semester || null,
              year: formData.year || null,
              color: formData.color || null,
              source: 'units_form'
            })
          })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        setError(payload?.error || 'Failed to save unit. Please try again.')
        setIsSaving(false)
        return
      }

      await loadUnits()
      emitAppStateUpdate('courses')
      setEditingUnit(null)
      setFormData(emptyForm)
      setShowForm(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (unit: Unit) => {
    if (requireAuth('Sign in to edit your units.')) return
    setError(null)
    setEditingUnit(unit)
    setFormData({
      code: unit.code,
      name: unit.name,
      status: unit.status,
      semester: unit.semester,
      year: unit.year ?? new Date().getFullYear(),
      color: unit.color || 'sky'
    })
    setShowForm(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/app-state/courses?unitId=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        setError(payload?.error || 'Failed to delete unit. Please try again.')
        setIsDeleting(false)
        setDeleteTarget(null)
        return
      }
      setUnits((prev) => prev.filter((unit) => unit.id !== deleteTarget.id))
      await loadUnits()
      emitAppStateUpdate('courses')
      emitAppStateUpdate('dashboard')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  const updateMastery = async (unitId: string, masteryLevel: number) => {
    if (requireAuth('Sign in to save unit mastery levels.')) return
    setUnits(prev => prev.map((unit) => unit.id === unitId ? { ...unit, masteryLevel } : unit))

    const response = await fetch('/api/app-state/unit-mastery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: unitId, masteryLevel })
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error || 'Failed to save mastery level')
    }

    emitAppStateUpdate('dashboard')
    emitAppStateUpdate('settings')
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Active units</p>
          <Button onClick={() => { if (requireAuth('Sign in to create and manage your units.')) return; setError(null); setShowForm(true); setEditingUnit(null); setFormData(emptyForm) }}>
            Add Unit
          </Button>
        </div>

        {error && !showForm && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Unit Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Unit Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Semester (e.g. Semester 2)"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Year"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                min="2000"
              />
              <select
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              >
                {COLOR_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : `${editingUnit ? 'Update' : 'Add'} Unit`}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingUnit(null); setError(null) }}>
                Cancel
              </Button>
            </div>
          </form>
        )}
        <div className="mt-4 space-y-3">
          {!isLoading && units.length === 0 ? <p className="text-sm text-slate-600">No active units yet. Add your first unit.</p> : null}
          {units.map((unit) => (
            <div key={unit.id} className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">{unit.code}</p>
                  <p className="text-sm text-slate-600">{unit.name}</p>
                  {(unit.semester || unit.year) && (
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                      {[unit.semester, unit.year].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{unit.status}</span>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(unit)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteTarget(unit)}>Delete</Button>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">Weekly topics: {unit.topics}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Mastery level</span>
                    <span className="font-semibold text-slate-900">{unit.masteryLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={unit.masteryLevel}
                    onChange={(event) => {
                      const masteryLevel = Number(event.target.value)
                      void updateMastery(unit.id, masteryLevel)
                    }}
                    className="w-full accent-sky-600"
                    aria-label={`Mastery level for ${unit.code}`}
                  />
                  <div className="flex justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
                    <span>Beginning</span>
                    <span>Mastered</span>
                  </div>
                </div>
            </div>
          ))}
        </div>
      </Card>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-950">Delete {deleteTarget.code}?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This removes the unit and its semester schedule from Units, Planner, Tutor and Uploads on every device.
              Uploaded files are kept unless you delete them separately.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={isDeleting} onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button type="button" variant="destructive" disabled={isDeleting} onClick={() => void confirmDelete()}>
                {isDeleting ? 'Deleting...' : 'Delete unit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}