import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getDb, nowIso } from '@/lib/app-state/db'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function userKey(user: { id?: string } | null) {
  return user?.id || 'default'
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function asNotePayload(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    notebookId: row.notebook_id,
    folderId: row.folder_id,
    title: row.title || 'Untitled note',
    body: row.body || '',
    summary: row.summary || '',
    tags: parseJson<string[]>(row.tags) || [],
    isPinned: Boolean(row.is_pinned),
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastEditedAt: row.last_edited_at || row.updated_at,
    context: parseJson(row.context_json) || null,
    attachments: parseJson(row.attachments_json) || [],
    coverColor: row.cover_color || '#dfeaf7'
  }
}

function asNotebookPayload(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || '',
    folderId: row.folder_id,
    color: row.color || '#7ea0b7',
    isDefault: Boolean(row.is_default),
    academicContext: parseJson(row.academic_context_json) || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function asFolderPayload(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    parentId: row.parent_id,
    kind: row.kind || 'folder',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

async function ensureCloudClient() {
  try {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const client = createSupabaseServerClient()
    if (!client) return null
    const { error } = await client.from('notes').select('id').limit(1)
    if (error) return null
    return client
  } catch {
    return null
  }
}

export async function GET() {
  const user = await getAuthenticatedUser()
  const userId = userKey(user)
  const db = getDb()
  const notebooks = db.prepare('SELECT * FROM note_notebooks WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as any[]
  const folders = db.prepare('SELECT * FROM note_folders WHERE user_id = ? ORDER BY created_at ASC').all(userId) as any[]
  const notes = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as any[]

  return NextResponse.json({
    ok: true,
    notebooks: notebooks.map(asNotebookPayload),
    folders: folders.map(asFolderPayload),
    notes: notes.map(asNotePayload)
  })
}

async function syncToSupabase(userId: string, notebooks: any[], notesList: any[], foldersList: any[]) {
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const client = createSupabaseServerClient()
  if (!client) return

  try {
    const payload = {
      note_folders: foldersList.map((folder) => ({ id: folder.id || `folder_${randomUUID()}`, user_id: userId, name: folder.name || 'Folder', parent_id: folder.parentId || null, kind: folder.kind || 'folder', color: folder.color || '#cbd5e1', created_at: folder.createdAt || new Date().toISOString(), updated_at: folder.updatedAt || new Date().toISOString() })),
      note_notebooks: notebooks.map((notebook) => ({ id: notebook.id || `nb_${randomUUID()}`, user_id: userId, name: notebook.name || 'Notebook', description: notebook.description || '', folder_id: notebook.folderId || null, color: notebook.color || '#7ea0b7', is_default: Boolean(notebook.isDefault), academic_context_json: notebook.academicContext ? JSON.stringify(notebook.academicContext) : null, created_at: notebook.createdAt || new Date().toISOString(), updated_at: notebook.updatedAt || new Date().toISOString() })),
      notes: notesList.map((note) => ({ id: note.id || `note_${randomUUID()}`, user_id: userId, notebook_id: note.notebookId || notebooks[0]?.id || `nb_${randomUUID()}`, folder_id: note.folderId || null, title: note.title || 'Untitled note', body: note.body || '', summary: note.summary || '', tags: Array.isArray(note.tags) ? note.tags : [], is_pinned: Boolean(note.isPinned), is_archived: Boolean(note.isArchived), created_at: note.createdAt || new Date().toISOString(), updated_at: note.updatedAt || new Date().toISOString(), last_edited_at: note.lastEditedAt || note.updatedAt || new Date().toISOString(), context_json: note.context ? JSON.stringify(note.context) : null, attachments_json: note.attachments ? JSON.stringify(note.attachments) : '[]', cover_color: note.coverColor || '#dfeaf7' }))
    }

    for (const [table, rows] of Object.entries(payload)) {
      if (!rows.length) continue
      const { error } = await client.from(table).upsert(rows as any[], { onConflict: 'id' })
      if (error) {
        console.warn(`[notes sync] ${table} skipped:`, error.message)
      }
    }
  } catch (error) {
    console.warn('[notes sync] Supabase sync failed:', error)
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  const userId = userKey(user)
  const db = getDb()
  const body = await request.json().catch(() => ({}))

  if (body?.kind === 'sync') {
    const notebooks = Array.isArray(body.notebooks) ? body.notebooks : []
    const notesList = Array.isArray(body.notes) ? body.notes : []
    const foldersList = Array.isArray(body.folders) ? body.folders : []

    db.prepare('DELETE FROM notes WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM note_notebooks WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM note_folders WHERE user_id = ?').run(userId)

    for (const folder of foldersList) {
      const folderId = String(folder.id || `folder_${randomUUID().slice(0, 8)}`)
      const now = nowIso()
      db.prepare(`
        INSERT INTO note_folders (id, user_id, name, parent_id, kind, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(folderId, userId, String(folder.name || 'Folder'), folder.parentId || null, folder.kind || 'folder', folder.createdAt || now, folder.updatedAt || now)
    }

    for (const notebook of notebooks) {
      const notebookId = String(notebook.id || `nb_${randomUUID().slice(0, 8)}`)
      const now = nowIso()
      db.prepare(`
        INSERT INTO note_notebooks (id, user_id, name, description, folder_id, color, is_default, academic_context_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(notebookId, userId, String(notebook.name || 'Notebook'), notebook.description || '', notebook.folderId || null, notebook.color || '#7ea0b7', notebook.isDefault ? 1 : 0, notebook.academicContext ? JSON.stringify(notebook.academicContext) : null, now, now)
    }

    for (const note of notesList) {
      const notebookId = String(note.notebookId || notebooks[0]?.id || `nb_${randomUUID().slice(0, 8)}`)
      const noteId = String(note.id || `note_${randomUUID().slice(0, 8)}`)
      const now = nowIso()
      db.prepare(`
        INSERT INTO notes (
          id, user_id, notebook_id, folder_id, title, body, summary, tags, is_pinned, is_archived, created_at, updated_at, last_edited_at, context_json, attachments_json, cover_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        noteId,
        userId,
        notebookId,
        note.folderId || null,
        String(note.title || 'Untitled note'),
        String(note.body || ''),
        note.summary || '',
        JSON.stringify(Array.isArray(note.tags) ? note.tags : []),
        note.isPinned ? 1 : 0,
        note.isArchived ? 1 : 0,
        note.createdAt || now,
        note.updatedAt || now,
        note.lastEditedAt || note.updatedAt || now,
        note.context ? JSON.stringify(note.context) : null,
        note.attachments ? JSON.stringify(note.attachments) : '[]',
        note.coverColor || '#dfeaf7'
      )
    }

    if (user && user.id) {
      await syncToSupabase(user.id, notebooks, notesList, foldersList)
    }

    return NextResponse.json({ ok: true, synced: true })
  }

  if (body?.kind === 'notebook') {
    const notebookId = `nb_${randomUUID().slice(0, 8)}`
    const now = nowIso()
    db.prepare(`
      INSERT INTO note_notebooks (id, user_id, name, description, folder_id, color, is_default, academic_context_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      notebookId,
      userId,
      String(body.name || 'New notebook'),
      body.description || '',
      body.folderId || null,
      body.color || '#7ea0b7',
      body.isDefault ? 1 : 0,
      body.academicContext ? JSON.stringify(body.academicContext) : null,
      now,
      now
    )
    return NextResponse.json({ ok: true, notebook: asNotebookPayload(db.prepare('SELECT * FROM note_notebooks WHERE id = ?').get(notebookId)) })
  }

  if (body?.kind === 'folder') {
    const folderId = `folder_${randomUUID().slice(0, 8)}`
    const now = nowIso()
    db.prepare(`
      INSERT INTO note_folders (id, user_id, name, parent_id, kind, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(folderId, userId, String(body.name || 'New folder'), body.parentId || null, body.kind || 'folder', now, now)
    return NextResponse.json({ ok: true, folder: asFolderPayload(db.prepare('SELECT * FROM note_folders WHERE id = ?').get(folderId)) })
  }

  const notebookId = body.notebookId || db.prepare('SELECT id FROM note_notebooks WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1').get(userId)?.id || (() => {
    const fallbackId = `nb_${randomUUID().slice(0, 8)}`
    const now = nowIso()
    db.prepare(`INSERT INTO note_notebooks (id, user_id, name, description, folder_id, color, is_default, academic_context_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(fallbackId, userId, 'Personal', 'Independent notes and quick ideas.', null, '#7ea0b7', 1, JSON.stringify({ academicMode: 'UNIVERSITY' }), now, now)
    return fallbackId
  })()

  const noteId = `note_${randomUUID().slice(0, 8)}`
  const now = nowIso()
  db.prepare(`
    INSERT INTO notes (
      id, user_id, notebook_id, folder_id, title, body, summary, tags, is_pinned, is_archived, created_at, updated_at, last_edited_at, context_json, attachments_json, cover_color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    noteId,
    userId,
    notebookId,
    body.folderId || null,
    String(body.title || 'Untitled note'),
    String(body.body || ''),
    body.summary || '',
    JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
    body.isPinned ? 1 : 0,
    body.isArchived ? 1 : 0,
    now,
    now,
    now,
    body.context ? JSON.stringify(body.context) : null,
    body.attachments ? JSON.stringify(body.attachments) : '[]',
    body.coverColor || '#dfeaf7'
  )

  return NextResponse.json({ ok: true, note: asNotePayload(db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId)) })
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser()
  const userId = userKey(user)
  const db = getDb()
  const body = await request.json().catch(() => ({}))
  const noteId = body.noteId || body.id

  if (!noteId) {
    return NextResponse.json({ ok: false, error: 'noteId is required' }, { status: 400 })
  }

  const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ? LIMIT 1').get(noteId, userId) as any
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Note not found.' }, { status: 404 })
  }

  const nextTitle = body.title !== undefined ? String(body.title) : existing.title
  const nextBody = body.body !== undefined ? String(body.body) : existing.body
  const nextSummary = body.summary !== undefined ? String(body.summary) : existing.summary
  const nextTags = body.tags !== undefined ? JSON.stringify(Array.isArray(body.tags) ? body.tags : []) : existing.tags
  const nextContext = body.context !== undefined ? (body.context ? JSON.stringify(body.context) : null) : existing.context_json
  const nextAttachments = body.attachments !== undefined ? JSON.stringify(Array.isArray(body.attachments) ? body.attachments : []) : existing.attachments_json
  const nextNotebook = body.notebookId !== undefined ? String(body.notebookId) : existing.notebook_id
  const nextFolder = body.folderId !== undefined ? (body.folderId || null) : existing.folder_id
  const isPinned = body.isPinned !== undefined ? (body.isPinned ? 1 : 0) : existing.is_pinned
  const isArchived = body.isArchived !== undefined ? (body.isArchived ? 1 : 0) : existing.is_archived
  const now = nowIso()

  db.prepare(`
    UPDATE notes
    SET notebook_id = ?, folder_id = ?, title = ?, body = ?, summary = ?, tags = ?, is_pinned = ?, is_archived = ?, updated_at = ?, last_edited_at = ?, context_json = ?, attachments_json = ?, cover_color = COALESCE(?, cover_color)
    WHERE id = ? AND user_id = ?
  `).run(
    nextNotebook,
    nextFolder,
    nextTitle,
    nextBody,
    nextSummary,
    nextTags,
    isPinned,
    isArchived,
    now,
    now,
    nextContext,
    nextAttachments,
    body.coverColor || existing.cover_color,
    noteId,
    userId
  )

  return NextResponse.json({ ok: true, note: asNotePayload(db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId)) })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  const userId = userKey(user)
  const db = getDb()
  const { searchParams } = new URL(request.url)
  const noteId = searchParams.get('noteId') || searchParams.get('id')

  if (!noteId) {
    return NextResponse.json({ ok: false, error: 'noteId is required' }, { status: 400 })
  }

  const deleted = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(noteId, userId)
  return NextResponse.json({ ok: true, deleted: Number(deleted.changes) > 0 })
}
