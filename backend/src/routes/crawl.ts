import { Router } from 'express';
import { crawler } from '../services/crawler';
import { indexer } from '../services/indexer';
import * as storage from '../services/storage';
import { Server } from 'socket.io';
import type { CrawlProgress } from '@tse/shared';
import pLimit from 'p-limit';
import crypto from 'crypto';

const router = Router();
let io: Server;

export function setupCrawlSocket(socketIo: Server) {
  io = socketIo;
}

const emitProgress = (progress: CrawlProgress) => {
  if (io) io.emit('crawl-progress', progress);
};

/**
 * Trigger a crawl for a specific URL
 */
router.post('/', async (req, res) => {
  const { url, depth = 1 } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`Starting crawl for: ${url} (depth: ${depth})`);

  try {
    const visited = new Set<string>();
    const queue = [{ url, currentDepth: 1 }];
    let docsCrawled = 0;
    const startTime = Date.now();

    const MAX_PAGES = depth === 1 ? 1 : (depth === 2 ? 15 : 40); 

    emitProgress({
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

      console.log(`Processing batch of ${batch.length} URLs. Queue remaining: ${queue.length}`);

      await Promise.all(batch.map(item => limit(async () => {
        if (docsCrawled >= MAX_PAGES) return;

        const { url: currentUrl, currentDepth } = item;
        if (visited.has(currentUrl)) return;
        visited.add(currentUrl);

        console.log(`[${docsCrawled + 1}/${MAX_PAGES}] Crawling: ${currentUrl}`);

        const { doc, links } = await crawler.crawl(currentUrl);
        
        if (doc) {
          await indexer.indexDocument(doc);
          docsCrawled++;

          const sampleTerms = doc.content.split(/\s+/).slice(10, 15).filter(t => t.length > 3);

          emitProgress({
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
          console.warn(`Failed to crawl: ${currentUrl}`);
        }
      })));
    }

    console.log(`Crawl finished. Indexed ${docsCrawled} pages.`);

    const finalProgress: CrawlProgress = {
      status: 'done',
      url,
      docsCrawled,
      totalExpected: MAX_PAGES,
      currentLevel: depth,
      maxDepth: depth,
      recentTerms: [],
      startTime
    };
    emitProgress(finalProgress);

    return res.status(200).json({
      message: `Successfully indexed ${docsCrawled} pages`,
      result: { url, status: 'done', docsCrawled }
    });
  } catch (error) {
    console.error('Crawl route error:', error);
    return res.status(500).json({ error: 'Internal server error during crawl' });
  }
});

/**
 * Direct index from extension
 */
router.post('/direct', async (req, res) => {
  const { url, title, content } = req.body;

  if (!url || !content) {
    return res.status(400).json({ error: 'URL and content are required' });
  }

  try {
    const doc = {
      id: crypto.randomUUID(),
      url,
      title: title || url,
      content,
      timestamp: Date.now()
    };

    await indexer.indexDocument(doc);

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
