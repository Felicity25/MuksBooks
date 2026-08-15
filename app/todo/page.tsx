import { SectionShell } from '@/components/section-shell'
import { TodoManager } from '@/components/todo-manager'

export default function TodoPage() {
  return (
    <SectionShell title="Task manager" description="Flexible to-dos, subtasks and Kanban-style planning" actionLabel="Add task">
      <TodoManager />
      <div className="mt-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Study workflow</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">Use brain dumps, AI task organisation and daily planning to keep your semester view aligned with priority work.</p>
        </div>
      </div>
    </SectionShell>
  )
}
