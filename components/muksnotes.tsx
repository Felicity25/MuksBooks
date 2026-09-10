'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, FileText, Folder, FolderPlus, Grid3X3, Maximize2, Minimize2, NotebookPen, PenSquare, Plus, Search, Sigma, Sparkles, Star, Trash2, Upload, Wand2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createFolderRecord, createInitialNotebook, createNoteRecord, sortNotesByUpdatedAt, buildNoteSearchIndex, summarizeNoteText, type NoteRecord, type NotebookRecord, type FolderRecord } from '@/lib/notes/notes-core'

const STORAGE_KEY = 'muksbooks:notes:v1'

function loadInitialState(): { notebooks: NotebookRecord[]; notes: NoteRecord[]; folders: FolderRecord[] } {
  if (typeof window === 'undefined') {
    const personal = createInitialNotebook({ name: 'Personal', userId: 'guest' })
    const sample = createNoteRecord({ notebookId: personal.id, userId: 'guest', title: 'Quick ideas', body: 'Capture thoughts, formulas, and review notes here.', tags: ['ideas'] })
    const folder = createFolderRecord({ name: 'MuksFocus', userId: 'guest' })
    return { notebooks: [personal], notes: [sample], folders: [folder] }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const personal = createInitialNotebook({ name: 'Personal', userId: 'guest' })
      const sample = createNoteRecord({ notebookId: personal.id, userId: 'guest', title: 'Quick ideas', body: 'Capture thoughts, formulas, and review notes here.', tags: ['ideas'] })
      const folder = createFolderRecord({ name: 'MuksFocus', userId: 'guest' })
      return { notebooks: [personal], notes: [sample], folders: [folder] }
    }
    const parsed = JSON.parse(raw) as { notebooks?: NotebookRecord[]; notes?: NoteRecord[]; folders?: FolderRecord[] }
    if (Array.isArray(parsed.notebooks) && parsed.notebooks.length) return { notebooks: parsed.notebooks, notes: Array.isArray(parsed.notes) ? parsed.notes : [], folders: Array.isArray(parsed.folders) ? parsed.folders : [createFolderRecord({ name: 'MuksFocus', userId: 'guest' })] }
  } catch {
    // fallback taken below
  }

  const personal = createInitialNotebook({ name: 'Personal', userId: 'guest' })
  const sample = createNoteRecord({ notebookId: personal.id, userId: 'guest', title: 'Quick ideas', body: 'Capture thoughts, formulas, and review notes here.', tags: ['ideas'] })
  const folder = createFolderRecord({ name: 'MuksFocus', userId: 'guest' })
  return { notebooks: [personal], notes: [sample], folders: [folder] }
}

export function MuksNotesWorkspace() {
  const { user, isGuest } = useAuth()
  const [notebooks, setNotebooks] = useState<NotebookRecord[]>([])
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [folders, setFolders] = useState<FolderRecord[]>([])
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  const [showMathSymbols, setShowMathSymbols] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const initial = loadInitialState()
    setNotebooks(initial.notebooks)
    setNotes(initial.notes)
    setFolders(initial.folders)
    setSelectedNotebookId(initial.notebooks[0]?.id || null)
    setSelectedNoteId(initial.notes[0]?.id || null)
    setSelectedFolderId(initial.folders[0]?.id || null)

    if (user && !isGuest) {
      void fetch('/api/app-state/notes', { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) return
          const payload = await response.json().catch(() => null)
          if (!payload?.ok) return
          const nextNotebooks = Array.isArray(payload.notebooks) && payload.notebooks.length ? payload.notebooks : initial.notebooks
          const nextNotes = Array.isArray(payload.notes) && payload.notes.length ? payload.notes : initial.notes
          const nextFolders = Array.isArray(payload.folders) && payload.folders.length ? payload.folders : initial.folders
          setNotebooks(nextNotebooks)
          setNotes(nextNotes)
          setFolders(nextFolders)
          setSelectedNotebookId(nextNotebooks[0]?.id || null)
          setSelectedNoteId(nextNotes[0]?.id || null)
          setSelectedFolderId(nextFolders[0]?.id || null)
        })
        .catch(() => undefined)
    }
  }, [isGuest, user])

  useEffect(() => {
    if (!notebooks.length && !notes.length && !folders.length) return
    setIsSaving(true)
    const timer = window.setTimeout(() => {
      if (isGuest) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ notebooks, notes, folders }))
      } else if (user) {
        void fetch('/api/app-state/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'sync', notebooks, notes, folders })
        })
      }
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      setIsSaving(false)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [folders, isGuest, notebooks, notes, user])

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sortNotesByUpdatedAt(notes.filter((note) => {
      if (!selectedNotebookId) return true
      if (note.notebookId !== selectedNotebookId) return false
      if (selectedFolderId && note.folderId && note.folderId !== selectedFolderId) return false
      if (selectedFolderId && !note.folderId) return false
      if (!query) return true
      return buildNoteSearchIndex(note).includes(query)
    }))
  }, [notes, search, selectedFolderId, selectedNotebookId])

  const currentNote = visibleNotes.find((note) => note.id === selectedNoteId) || visibleNotes[0] || null

  useEffect(() => {
    if (!visibleNotes.length) return
    if (!selectedNoteId || !visibleNotes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(visibleNotes[0].id)
    }
  }, [selectedNoteId, visibleNotes])

  const createNotebook = () => {
    const personal = createInitialNotebook({ name: `Notebook ${notebooks.length + 1}` })
    setNotebooks((current) => [personal, ...current])
    setSelectedNotebookId(personal.id)
  }

  const createFolder = () => {
    const folder = createFolderRecord({ name: `Folder ${folders.length + 1}`, userId: user?.id || 'guest' })
    setFolders((current) => [folder, ...current])
    setSelectedFolderId(folder.id)
  }

  const createNote = () => {
    if (!selectedNotebookId) return
    const next = createNoteRecord({
      notebookId: selectedNotebookId,
      folderId: selectedFolderId,
      title: `New note ${notes.filter((note) => note.notebookId === selectedNotebookId).length + 1}`,
      body: '# New note\n\n- Start with your main idea\n- Add supporting detail\n- Capture the takeaway',
      tags: ['new']
    })
    setNotes((current) => [next, ...current])
    setSelectedNoteId(next.id)
  }

  const updateCurrentNote = (patch: Partial<NoteRecord>) => {
    if (!currentNote) return
    setNotes((current) => current.map((note) => note.id === currentNote.id ? {
      ...note,
      ...patch,
      summary: patch.summary ?? patch.body ? summarizeNoteText(String(patch.body ?? note.body)) : note.summary,
      updatedAt: new Date().toISOString(),
      lastEditedAt: new Date().toISOString()
    } : note))
  }

  const deleteNote = (noteId: string) => {
    setNotes((current) => current.filter((note) => note.id !== noteId))
    if (selectedNoteId === noteId) {
      const fallback = currentNote ? currentNote.id : null
      setSelectedNoteId(fallback && fallback !== noteId ? fallback : null)
    }
  }

  const duplicateNote = (noteId: string) => {
    const target = notes.find((note) => note.id === noteId)
    if (!target) return
    const copy = createNoteRecord({
      notebookId: target.notebookId,
      title: `${target.title} copy`,
      body: target.body,
      tags: target.tags,
      folderId: target.folderId,
      context: target.context,
      attachments: target.attachments
    })
    setNotes((current) => [copy, ...current])
    setSelectedNoteId(copy.id)
  }

  const addNoteAttachment = () => {
    if (!currentNote) return
    const attachment = { id: `att_${Math.random().toString(36).slice(2, 8)}`, name: 'Image upload', type: 'image' as const, createdAt: new Date().toISOString() }
    updateCurrentNote({ attachments: [...currentNote.attachments, attachment] })
  }

  const generateAiSummary = () => {
    if (!currentNote) return
    const summary = summarizeNoteText(currentNote.body)
    updateCurrentNote({ summary })
  }

  const applyMarkdownAction = (variant: 'h1' | 'h2' | 'bold' | 'italic' | 'bullet' | 'quote' | 'code' | 'mathInline' | 'mathBlock' | 'fraction' | 'sqrt' | 'sum' | 'integral' | 'matrix' | 'subscript' | 'superscript') => {
    if (!currentNote || !editorRef.current) return
    const textarea = editorRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentValue = textarea.value
    const selected = currentValue.slice(start, end) || 'text'

    let injected = ''
    if (variant === 'h1') injected = `# ${selected}`
    if (variant === 'h2') injected = `## ${selected}`
    if (variant === 'bold') injected = `**${selected}**`
    if (variant === 'italic') injected = `*${selected}*`
    if (variant === 'bullet') injected = selected.includes('\n') ? selected.split('\n').map((line) => `- ${line}`).join('\n') : `- ${selected}`
    if (variant === 'quote') injected = `> ${selected}`
    if (variant === 'code') injected = `\`${selected}\``
    if (variant === 'mathInline') injected = `$${selected}$`
    if (variant === 'mathBlock') injected = `\n$$\n${selected}\n$$\n`
    if (variant === 'fraction') injected = `\\frac{${selected || 'a'}}{b}`
    if (variant === 'sqrt') injected = `\\sqrt{${selected || 'x'}}`
    if (variant === 'sum') injected = `\\sum_{i=1}^{n} ${selected || 'x_i'}`
    if (variant === 'integral') injected = `\\int_0^T ${selected || 'f(t)'}\\,dt`
    if (variant === 'matrix') injected = `\\begin{bmatrix}\na & b \\\\ \nc & d\n\\end{bmatrix}`
    if (variant === 'subscript') injected = `${selected || 'x'}_i`
    if (variant === 'superscript') injected = `${selected || 'x'}^2`

    const nextValue = currentValue.slice(0, start) + injected + currentValue.slice(end)
    updateCurrentNote({ body: nextValue, summary: summarizeNoteText(nextValue) })

    requestAnimationFrame(() => {
      textarea.focus()
      const nextCursor = start + injected.length
      textarea.setSelectionRange(nextCursor, nextCursor)
    })
  }

  const handleDropOnFolder = (folderId: string | null) => {
    if (!draggingNoteId) return
    setNotes((current) => current.map((note) => note.id === draggingNoteId ? { ...note, folderId: folderId ?? null, updatedAt: new Date().toISOString(), lastEditedAt: new Date().toISOString() } : note))
    setDraggingNoteId(null)
  }

  const insertRawText = (raw: string) => {
    if (!currentNote || !editorRef.current) return
    const textarea = editorRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentValue = textarea.value
    const nextValue = currentValue.slice(0, start) + raw + currentValue.slice(end)
    updateCurrentNote({ body: nextValue, summary: summarizeNoteText(nextValue) })
    requestAnimationFrame(() => {
      textarea.focus()
      const nextCursor = start + raw.length
      textarea.setSelectionRange(nextCursor, nextCursor)
    })
  }

  const mathSymbols = ['\\alpha', '\\beta', '\\gamma', '\\theta', '\\lambda', '\\mu', '\\sigma', '\\pi', '\\leq', '\\geq', '\\neq', '\\infty']

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">MuksNotes</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">A note-taking workspace that flexes with your life.</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={createNotebook}><NotebookPen className="mr-2 h-4 w-4" />New notebook</Button>
          <Button variant="outline" onClick={createFolder}><FolderPlus className="mr-2 h-4 w-4" />New folder</Button>
          <Button onClick={createNote}><Plus className="mr-2 h-4 w-4" />New note</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full border-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="Search notes, tags, unit, week or topic"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Folders</p>
            <Folder className="h-4 w-4 text-slate-400" />
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDropOnFolder(null)}
              onClick={() => setSelectedFolderId(null)}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${!selectedFolderId ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-transparent bg-slate-50 text-slate-700 hover:border-slate-200'}`}
            >
              <span>All notes</span>
              <span className="text-xs text-slate-500">{notes.length}</span>
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                draggable={false}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDropOnFolder(folder.id)}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${selectedFolderId === folder.id ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-transparent bg-slate-50 text-slate-700 hover:border-slate-200'}`}
              >
                <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: folder.color }} />{folder.name}</span>
                <span className="text-xs text-slate-500">{notes.filter((note) => note.folderId === folder.id).length}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notebooks</p>
            <BookOpen className="h-4 w-4 text-slate-400" />
          </div>
          <div className="space-y-2">
            {notebooks.map((notebook) => (
              <button
                key={notebook.id}
                type="button"
                onClick={() => setSelectedNotebookId(notebook.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${selectedNotebookId === notebook.id ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-transparent bg-slate-50 text-slate-700 hover:border-slate-200'}`}
              >
                <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: notebook.color }} />{notebook.name}</span>
                <span className="text-xs text-slate-500">{notes.filter((note) => note.notebookId === notebook.id).length}</span>
              </button>
            ))}
          </div>
        </aside>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</p>
            <Grid3X3 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="space-y-2">
            {visibleNotes.length ? visibleNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                draggable
                onDragStart={() => setDraggingNoteId(note.id)}
                onDragEnd={() => setDraggingNoteId(null)}
                onClick={() => setSelectedNoteId(note.id)}
                className={`w-full rounded-xl border p-3 text-left ${selectedNoteId === note.id ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{note.title}</span>
                  {note.isPinned ? <Star className="h-3.5 w-3.5 fill-current" /> : null}
                </div>
                <p className="mt-2 line-clamp-2 text-xs opacity-80">{note.summary || note.body.slice(0, 100) || 'No preview yet.'}</p>
              </button>
            )) : <p className="text-sm text-slate-500">No matching notes in this notebook.</p>}
          </div>
        </aside>

        <Card className={`${isFullscreen ? 'fixed inset-3 z-50 m-0 min-h-0 overflow-hidden rounded-xl bg-white shadow-2xl' : 'min-h-[620px]'} p-0`}>
          {currentNote ? (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <input
                    value={currentNote.title}
                    onChange={(event) => updateCurrentNote({ title: event.target.value })}
                    className="w-full max-w-md border-0 bg-transparent text-xl font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsFullscreen((value) => !value)}>{isFullscreen ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}{isFullscreen ? 'Exit full screen' : 'Full screen'}</Button>
                  <Button variant="outline" size="sm" onClick={() => updateCurrentNote({ isPinned: !currentNote.isPinned })}><Star className={`mr-2 h-4 w-4 ${currentNote.isPinned ? 'fill-current' : ''}`} />Pin</Button>
                  <Button variant="outline" size="sm" onClick={() => duplicateNote(currentNote.id)}><Folder className="mr-2 h-4 w-4" />Duplicate</Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteNote(currentNote.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-1">Typed notes</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">Headings</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">Lists</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">Math</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">Images</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">PDF ready</span>
              </div>

              <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3">
                <Button variant="ghost" size="sm" onClick={() => applyMarkdownAction('h1')}>H1</Button>
                <Button variant="ghost" size="sm" onClick={() => applyMarkdownAction('h2')}>H2</Button>
                <Button variant="ghost" size="sm" onClick={() => applyMarkdownAction('bold')}><strong>B</strong></Button>
                <Button variant="ghost" size="sm" onClick={() => applyMarkdownAction('italic')}><em>I</em></Button>
                <Button variant="ghost" size="sm" onClick={() => applyMarkdownAction('bullet')}>• List</Button>
                <Button variant="ghost" size="sm" onClick={() => applyMarkdownAction('quote')}>❝ Quote</Button>
                <Button variant="ghost" size="sm" onClick={() => applyMarkdownAction('code')}>Code</Button>
                <Button variant="ghost" size="sm" onClick={() => applyMarkdownAction('mathInline')}><Sigma className="mr-2 h-4 w-4" />Inline math</Button>
                <Button variant="ghost" size="sm" onClick={() => applyMarkdownAction('mathBlock')}>Display math</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowMathSymbols((value) => !value)}>{showMathSymbols ? 'Hide symbols' : 'Math symbols'}</Button>
                <Button variant="ghost" size="sm"><PenSquare className="h-4 w-4" />Highlight</Button>
                <Button variant="ghost" size="sm"><Upload className="h-4 w-4" />Attach</Button>
                <Button variant="ghost" size="sm" onClick={addNoteAttachment}><Wand2 className="mr-2 h-4 w-4" />Image</Button>
                <Button variant="ghost" size="sm" onClick={generateAiSummary}><Sparkles className="mr-2 h-4 w-4" />AI summary</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowMarkdownPreview((value) => !value)}>{showMarkdownPreview ? 'Edit' : 'Preview'}</Button>
              </div>

              {showMathSymbols ? (
                <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3">
                  <Button variant="outline" size="sm" onClick={() => applyMarkdownAction('fraction')}>Fraction</Button>
                  <Button variant="outline" size="sm" onClick={() => applyMarkdownAction('sqrt')}>Root</Button>
                  <Button variant="outline" size="sm" onClick={() => applyMarkdownAction('sum')}>Summation</Button>
                  <Button variant="outline" size="sm" onClick={() => applyMarkdownAction('integral')}>Integral</Button>
                  <Button variant="outline" size="sm" onClick={() => applyMarkdownAction('matrix')}>Matrix</Button>
                  <Button variant="outline" size="sm" onClick={() => applyMarkdownAction('subscript')}>Subscript</Button>
                  <Button variant="outline" size="sm" onClick={() => applyMarkdownAction('superscript')}>Superscript</Button>
                  {mathSymbols.map((symbol) => (
                    <Button key={symbol} variant="outline" size="sm" onClick={() => insertRawText(`${symbol} `)}>{symbol}</Button>
                  ))}
                </div>
              ) : null}

              <div className="flex-1 p-4">
                {showMarkdownPreview ? (
                  <div className="prose prose-slate max-w-none overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-[15px] leading-7 text-slate-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
                      {currentNote.body}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    ref={editorRef}
                    value={currentNote.body}
                    onChange={(event) => updateCurrentNote({ body: event.target.value, summary: summarizeNoteText(event.target.value) })}
                    className={`${isFullscreen ? 'h-[calc(100vh-290px)]' : 'h-[420px]'} w-full resize-none border-0 bg-transparent text-[15px] leading-7 text-slate-800 outline-none`}
                    placeholder="Write your thoughts, formulae, and revision notes here..."
                  />
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <span>{isSaving ? 'Saving...' : 'Saved'}</span>
                <span>{lastSavedAt ? `Last saved at ${lastSavedAt}` : 'Autosaves locally for now'}</span>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[600px] items-center justify-center p-8 text-center text-slate-500">
              <div>
                <NotebookPen className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-4 text-lg font-semibold text-slate-800">No notes yet</p>
                <p className="mt-2 text-sm">Create a notebook to begin your notes workspace.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
