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
  topics: number
}

export function UnitsManager() {
  const { requireAuth } = useAuth()
  const [units, setUnits] = useState<Unit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [formData, setFormData] = useState({ code: '', name: '', status: 'In progress', topics: 0 })

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
          topics: 0
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

    await fetch('/api/app-state/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseCode: formData.code.toUpperCase(),
        courseName: formData.name,
        source: editingUnit ? 'units_edit' : 'units_form'
      })
    })

    await loadUnits()
    emitAppStateUpdate('courses')
    setEditingUnit(null)
    setFormData({ code: '', name: '', status: 'In progress', topics: 0 })
    setShowForm(false)
  }

  const handleEdit = (unit: Unit) => {
    if (requireAuth('Sign in to edit your units.')) return
    setEditingUnit(unit)
    setFormData({ code: unit.code, name: unit.name, status: unit.status, topics: unit.topics })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (requireAuth('Sign in to manage your units.')) return
    await fetch(`/api/app-state/courses?courseId=${encodeURIComponent(id)}`, { method: 'DELETE' })
    await loadUnits()
    emitAppStateUpdate('courses')
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Active units</p>
          <Button onClick={() => { if (requireAuth('Sign in to create and manage your units.')) return; setShowForm(true); setEditingUnit(null); setFormData({ code: '', name: '', status: 'In progress', topics: 0 }) }}>
            Add Unit
          </Button>
        </div>
        {showForm && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="In progress">In progress</option>
                <option value="Completed">Completed</option>
                <option value="Planned">Planned</option>
              </select>
              <input
                type="number"
                placeholder="Topics"
                value={formData.topics}
                onChange={(e) => setFormData({ ...formData, topics: parseInt(e.target.value) || 0 })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                min="0"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editingUnit ? 'Update' : 'Add'} Unit</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingUnit(null) }}>
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
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{unit.status}</span>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(unit)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(unit.id)}>Delete</Button>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">Weekly topics: {unit.topics}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}