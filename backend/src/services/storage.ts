import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import type { Document, InvertedIndex, SearchLog } from '@tse/shared';


const DATA_DIR = path.resolve(__dirname, '..', '..', '.data');
const DB_FILE = path.join(DATA_DIR, 'tse.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Database Initialization ──────────────────────────────────────────────────

const db = new sqlite3.Database(DB_FILE);


const query = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const getOne = (sql: string, params: any[] = []): Promise<any | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const run = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const beginTransaction = () => run('BEGIN TRANSACTION');
export const commit = () => run('COMMIT');
export const rollback = () => run('ROLLBACK');

export async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      url TEXT UNIQUE,
      title TEXT,
      content TEXT,
      docLength INTEGER DEFAULT 0,
      timestamp INTEGER
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS inverted_index (
      term TEXT,
      docId TEXT,
      weight REAL,
      PRIMARY KEY (term, docId),
      FOREIGN KEY (docId) REFERENCES documents(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS search_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT,
      resultCount INTEGER,
      responseMs INTEGER,
      timestamp INTEGER
    )
  `);
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function getDocs(): Promise<Document[]> {
  return (await query('SELECT * FROM documents')) as Document[];
}

export async function getDocById(id: string): Promise<Document | undefined> {
  return await getOne('SELECT * FROM documents WHERE id = ?', [id]);
}

export async function getDocByUrl(url: string): Promise<Document | undefined> {
  return await getOne('SELECT * FROM documents WHERE url = ?', [url]);
}

export async function upsertDoc(doc: Document & { docLength?: number }): Promise<void> {
  const len = doc.docLength || 0;
  await run(
    `INSERT INTO documents (id, url, title, content, docLength, timestamp) 
     VALUES (?, ?, ?, ?, ?, ?) 
     ON CONFLICT(url) DO UPDATE SET 
       title=excluded.title, 
       content=excluded.content, 
       docLength=excluded.docLength,
       timestamp=excluded.timestamp`,
    [doc.id, doc.url, doc.title, doc.content, len, doc.timestamp]
  );
}

// ─── Inverted Index ───────────────────────────────────────────────────────────

export async function getTermWeights(term: string): Promise<Record<string, number>> {
  const rows = await query('SELECT docId, weight FROM inverted_index WHERE term = ?', [term]);
  const result: Record<string, number> = {};
  rows.forEach((row) => (result[row.docId] = row.weight));
  return result;
}

export async function saveTermWeights(term: string, weights: Record<string, number>): Promise<void> {
  // Batch update for performance in actual crawls
  for (const docId in weights) {
    await run(
      'INSERT INTO inverted_index (term, docId, weight) VALUES (?, ?, ?) ON CONFLICT(term, docId) DO UPDATE SET weight=excluded.weight',
      [term, docId, weights[docId]]
    );
  }
}

/**
 * Optimized batch save for term weights.
 * Expects an array of { term, docId, weight }
 */
export async function batchSaveTermWeights(entries: { term: string; docId: string; weight: number }[]): Promise<void> {
  if (entries.length === 0) return;

  const stmt = db.prepare('INSERT INTO inverted_index (term, docId, weight) VALUES (?, ?, ?) ON CONFLICT(term, docId) DO UPDATE SET weight=excluded.weight');
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      for (const entry of entries) {
        stmt.run(entry.term, entry.docId, entry.weight);
      }
      db.run('COMMIT', (err) => {
        if (err) {
          db.run('ROLLBACK');
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

export async function getIndexRows(): Promise<{ term: string; docId: string; weight: number }[]> {
  return await query('SELECT term, docId, weight FROM inverted_index');
}

export async function getIndex(): Promise<InvertedIndex> {
  const rows = await query('SELECT * FROM inverted_index');
  const index: InvertedIndex = {};
  rows.forEach((row) => {
    if (!index[row.term]) index[row.term] = {};
    index[row.term][row.docId] = row.weight;
  });
  return index;
}

// ─── Search Logs ─────────────────────────────────────────────────────────────

export async function appendLog(log: SearchLog): Promise<void> {
  await run(
    'INSERT INTO search_logs (query, resultCount, responseMs, timestamp) VALUES (?, ?, ?, ?)',
    [log.query, log.resultCount, log.responseMs, log.timestamp]
  );
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getAnalytics(): Promise<any[]> {
  return await query(`
    SELECT query, COUNT(*) as count, AVG(responseMs) as avgLatency 
    FROM search_logs 
    GROUP BY query 
    ORDER BY count DESC 
    LIMIT 20
  `);
}

export async function getAnalyticsGaps(): Promise<string[]> {
  const rows = await query(`
    SELECT DISTINCT query 
    FROM search_logs 
    WHERE resultCount = 0 
    LIMIT 20
  `);
  return rows.map(r => r.query);
}

export async function getVocabulary(): Promise<string[]> {
  const rows = await query('SELECT DISTINCT term FROM inverted_index');
  return rows.map(r => r.term);
}

// ─── Statistics ──────────────────────────────────────────────────────────────

export async function getDocCount(): Promise<number> {
  const row = await getOne('SELECT COUNT(*) as count FROM documents');
  return row?.count || 0;
}

export async function getTermDocCount(term: string): Promise<number> {
  const row = await getOne('SELECT COUNT(*) as count FROM inverted_index WHERE term = ?', [term]);
  return row?.count || 0;
}


