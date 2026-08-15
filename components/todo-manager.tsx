'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSessionPersistence, restoreSessionState } from '@/lib/session-persistence'

interface Task {
  id: string
  title: string
  status: string
  due: string
  unit: string
}

export function TodoManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({ title: '', status: 'Not started', due: '', unit: '' })
  const [filter, setFilter] = useState('All')
  const saveSession = useSessionPersistence('todoState', { tasks, showForm, editingTask, formData, filter })

  useEffect(() => {
    const saved = restoreSessionState('tasks')
    if (saved && Array.isArray(saved)) {
      setTasks(saved)
    } else {
      const defaultTasks = [
        { id: '1', title: 'Finish assignment plan', status: 'In progress', due: 'Tomorrow', unit: 'BFF5926' },
        { id: '2', title: 'Review weak topic notes', status: 'Not started', due: 'Today', unit: 'ETC3430' },
        { id: '3', title: 'Submit draft for feedback', status: 'Waiting', due: 'Friday', unit: 'ETC3460' }
      ]
      setTasks(defaultTasks)
      localStorage.setItem('tasks', JSON.stringify(defaultTasks))
    }
  }, [])

  useEffect(() => {
    saveSession({ tasks })
  }, [tasks])

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks)
    localStorage.setItem('tasks', JSON.stringify(newTasks))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingTask) {
      const updated = tasks.map(t => t.id === editingTask.id ? { ...t, ...formData } : t)
      saveTasks(updated)
      setEditingTask(null)
    } else {
      const newTask: Task = { ...formData, id: Date.now().toString() }
      saveTasks([...tasks, newTask])
    }
    setFormData({ title: '', status: 'Not started', due: '', unit: '' })
    setShowForm(false)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({ title: task.title, status: task.status, due: task.due, unit: task.unit })
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    saveTasks(tasks.filter(t => t.id !== id))
  }

  const toggleComplete = (id: string) => {
    const updated = tasks.map(t => 
      t.id === id ? { ...t, status: t.status === 'Completed' ? 'Not started' : 'Completed' } : t
    )
    saveTasks(updated)
  }

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter)

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Task manager</p>
          <Button onClick={() => setShowForm(true)}>Add Task</Button>
        </div>

        <div className="flex gap-2">
          {['All', 'Not started', 'In progress', 'Completed', 'Waiting'].map(status => (
            <Button
              key={status}
              size="sm"
              variant={filter === status ? 'default' : 'outline'}
              onClick={() => setFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Task title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Due date"
                value={formData.due}
                onChange={(e) => setFormData({ ...formData, due: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Not started">Not started</option>
                <option value="In progress">In progress</option>
                <option value="Completed">Completed</option>
                <option value="Waiting">Waiting</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editingTask ? 'Update' : 'Add'} Task</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingTask(null) }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div key={task.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`font-semibold ${task.status === 'Completed' ? 'line-through text-slate-500' : 'text-slate-950'}`}>
                    {task.title}
                  </p>
                  <p className="text-sm text-slate-600">{task.unit} • Due {task.due}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Status: {task.status}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleComplete(task.id)}>
                    {task.status === 'Completed' ? 'Mark Incomplete' : 'Mark Complete'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(task)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(task.id)}>Delete</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}