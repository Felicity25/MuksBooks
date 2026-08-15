import { getDb as getAppStateDb, nowIso } from '../app-state/db.ts'

let migrated = false

function migrateNewsTables(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS news_items (
      id TEXT PRIMARY KEY,
      cluster_key TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      category TEXT NOT NULL,
      subcategories TEXT,
      country TEXT,
      jurisdictions TEXT,
      practice_areas TEXT,
      actuarial_concepts TEXT,
      source_name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_tier INTEGER NOT NULL,
      source_url TEXT,
      url TEXT NOT NULL UNIQUE,
      published_at TEXT,
      discovered_at TEXT NOT NULL,
      last_checked_at TEXT NOT NULL,
      source_updated_at TEXT,
      content_hash TEXT,
      importance TEXT NOT NULL DEFAULT 'NORMAL',
      why_it_matters TEXT,
      actuarial_impact TEXT,
      affected_groups TEXT,
      effective_date TEXT,
      consultation_close_date TEXT,
      status TEXT,
      research_authors TEXT,
      research_institution TEXT,
      research_question TEXT,
      research_key_finding TEXT,
      research_difficulty TEXT,
      related_companies TEXT,
      related_regulators TEXT,
      supporting_sources TEXT,
      confidence REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS news_saved_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      news_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, news_id)
    );

    CREATE TABLE IF NOT EXISTS news_followed_topics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, topic)
    );

    CREATE INDEX IF NOT EXISTS idx_news_category ON news_items(category);
    CREATE INDEX IF NOT EXISTS idx_news_published ON news_items(published_at);
    CREATE INDEX IF NOT EXISTS idx_news_cluster ON news_items(cluster_key);
    CREATE INDEX IF NOT EXISTS idx_news_discovered ON news_items(discovered_at);
    CREATE INDEX IF NOT EXISTS idx_news_saved_user ON news_saved_items(user_id);
  `)
}

/** Shares the single app-state SQLite connection/file so News uses the same central backend as the rest of MuksBooks. */
export function getDb() {
  const db = getAppStateDb()
  if (!migrated) {
    migrateNewsTables(db)
    migrated = true
  }
  return db
}

export { nowIso }
