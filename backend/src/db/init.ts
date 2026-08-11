import { getDb, getMode } from './index';
import { sql } from 'drizzle-orm';

async function exec(rawSql: string): Promise<void> {
  const db = getDb();
  const mode = getMode();
  if (mode === 'cloud') {
    const pgSql = rawSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    await db.execute(sql.raw(pgSql));
  } else {
    // better-sqlite3 Drizzle instance requires sql.raw()
    db.run(sql.raw(rawSql));
  }
}

async function runInit(): Promise<void> {
  await exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    oauth_provider TEXT,
    oauth_id TEXT,
    created_at INTEGER NOT NULL
  )`);

  await exec(`CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local',
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    doc_length INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL,
    classification TEXT NOT NULL DEFAULT 'General',
    UNIQUE(user_id, url)
  )`);

  // Legacy camelCase column migrations for SQLite databases created under earlier schemas
  try { await exec(`ALTER TABLE inverted_index RENAME COLUMN docId TO doc_id`); } catch {}
  try { await exec(`ALTER TABLE search_logs RENAME COLUMN resultCount TO result_count`); } catch {}
  try { await exec(`ALTER TABLE search_logs RENAME COLUMN responseMs TO response_ms`); } catch {}
  try { await exec(`ALTER TABLE documents RENAME COLUMN docLength TO doc_length`); } catch {}
  try { await exec(`ALTER TABLE documents DROP COLUMN docLength`); } catch {}

  try { await exec(`ALTER TABLE documents ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local'`); } catch {}
  try { await exec(`ALTER TABLE documents ADD COLUMN doc_length INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { await exec(`ALTER TABLE documents ADD COLUMN classification TEXT NOT NULL DEFAULT 'General'`); } catch {}

  await exec(`CREATE INDEX IF NOT EXISTS documents_user_idx ON documents(user_id)`);

  await exec(`CREATE TABLE IF NOT EXISTS inverted_index (
    term TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    weight REAL NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'local',
    UNIQUE(term, doc_id)
  )`);

  try { await exec(`ALTER TABLE inverted_index ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local'`); } catch {}

  await exec(`CREATE INDEX IF NOT EXISTS ii_term_idx ON inverted_index(term)`);
  await exec(`CREATE INDEX IF NOT EXISTS ii_user_idx ON inverted_index(user_id)`);

  await exec(`CREATE TABLE IF NOT EXISTS search_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'local',
    query TEXT NOT NULL,
    result_count INTEGER NOT NULL,
    response_ms INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  )`);

  try { await exec(`ALTER TABLE search_logs ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local'`); } catch {}

  await exec(`CREATE INDEX IF NOT EXISTS sl_user_idx ON search_logs(user_id)`);

  await exec(`CREATE TABLE IF NOT EXISTS crawl_failures (
    url TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local',
    domain TEXT NOT NULL,
    reason TEXT NOT NULL,
    status_code INTEGER,
    retry_count INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL
  )`);

  try { await exec(`ALTER TABLE crawl_failures ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local'`); } catch {}

  await exec(`CREATE INDEX IF NOT EXISTS cf_user_idx ON crawl_failures(user_id)`);
}

export async function initDb(retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await runInit();
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Database init attempt ${attempt} failed, retrying in 2 seconds...`);
      await new Promise(res => setTimeout(res, 2000));
    }
  }
}
