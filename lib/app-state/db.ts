import fs from 'fs'
import path from 'path'

// In Vercel/serverless, process.cwd() is read-only. Use /tmp which is writable.
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME)
const DATA_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'muksbooks')
  : path.join(process.cwd(), 'Knowledge')
const DB_PATH = path.join(DATA_DIR, 'app-state.db')

// node:sqlite requires Node.js 22+. Import it synchronously using createRequire to work in ESM.
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)

let DatabaseSyncClass: any = null

function getDatabaseSync() {
  if (!DatabaseSyncClass) {
    try {
      DatabaseSyncClass = _require('node:sqlite').DatabaseSync
    } catch {
      throw new Error('node:sqlite is not available — this requires Node.js 22+.')
    }
  }
  return DatabaseSyncClass
}

let dbInstance: any | null = null

function hasColumn(db: any, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return rows.some((row) => row.name === column)
}

function ensureColumn(db: any, table: string, column: string, definition: string) {
  if (!hasColumn(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`)
  }
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (!dbInstance) {
    const DB = getDatabaseSync()
    dbInstance = new DB(DB_PATH)

    // WAL is preferred for concurrent reads, but some local environments fail with disk I/O errors.
    try {
      dbInstance.exec('PRAGMA journal_mode = WAL;')
    } catch {
      dbInstance.exec('PRAGMA journal_mode = DELETE;')
    }

    dbInstance.exec('PRAGMA synchronous = NORMAL;')
    dbInstance.exec('PRAGMA busy_timeout = 5000;')
    dbInstance.exec('PRAGMA foreign_keys = ON;')
  }

  return dbInstance
}

function migrate(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      university TEXT,
      timezone TEXT,
      semester TEXT,
      preferences TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      course_code TEXT NOT NULL,
      course_name TEXT,
      university TEXT,
      semester TEXT,
      year INTEGER,
      start_date TEXT,
      end_date TEXT,
      status TEXT,
      source TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      batch_id TEXT,
      batch_file_id TEXT,
      filename TEXT NOT NULL,
      original_filename TEXT,
      original_path TEXT,
      relative_path TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      document_type TEXT,
      resource_type TEXT,
      topic TEXT,
      academic_year INTEGER,
      week INTEGER,
      lecture_number INTEGER,
      tutorial_number INTEGER,
      workshop_number INTEGER,
      assessment_number INTEGER,
      upload_date TEXT,
      content_hash TEXT,
      version INTEGER,
      processing_status TEXT,
      extracted_text_path TEXT,
      summary TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS upload_batches (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      course_id TEXT,
      name TEXT,
      status TEXT,
      total_files INTEGER,
      completed_files INTEGER,
      failed_files INTEGER,
      queued_files INTEGER,
      processing_files INTEGER,
      total_bytes INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS batch_files (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      user_id TEXT,
      course_id TEXT,
      document_id TEXT,
      original_filename TEXT,
      display_name TEXT,
      relative_path TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      file_hash TEXT,
      resource_type TEXT,
      week INTEGER,
      topic TEXT,
      semester TEXT,
      academic_year INTEGER,
      processing_status TEXT,
      error_message TEXT,
      duplicate_strategy TEXT,
      duplicate_of_document_id TEXT,
      version INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(batch_id) REFERENCES upload_batches(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(document_id) REFERENCES documents(id)
    );

    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT,
      course_id TEXT,
      chunk_index INTEGER,
      text TEXT,
      page_number INTEGER,
      section TEXT,
      topic TEXT,
      embedding TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(document_id) REFERENCES documents(id),
      FOREIGN KEY(course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      name TEXT,
      description TEXT,
      week INTEGER,
      lecture_number INTEGER,
      parent_topic_id TEXT,
      importance REAL,
      exam_relevance REAL,
      learning_status TEXT,
      mastery_score REAL,
      confidence_score REAL,
      last_studied_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      name TEXT,
      type TEXT,
      weighting REAL,
      due_date TEXT,
      release_date TEXT,
      status TEXT,
      score REAL,
      maximum_score REAL,
      topic_ids TEXT,
      source_document_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(source_document_id) REFERENCES documents(id)
    );

    CREATE TABLE IF NOT EXISTS planner_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      course_id TEXT,
      topic_id TEXT,
      assessment_id TEXT,
      title TEXT,
      description TEXT,
      task_type TEXT,
      priority REAL,
      planned_date TEXT,
      due_date TEXT,
      estimated_minutes INTEGER,
      completed INTEGER,
      completed_at TEXT,
      generated_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      course_id TEXT,
      topic_id TEXT,
      start_time TEXT,
      end_time TEXT,
      duration INTEGER,
      activity_type TEXT,
      confidence_before REAL,
      confidence_after REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      course_id TEXT,
      topic_id TEXT,
      score REAL,
      questions_attempted INTEGER,
      questions_correct INTEGER,
      difficulty TEXT,
      misconceptions TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS student_memory (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      course_id TEXT,
      memory_type TEXT,
      key TEXT,
      value TEXT,
      confidence REAL,
      source TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS app_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL
    );

  `)

  ensureColumn(db, 'documents', 'batch_id', 'TEXT')
  ensureColumn(db, 'documents', 'batch_file_id', 'TEXT')
  ensureColumn(db, 'documents', 'original_filename', 'TEXT')
  ensureColumn(db, 'documents', 'relative_path', 'TEXT')
  ensureColumn(db, 'documents', 'mime_type', 'TEXT')
  ensureColumn(db, 'documents', 'size_bytes', 'INTEGER')
  ensureColumn(db, 'documents', 'resource_type', 'TEXT')
  ensureColumn(db, 'documents', 'topic', 'TEXT')
  ensureColumn(db, 'documents', 'academic_year', 'INTEGER')

  ensureColumn(db, 'batch_files', 'batch_id', 'TEXT')
  ensureColumn(db, 'batch_files', 'processing_status', 'TEXT')
  ensureColumn(db, 'batch_files', 'file_hash', 'TEXT')
  ensureColumn(db, 'upload_batches', 'user_id', 'TEXT')
  ensureColumn(db, 'upload_batches', 'course_id', 'TEXT')

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
    CREATE INDEX IF NOT EXISTS idx_documents_course ON documents(course_id);
    CREATE INDEX IF NOT EXISTS idx_documents_batch ON documents(batch_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_course ON knowledge_chunks(course_id);
    CREATE INDEX IF NOT EXISTS idx_assessments_course ON assessments(course_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON planner_tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_batches_user ON upload_batches(user_id);
    CREATE INDEX IF NOT EXISTS idx_batches_course ON upload_batches(course_id);
    CREATE INDEX IF NOT EXISTS idx_batch_files_batch ON batch_files(batch_id);
    CREATE INDEX IF NOT EXISTS idx_batch_files_status ON batch_files(processing_status);
    CREATE INDEX IF NOT EXISTS idx_batch_files_hash ON batch_files(file_hash);
  `)
}

export function getDb(): any {
  const db = ensureDb()
  migrate(db)
  return db
}

export function nowIso() {
  return new Date().toISOString()
}
