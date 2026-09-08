import test from 'node:test'
import assert from 'node:assert/strict'

import { buildNoteSearchIndex, createInitialNotebook, createNoteRecord, sortNotesByUpdatedAt } from './notes-core'

test('notes core creates notebook and searchable note records', () => {
  const notebook = createInitialNotebook({ name: 'Personal' })
  const note = createNoteRecord({
    notebookId: notebook.id,
    title: 'Revision checklist',
    body: 'Finish algebra revision and review weekly topic notes.',
    tags: ['maths', 'revision']
  })

  assert.equal(notebook.name, 'Personal')
  assert.equal(note.title, 'Revision checklist')
  assert.equal(sortNotesByUpdatedAt([note])[0].id, note.id)
  assert.ok(buildNoteSearchIndex(note).includes('algebra'))
})
