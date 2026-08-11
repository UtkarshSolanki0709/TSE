import Database from 'better-sqlite3';
import { drizzle as sqliteDrizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
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
    const connectionString = process.env.DATABASE_URL || '';
    const client = neon(connectionString);
    _db = neonDrizzle({ client });
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
