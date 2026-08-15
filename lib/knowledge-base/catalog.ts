import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { appendLog } from '@/lib/logging'
import type { CatalogStore } from './types'

export const KNOWLEDGE_ROOT = path.join(process.cwd(), 'Knowledge')
export const CATALOG_PATH = path.join(KNOWLEDGE_ROOT, 'catalog.db')

const COURSE_SUBFOLDERS = [
  'Original Files',
  'Extracted Text',
  'Chunks',
  'Embeddings',
  'Metadata',
  'Summaries',
  'Formula Sheets',
  'Flashcards',
  'Practice Questions',
  'Revision Notes',
  'Generated Quizzes',
  'Student Notes',
  'Relationships',
  'Search Index'
]

function defaultStore(): CatalogStore {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    activeCurriculumVersion: 'v1',
    documents: [],
    chunks: []
  }
}

export async function ensureKnowledgeLayout() {
  await fs.mkdir(KNOWLEDGE_ROOT, { recursive: true })
  await fs.mkdir(path.join(KNOWLEDGE_ROOT, 'courses'), { recursive: true })
  await fs.mkdir(path.join(KNOWLEDGE_ROOT, 'embeddings'), { recursive: true })
  await fs.mkdir(path.join(KNOWLEDGE_ROOT, 'student_profiles'), { recursive: true })
  await fs.mkdir(path.join(KNOWLEDGE_ROOT, 'cache'), { recursive: true })
  await fs.mkdir(path.join(KNOWLEDGE_ROOT, 'logs'), { recursive: true })

  try {
    await fs.access(CATALOG_PATH)
  } catch {
    await fs.writeFile(CATALOG_PATH, JSON.stringify(defaultStore(), null, 2), 'utf8')
  }
}

export async function loadCatalog(): Promise<CatalogStore> {
  await ensureKnowledgeLayout()
  const raw = await fs.readFile(CATALOG_PATH, 'utf8')
  try {
    return JSON.parse(raw) as CatalogStore
  } catch {
    const store = defaultStore()
    await saveCatalog(store)
    return store
  }
}

export async function saveCatalog(store: CatalogStore) {
  store.updatedAt = new Date().toISOString()
  await fs.writeFile(CATALOG_PATH, JSON.stringify(store, null, 2), 'utf8')
}

export function makeDocumentId() {
  return `doc_${crypto.randomUUID()}`
}

export function makeChunkId() {
  return `chk_${crypto.randomUUID()}`
}

export function hashBuffer(content: Buffer) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

export async function ensureCourseFolders(courseCode: string, semester = 'Unknown-Semester') {
  const courseRoot = path.join(KNOWLEDGE_ROOT, 'courses', courseCode, semester)
  await fs.mkdir(courseRoot, { recursive: true })
  for (const folder of COURSE_SUBFOLDERS) {
    await fs.mkdir(path.join(courseRoot, folder), { recursive: true })
  }
  return courseRoot
}

export async function activateCurriculumVersion(version: string) {
  const catalog = await loadCatalog()
  catalog.activeCurriculumVersion = version
  await saveCatalog(catalog)
  await appendLog('index-rebuilds', 'Activated curriculum version', { version })
}
