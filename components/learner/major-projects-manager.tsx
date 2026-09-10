'use client'

import { useState } from 'react'
import { Flag, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCurriculum } from '@/components/learner/curriculum-context'
import type { MajorProject } from '@/lib/learner/store'

export function MajorProjectsManager() {
  const { profile, saveProfile } = useCurriculum()
  const projects = profile.projects
  const [form, setForm] = useState({ title: '', type: 'IA' as MajorProject['type'], dueDate: '', status: 'In progress', milestone: '' })

  const persist = (next: MajorProject[]) => void saveProfile({ projects: next })

  const addProject = () => {
    if (!form.title.trim()) return
    const next = [{
      id: `${Date.now()}`,
      title: form.title.trim(),
      type: form.type,
      dueDate: form.dueDate || '2026-11-30',
      status: form.status,
      milestone: form.milestone.trim() || 'Plan next milestone and review progress.'
    }, ...projects]
    persist(next)
    setForm({ title: '', type: 'IA', dueDate: '', status: 'In progress', milestone: '' })
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Flag className="h-4 w-4 text-sky-700" />
          IB major-project management
        </div>
        <Button type="button" onClick={addProject} size="sm"><Plus className="mr-2 h-4 w-4" />Add project</Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Project title" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as MajorProject['type'] })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
          {['IA', 'EE', 'TOK', 'CAS', 'Mock', 'Exam', 'Oral'].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <input value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} placeholder="Status" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        <div className="md:col-span-2 xl:col-span-3">
          <input value={form.milestone} onChange={(event) => setForm({ ...form, milestone: event.target.value })} placeholder="Next milestone or action" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-slate-900">{project.title}</p>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">{project.type}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Due: {project.dueDate} • Status: {project.status}</p>
            <p className="mt-2 text-xs text-slate-600">{project.milestone}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
