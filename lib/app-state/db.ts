import fs from 'fs'
import path from 'path'

// In Vercel/serverless, process.cwd() is read-only. Use /tmp which is writable.
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME)
const DATA_DIR = IS_SERVERLESS
  ? path.join('/tmp', 'muksbooks')
  : path.join(process.cwd(), 'Knowledge')
const DB_PATH = path.join(DATA_DIR, 'app-state.db')

// node:sqlite is a Node.js 22+ built-in. It is declared as a webpack external in
// next.config.mjs so the bundler leaves it as a bare require() at runtime.
let DatabaseSyncClass: any = null

function getDatabaseSync(): any {
  if (DatabaseSyncClass) return DatabaseSyncClass
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    DatabaseSyncClass = require('node:sqlite').DatabaseSync
  } catch (err) {
    throw new Error(
      `node:sqlite unavailable — requires Node.js 22+. (${err instanceof Error ? err.message : String(err)})`
    )
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

    CREATE TABLE IF NOT EXISTS assessment_conflicts (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      assessment_name TEXT NOT NULL,
      due_date_existing TEXT,
      due_date_new TEXT,
      source_document_id_existing TEXT,
      source_document_id_new TEXT,
      status TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(source_document_id_existing) REFERENCES documents(id),
      FOREIGN KEY(source_document_id_new) REFERENCES documents(id)
    );

    CREATE TABLE IF NOT EXISTS planner_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      course_id TEXT,
      topic_id TEXT,
      assessment_id TEXT,
      career_assessment_id TEXT,
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

    CREATE TABLE IF NOT EXISTS career_companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      official_careers_url TEXT,
      source_type TEXT,
      profile_created INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS career_jobs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      external_job_id TEXT,
      job_title TEXT NOT NULL,
      location TEXT,
      city TEXT,
      country TEXT,
      role_type TEXT,
      discipline TEXT,
      description TEXT,
      requirements TEXT,
      opening_date TEXT,
      closing_date TEXT,
      closing_time TEXT,
      application_url TEXT,
      source_url TEXT,
      source_type TEXT,
      work_rights_information TEXT,
      international_student_information TEXT,
      date_found TEXT,
      last_verified TEXT,
      source_timezone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES career_companies(id)
    );

    CREATE TABLE IF NOT EXISTS career_company_checks (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      status TEXT NOT NULL,
      last_checked_at TEXT,
      last_successful_check_at TEXT,
      error_message TEXT,
      total_openings INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES career_companies(id)
    );

    CREATE TABLE IF NOT EXISTS career_company_follows (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      role_types TEXT,
      disciplines TEXT,
      countries TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, company_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(company_id) REFERENCES career_companies(id)
    );

    CREATE TABLE IF NOT EXISTS career_saved_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      job_snapshot TEXT NOT NULL,
      date_saved TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, job_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(job_id) REFERENCES career_jobs(id)
    );

    CREATE TABLE IF NOT EXISTS career_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT,
      job_id TEXT,
      job_snapshot TEXT NOT NULL,
      title TEXT NOT NULL,
      stage TEXT NOT NULL,
      outstanding_actions TEXT,
      checklist TEXT,
      notes TEXT,
      applied_at_utc TEXT,
      cv_document_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(company_id) REFERENCES career_companies(id),
      FOREIGN KEY(job_id) REFERENCES career_jobs(id)
    );

    CREATE TABLE IF NOT EXISTS career_application_events (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      details TEXT,
      event_time_utc TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(application_id) REFERENCES career_applications(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS career_assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      application_id TEXT,
      company_id TEXT,
      assessment_type TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      invitation_received_at_utc TEXT,
      deadline_rule_hours INTEGER,
      deadline_at_utc TEXT,
      deadline_date_only TEXT,
      deadline_has_exact_time INTEGER NOT NULL DEFAULT 0,
      employer_deadline_label TEXT,
      employer_timezone TEXT,
      assessment_url TEXT,
      notes TEXT,
      completed_at_utc TEXT,
      planner_task_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(application_id) REFERENCES career_applications(id),
      FOREIGN KEY(company_id) REFERENCES career_companies(id)
    );

    CREATE TABLE IF NOT EXISTS career_settings (
      user_id TEXT PRIMARY KEY,
      timezone TEXT,
      timezone_confirmed INTEGER NOT NULL DEFAULT 0,
      auto_add_deadlines_to_planner INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS career_cv_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      document_id TEXT,
      label TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      extracted_profile TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(document_id) REFERENCES documents(id)
    );

    CREATE TABLE IF NOT EXISTS career_job_requirements (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      requirements_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(job_id),
      FOREIGN KEY(job_id) REFERENCES career_jobs(id)
    );

    CREATE TABLE IF NOT EXISTS career_requirement_matches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      cv_document_id TEXT,
      results_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, job_id, cv_document_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(job_id) REFERENCES career_jobs(id),
      FOREIGN KEY(cv_document_id) REFERENCES career_cv_documents(id)
    );

    CREATE TABLE IF NOT EXISTS unit_mastery (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      mastery_level REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      UNIQUE(user_id, course_id)
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
  ensureColumn(db, 'courses', 'user_id', 'TEXT')
  ensureColumn(db, 'planner_tasks', 'career_assessment_id', 'TEXT')

  ensureColumn(db, 'batch_files', 'batch_id', 'TEXT')
  ensureColumn(db, 'batch_files', 'processing_status', 'TEXT')
  ensureColumn(db, 'batch_files', 'file_hash', 'TEXT')
  ensureColumn(db, 'upload_batches', 'user_id', 'TEXT')
  ensureColumn(db, 'upload_batches', 'course_id', 'TEXT')
  ensureColumn(db, 'unit_mastery', 'user_id', 'TEXT')
  ensureColumn(db, 'unit_mastery', 'course_id', 'TEXT')
  ensureColumn(db, 'unit_mastery', 'mastery_level', 'REAL NOT NULL DEFAULT 0')
  ensureColumn(db, 'unit_mastery', 'created_at', 'TEXT')
  ensureColumn(db, 'unit_mastery', 'updated_at', 'TEXT')

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
    CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_course ON documents(course_id);
    CREATE INDEX IF NOT EXISTS idx_documents_batch ON documents(batch_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_course ON knowledge_chunks(course_id);
    CREATE INDEX IF NOT EXISTS idx_assessments_course ON assessments(course_id);
    CREATE INDEX IF NOT EXISTS idx_assessment_conflicts_course ON assessment_conflicts(course_id);
    CREATE INDEX IF NOT EXISTS idx_assessment_conflicts_status ON assessment_conflicts(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON planner_tasks(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_career_assessment_unique ON planner_tasks(career_assessment_id) WHERE career_assessment_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_batches_user ON upload_batches(user_id);
    CREATE INDEX IF NOT EXISTS idx_batches_course ON upload_batches(course_id);
    CREATE INDEX IF NOT EXISTS idx_unit_mastery_user ON unit_mastery(user_id);
    CREATE INDEX IF NOT EXISTS idx_unit_mastery_course ON unit_mastery(course_id);
    CREATE INDEX IF NOT EXISTS idx_batch_files_batch ON batch_files(batch_id);
    CREATE INDEX IF NOT EXISTS idx_batch_files_status ON batch_files(processing_status);
    CREATE INDEX IF NOT EXISTS idx_batch_files_hash ON batch_files(file_hash);

    CREATE INDEX IF NOT EXISTS idx_career_jobs_company ON career_jobs(company_id);
    CREATE INDEX IF NOT EXISTS idx_career_jobs_active ON career_jobs(is_active);
    CREATE INDEX IF NOT EXISTS idx_career_follow_user ON career_company_follows(user_id);
    CREATE INDEX IF NOT EXISTS idx_career_saved_user ON career_saved_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_career_app_user ON career_applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_career_app_events_app ON career_application_events(application_id);
    CREATE INDEX IF NOT EXISTS idx_career_assess_user ON career_assessments(user_id);
    CREATE INDEX IF NOT EXISTS idx_career_assess_planner_task ON career_assessments(planner_task_id);
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
