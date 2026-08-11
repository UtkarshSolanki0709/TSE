import { Router } from 'express';
import { z } from 'zod';
import { crawler } from '../services/crawler';
import { indexer } from '../services/indexer';
import * as storage from '../services/storage';
import { indexCache } from '../services/indexCache';
import { Server } from 'socket.io';
import type { CrawlProgress, CrawlFailureEvent } from '@tse/shared';
import pLimit from 'p-limit';
import crypto from 'crypto';

const crawlSchema = z.object({
  url: z.string().url().max(2048),
  depth: z.number().int().min(1).max(3).optional().default(1),
  browser: z.boolean().optional().default(false),
});

const directSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().max(500).optional(),
  content: z.string().min(1).max(500000),
});

const router = Router();
let io: Server;

export function setupCrawlSocket(socketIo: Server) {
  io = socketIo;
}

const emitProgress = (progress: CrawlProgress) => {
  if (io) io.emit('crawl-progress', progress);
};

router.post('/', async (req, res) => {
  const userId = req.userId!;
  const parsed = crawlSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  const { url, depth, browser } = parsed.data;

  try {
    // Ensure user's index is loaded
    await indexCache.loadUser(userId);

    const visited = new Set<string>();
    const queue = [{ url, currentDepth: 1 }];
    let docsCrawled = 0;
    let failedCount = 0;
    const failures: CrawlFailureEvent[] = [];
    const startTime = Date.now();

    const MAX_PAGES = depth === 1 ? 1 : (depth === 2 ? 15 : 40);

    const emitProgressWithFailures = (progress: CrawlProgress) => {
      emitProgress({ ...progress, failedCount, failures: progress.status === 'done' ? failures : undefined });
    };

    emitProgressWithFailures({
      status: 'crawling',
      url,
      docsCrawled: 0,
      totalExpected: MAX_PAGES,
      currentLevel: 1,
      maxDepth: depth,
      recentTerms: [],
      startTime
    });

    const limit = pLimit(5);

    while (queue.length > 0 && docsCrawled < MAX_PAGES) {
      const batchSize = Math.min(queue.length, 5);
      const batch = queue.splice(0, batchSize);

      await Promise.all(batch.map(item => limit(async () => {
        if (docsCrawled >= MAX_PAGES) return;

        const { url: currentUrl, currentDepth } = item;
        if (visited.has(currentUrl)) return;
        visited.add(currentUrl);

        const crawlResult = await crawler.crawl(currentUrl, browser);
        const { doc, links, classification, structuredData, rawHtml, failure } = crawlResult;

        if (doc) {
          await indexer.indexDocument(userId, doc);
          docsCrawled++;

          try {
            await storage.saveScrapedTree({
              url: currentUrl,
              title: doc.title,
              classification,
              timestamp: doc.timestamp,
              statusCode: 200,
              rawHtml,
              content: doc.content,
              structuredData,
            });
          } catch (storageError) {
            console.error(`Failed to save scraped tree for ${currentUrl}:`, storageError);
          }

          const sampleTerms = doc.content.split(/\s+/).slice(10, 15).filter(t => t.length > 3);

          emitProgressWithFailures({
            status: 'crawling',
            url,
            docsCrawled,
            totalExpected: MAX_PAGES,
            currentLevel: currentDepth,
            maxDepth: depth,
            activeUrl: currentUrl,
            recentTerms: sampleTerms,
            startTime
          });

          if (currentDepth < depth) {
            links.forEach(link => {
              if (!visited.has(link) && queue.length < MAX_PAGES * 2) {
                queue.push({ url: link, currentDepth: currentDepth + 1 });
              }
            });
          }
        } else {
          failedCount++;
          if (failure) {
            await storage.recordCrawlFailure(userId, failure);
            const failureEvent: CrawlFailureEvent = {
              url: failure.url,
              reason: failure.reason,
              retryCount: failure.retryCount,
              timestamp: failure.timestamp,
            };
            failures.push(failureEvent);
            if (io) io.emit('crawl-failure', failureEvent);
          }
          console.warn(`Failed to crawl: ${currentUrl} — reason: ${failure?.reason ?? 'unknown'}`);
        }
      })));
    }

    const finalProgress: CrawlProgress = {
      status: 'done',
      url,
      docsCrawled,
      totalExpected: MAX_PAGES,
      currentLevel: depth,
      maxDepth: depth,
      recentTerms: [],
      startTime,
      failedCount,
      failures,
    };
    emitProgress(finalProgress);

    return res.status(200).json({
      message: `Successfully indexed ${docsCrawled} pages${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      result: { url, status: 'done', docsCrawled, failedCount, failures }
    });
  } catch (error) {
    console.error('Crawl route error:', error);
    return res.status(500).json({ error: 'Internal server error during crawl' });
  }
});

router.post('/direct', async (req, res) => {
  const userId = req.userId!;
  const parsed = directSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  const { url, title, content } = parsed.data;

  try {
    await indexCache.loadUser(userId);

    const doc = {
      id: crypto.randomUUID(),
      url,
      title: title || url,
      content,
      timestamp: Date.now()
    };

    await indexer.indexDocument(userId, doc);

    return res.status(200).json({
      message: 'Successfully indexed page from extension',
      docId: doc.id
    });
  } catch (error) {
    console.error('Direct index error:', error);
    return res.status(500).json({ error: 'Internal server error during direct index' });
  }
});

export default router;
