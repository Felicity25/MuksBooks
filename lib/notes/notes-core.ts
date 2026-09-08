export type NotePriority = 'normal' | 'pinned' | 'archived'

export interface NotebookRecord {
  id: string
  name: string
  description?: string
  folderId?: string | null
  userId: string
  academicContext?: {
    academicMode?: 'UNIVERSITY' | 'LEARNER'
    level?: string
    subject?: string
    unit?: string
    week?: string
    topic?: string
    assessment?: string
  }
  color?: string
  isDefault?: boolean
  createdAt: string
  updatedAt: string
}

export interface FolderRecord {
  id: string
  name: string
  userId: string
  parentId?: string | null
  kind?: 'folder' | 'tag-group'
  color?: string
  createdAt: string
  updatedAt: string
}

export interface NoteRecord {
  id: string
  notebookId: string
  folderId?: string | null
  title: string
  body: string
  summary?: string
  userId: string
  tags: string[]
  isPinned: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
  lastEditedAt: string
  context?: NotebookRecord['academicContext']
  attachments: Array<{ id: string; name: string; type: 'image' | 'pdf' | 'file'; url?: string; size?: number; createdAt: string }>
  coverColor?: string
}

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function createInitialNotebook(input: { name: string; description?: string; userId?: string; folderId?: string | null }) : NotebookRecord {
  const now = new Date().toISOString()
  return {
    id: createId('nb'),
    name: input.name,
    description: input.description || '',
    folderId: input.folderId || null,
    userId: input.userId || 'guest',
    color: '#7ea0b7',
    isDefault: true,
    createdAt: now,
    updatedAt: now
  }
}

export function createFolderRecord(input: { name: string; userId?: string; parentId?: string | null; kind?: FolderRecord['kind']; color?: string }): FolderRecord {
  const now = new Date().toISOString()
  return {
    id: createId('folder'),
    name: input.name,
    userId: input.userId || 'guest',
    parentId: input.parentId || null,
    kind: input.kind || 'folder',
    color: input.color || '#cbd5e1',
    createdAt: now,
    updatedAt: now
  }
}

export function createNoteRecord(input: {
  notebookId: string
  folderId?: string | null
  title: string
  body: string
  summary?: string
  userId?: string
  tags?: string[]
  isPinned?: boolean
  isArchived?: boolean
  context?: NotebookRecord['academicContext']
  attachments?: NoteRecord['attachments']
  coverColor?: string
}) : NoteRecord {
  const now = new Date().toISOString()
  return {
    id: createId('note'),
    notebookId: input.notebookId,
    folderId: input.folderId || null,
    title: input.title || 'Untitled note',
    body: input.body || '',
    summary: input.summary || input.body.slice(0, 180),
    userId: input.userId || 'guest',
    tags: input.tags || [],
    isPinned: Boolean(input.isPinned),
    isArchived: Boolean(input.isArchived),
    createdAt: now,
    updatedAt: now,
    lastEditedAt: now,
    context: input.context,
    attachments: input.attachments || [],
    coverColor: input.coverColor || '#dfeaf7'
  }
}

export function sortNotesByUpdatedAt(notes: NoteRecord[]) {
  return [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export function buildNoteSearchIndex(note: Pick<NoteRecord, 'title' | 'body' | 'tags' | 'context'>) {
  const contextText = [
    note.context?.academicMode,
    note.context?.level,
    note.context?.subject,
    note.context?.unit,
    note.context?.week,
    note.context?.topic,
    note.context?.assessment
  ].filter(Boolean).join(' ')

  return [note.title, note.body, ...(note.tags || []), contextText].join(' ').toLowerCase()
}

export function summarizeNoteText(content: string) {
  const cleaned = content.replace(/[#*_-`>\[\]()]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return 'No content yet — add your key points, formulas, or revision ideas and this summary will update.'

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean)
  const preview = sentences.slice(0, 3).join(' ')
  const words = cleaned.split(' ')
  const keyIdeas = words.slice(0, Math.min(18, words.length)).join(' ')

  return `${preview || keyIdeas}.` + (words.length > 18 ? ' This note is trending toward a structured review item with likely exam or course application value.' : ' This is a concise working note ready for revision.')
}

export function buildMarkdownPreview(source: string) {
  return source
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n/g, '<br />')
    .trim()
}
