import Database from 'better-sqlite3';
import { drizzle as sqliteDrizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// ponytail: union type breaks Drizzle query builder. Use any for dual-dialect.
export type DB = any;

let _db: DB;
let _mode: string;

const DATA_DIR = path.resolve(__dirname, '..', '..', '.data');
const DB_FILE = path.join(DATA_DIR, 'tse.db');

export function getDb(): DB {
  if (_db) return _db;

  _mode = process.env.MODE || 'local';

  if (_mode === 'cloud') {
    const sslNeeded = Boolean(process.env.DATABASE_URL?.includes('render.com') || process.env.DATABASE_URL?.includes('sslmode') || process.env.NODE_ENV === 'production');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslNeeded ? { rejectUnauthorized: false } : undefined,
    });
    _db = pgDrizzle(pool);
  } else {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const sqlite = new Database(DB_FILE);
    sqlite.pragma('journal_mode = WAL');
    _db = sqliteDrizzle(sqlite);
  }

  return _db;
}

export function getMode(): string {
  return _mode || process.env.MODE || 'local';
}

export function isCloud(): boolean {
  return getMode() === 'cloud';
}
