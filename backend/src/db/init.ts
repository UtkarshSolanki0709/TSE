import { getDb, getMode } from './index';
import { sql } from 'drizzle-orm';

async function exec(rawSql: string): Promise<void> {
  const db = getDb();
  const mode = getMode();
  if (mode === 'cloud') {
    const pgSql = rawSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    await db.execute(sql.raw(pgSql));
  } else {
    // better-sqlite3 uses run() for raw SQL
    db.run(rawSql);
  }
}

export async function initDb(): Promise<void> {
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
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    doc_length INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL,
    classification TEXT NOT NULL DEFAULT 'General',
    UNIQUE(user_id, url)
  )`);

  await exec(`CREATE INDEX IF NOT EXISTS documents_user_idx ON documents(user_id)`);

  await exec(`CREATE TABLE IF NOT EXISTS inverted_index (
    term TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    weight REAL NOT NULL,
    user_id TEXT NOT NULL,
    UNIQUE(term, doc_id)
  )`);

  await exec(`CREATE INDEX IF NOT EXISTS ii_term_idx ON inverted_index(term)`);
  await exec(`CREATE INDEX IF NOT EXISTS ii_user_idx ON inverted_index(user_id)`);

  await exec(`CREATE TABLE IF NOT EXISTS search_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    query TEXT NOT NULL,
    result_count INTEGER NOT NULL,
    response_ms INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  )`);

  await exec(`CREATE INDEX IF NOT EXISTS sl_user_idx ON search_logs(user_id)`);

  await exec(`CREATE TABLE IF NOT EXISTS crawl_failures (
    url TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    reason TEXT NOT NULL,
    status_code INTEGER,
    retry_count INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL
  )`);

  await exec(`CREATE INDEX IF NOT EXISTS cf_user_idx ON crawl_failures(user_id)`);
}
