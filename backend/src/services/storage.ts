import { eq, and, desc, sql } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { Document, SearchLog, CrawlFailure } from '@tse/shared';
import { getDb } from '../db/index';
import { documents, invertedIndex, searchLogs, crawlFailures } from '../db/schema';
import { renderScrapedMarkdown } from './markdown';

const DATA_DIR = path.resolve(__dirname, '..', '..', '.data');

// ─── Documents ───────────────────────────────────────────────────────────────

export async function getDocs(userId: string): Promise<Document[]> {
  const db = getDb();
  return db.select().from(documents).where(eq(documents.userId, userId)) as Promise<Document[]>;
}

export async function getDocById(userId: string, id: string): Promise<Document | undefined> {
  const db = getDb();
  const rows = await db.select().from(documents).where(and(eq(documents.userId, userId), eq(documents.id, id))).limit(1);
  return rows[0] as Document | undefined;
}

export async function getDocByUrl(userId: string, url: string): Promise<Document | undefined> {
  const db = getDb();
  const rows = await db.select().from(documents).where(and(eq(documents.userId, userId), eq(documents.url, url))).limit(1);
  return rows[0] as Document | undefined;
}

export async function upsertDoc(userId: string, doc: Document & { docLength?: number }): Promise<void> {
  const db = getDb();
  const len = doc.docLength || 0;
  const classification = doc.classification || 'General';

  await db.insert(documents).values({
    id: doc.id,
    userId,
    url: doc.url,
    title: doc.title,
    content: doc.content,
    docLength: len,
    timestamp: doc.timestamp,
    classification,
  }).onConflictDoUpdate({
    target: [documents.userId, documents.url],
    set: {
      title: doc.title,
      content: doc.content,
      docLength: len,
      timestamp: doc.timestamp,
      classification,
    },
  });
}

// ─── Inverted Index ───────────────────────────────────────────────────────────

export async function batchSaveTermWeights(userId: string, entries: { term: string; docId: string; weight: number }[]): Promise<void> {
  if (entries.length === 0) return;
  const db = getDb();

  // ponytail: batch insert with conflict handling
  // For SQLite, use onConflictDoUpdate. For Postgres, same API.
  for (const entry of entries) {
    await db.insert(invertedIndex).values({
      term: entry.term,
      docId: entry.docId,
      weight: entry.weight,
      userId,
    }).onConflictDoUpdate({
      target: [invertedIndex.term, invertedIndex.docId],
      set: { weight: entry.weight },
    });
  }
}

export async function getIndexRows(userId: string): Promise<{ term: string; docId: string; weight: number }[]> {
  const db = getDb();
  return db.select().from(invertedIndex).where(eq(invertedIndex.userId, userId));
}

// ─── Search Logs ─────────────────────────────────────────────────────────────

export async function appendLog(userId: string, log: SearchLog): Promise<void> {
  const db = getDb();
  await db.insert(searchLogs).values({
    userId,
    query: log.query,
    resultCount: log.resultCount,
    responseMs: log.responseMs,
    timestamp: log.timestamp,
  });
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getAnalytics(userId: string): Promise<any[]> {
  const db = getDb();
  return db.select({
    query: searchLogs.query,
    count: sql<number>`count(*)`.as('count'),
    avgLatency: sql<number>`avg(${searchLogs.responseMs})`.as('avg_latency'),
  }).from(searchLogs)
    .where(eq(searchLogs.userId, userId))
    .groupBy(searchLogs.query)
    .orderBy(desc(sql`count(*)`))
    .limit(20);
}

export async function getAnalyticsGaps(userId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db.select({ query: searchLogs.query })
    .from(searchLogs)
    .where(and(eq(searchLogs.userId, userId), eq(searchLogs.resultCount, 0)))
    .limit(20);
  return rows.map((r: { query: string }) => r.query);
}

export async function getVocabulary(userId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db.select({ term: invertedIndex.term }).from(invertedIndex).where(eq(invertedIndex.userId, userId));
  return [...new Set(rows.map((r: { term: string }) => r.term))] as string[];
}

// ─── Statistics ──────────────────────────────────────────────────────────────

export async function getDocCount(userId: string): Promise<number> {
  const db = getDb();
  const rows = await db.select({ count: sql<number>`count(*)` }).from(documents).where(eq(documents.userId, userId));
  return rows[0]?.count || 0;
}

// ─── Scraped Filesystem Tree Storage ─────────────────────────────────────────

export function sanitizePathSegment(segment: string): string {
  let sanitized = segment.replace(/[\\/:*?"<>|]/g, '_');
  if (sanitized.length > 50) sanitized = sanitized.substring(0, 50);
  return sanitized || '_';
}

export function getScrapedDirPath(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const domain = sanitizePathSegment(url.hostname);
    const segments = url.pathname.split('/').map(s => s.trim()).filter(Boolean);
    const sanitizedSegments = segments.map(sanitizePathSegment);
    if (sanitizedSegments.length === 0) sanitizedSegments.push('_root');
    return path.join(DATA_DIR, 'scraped', domain, ...sanitizedSegments);
  } catch (e) {
    const hash = crypto.createHash('md5').update(urlStr).digest('hex');
    return path.join(DATA_DIR, 'scraped', '_invalid_url', hash);
  }
}

export interface ScrapedArtifacts {
  url: string;
  title: string;
  classification: string;
  timestamp: number;
  statusCode: number;
  rawHtml: string;
  content: string;
  structuredData: any;
}

export async function saveScrapedTree(artifacts: ScrapedArtifacts): Promise<string> {
  const dirPath = getScrapedDirPath(artifacts.url);
  await fs.promises.mkdir(dirPath, { recursive: true });

  await fs.promises.writeFile(path.join(dirPath, 'raw.html'), artifacts.rawHtml || '', 'utf-8');
  await fs.promises.writeFile(path.join(dirPath, 'content.txt'), artifacts.content || '', 'utf-8');

  const metadata = {
    url: artifacts.url,
    hostname: new URL(artifacts.url).hostname,
    title: artifacts.title,
    classification: artifacts.classification,
    timestamp: artifacts.timestamp,
    statusCode: artifacts.statusCode,
  };
  await fs.promises.writeFile(path.join(dirPath, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
  await fs.promises.writeFile(path.join(dirPath, 'data.json'), JSON.stringify(artifacts.structuredData || {}, null, 2), 'utf-8');

  try {
    await fs.promises.writeFile(path.join(dirPath, 'page.md'), renderScrapedMarkdown(artifacts), 'utf-8');
  } catch (mdError) {
    console.error(`Failed to render markdown for ${artifacts.url}:`, mdError);
  }

  return dirPath;
}

// ─── Crawl Failure Tracking ─────────────────────────────────────────────────

export async function recordCrawlFailure(userId: string, failure: CrawlFailure): Promise<void> {
  const db = getDb();
  await db.insert(crawlFailures).values({
    url: failure.url,
    userId,
    domain: failure.domain,
    reason: failure.reason,
    statusCode: failure.statusCode ?? null,
    retryCount: failure.retryCount,
    timestamp: failure.timestamp,
  }).onConflictDoUpdate({
    target: crawlFailures.url,
    set: {
      reason: failure.reason,
      statusCode: failure.statusCode ?? null,
      retryCount: failure.retryCount,
      timestamp: failure.timestamp,
    },
  });
}

export async function getCrawlFailures(userId: string, filter?: { domain?: string; reason?: string }): Promise<CrawlFailure[]> {
  const db = getDb();
  const conditions = [eq(crawlFailures.userId, userId)];
  if (filter?.domain) conditions.push(eq(crawlFailures.domain, filter.domain));
  if (filter?.reason) conditions.push(eq(crawlFailures.reason, filter.reason));

  return db.select().from(crawlFailures)
    .where(and(...conditions))
    .orderBy(desc(crawlFailures.timestamp)) as Promise<CrawlFailure[]>;
}

export async function getFailureStats(userId: string): Promise<{ reason: string; count: number }[]> {
  const db = getDb();
  return db.select({
    reason: crawlFailures.reason,
    count: sql<number>`count(*)`.as('count'),
  }).from(crawlFailures)
    .where(eq(crawlFailures.userId, userId))
    .groupBy(crawlFailures.reason)
    .orderBy(desc(sql`count(*)`));
}

export async function getDomainQuality(userId: string, domain: string): Promise<{ domain: string; successRate: number; totalAttempts: number; lastFailure: number | null }> {
  const db = getDb();
  const failRows = await db.select({
    count: sql<number>`count(*)`.as('count'),
    lastFailure: sql<number>`max(${crawlFailures.timestamp})`.as('last_failure'),
  }).from(crawlFailures).where(and(eq(crawlFailures.userId, userId), eq(crawlFailures.domain, domain)));

  const successRows = await db.select({ count: sql<number>`count(*)`.as('count') })
    .from(documents)
    .where(and(eq(documents.userId, userId), sql`${documents.url} LIKE ${'%' + domain + '%'}`));

  const failures = failRows[0]?.count || 0;
  const successes = successRows[0]?.count || 0;
  const total = failures + successes;

  return {
    domain,
    successRate: total > 0 ? successes / total : 1,
    totalAttempts: total,
    lastFailure: failRows[0]?.lastFailure ?? null,
  };
}
