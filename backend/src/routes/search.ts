import { Router } from 'express';
import natural from 'natural';
import type { SearchResult, Document } from '@tse/shared';
import { getSuggestion } from '../utils/spellcheck';
import { parseQuery } from '../utils/queryParser';
import { brain, INSIGHT_PROVIDERS } from '../services/brain';
import { indexCache } from '../services/indexCache';
import * as storage from '../services/storage';

const router = Router();
const stemmer = natural.PorterStemmer;

function makeSnippet(content: string, terms: string[]): string {
  const lower = content.toLowerCase();
  let idx = -1;
  for (const t of terms) {
    idx = lower.indexOf(t);
    if (idx >= 0) break;
  }
  if (idx < 0) return content.replace(/\s+/g, ' ').substring(0, 200);
  const start = Math.max(0, idx - 80);
  const end = Math.min(content.length, start + 200);
  const excerpt = content.substring(start, end).replace(/\s+/g, ' ').trim();
  return (start > 0 ? '...' : '') + excerpt + (end < content.length ? '...' : '');
}

router.get('/', async (req, res) => {
  const userId = req.userId!;
  await indexCache.loadUser(userId);
  const rawQ = (req.query.q as string || '').replace(/[\x00-\x1F]/g, '').trim().slice(0, 200);

  if (!rawQ) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const startTime = Date.now();

  try {
    const { mode } = req.query;
    const parsed = parseQuery(rawQ);

    const queryTerms = parsed.includeTerms.map(t => stemmer.stem(t));
    const excludeStems = new Set(parsed.excludeTerms.map(t => stemmer.stem(t)));

    const scores: Record<string, number> = {};
    for (const term of queryTerms) {
      const weights = indexCache.getTermWeights(userId, term);
      if (weights) {
        for (const [docId, weight] of weights) {
          scores[docId] = (scores[docId] || 0) + weight;
        }
      }
    }

    const docIds = Object.keys(scores);
    const results: SearchResult[] = [];
    for (const docId of docIds) {
      const doc = indexCache.getDoc(docId);
      if (!doc) continue;

      if (parsed.siteFilter && !doc.url.includes(parsed.siteFilter)) continue;

      if (excludeStems.size > 0) {
        const docStems = new Set(
          doc.content.toLowerCase().split(/\s+/).map(t => stemmer.stem(t))
        );
        let excluded = false;
        for (const es of excludeStems) {
          if (docStems.has(es)) { excluded = true; break; }
        }
        if (excluded) continue;
      }

      if (parsed.exactPhrases.length > 0) {
        const lower = doc.content.toLowerCase();
        let hasAll = true;
        for (const phrase of parsed.exactPhrases) {
          if (!lower.includes(phrase)) { hasAll = false; break; }
        }
        if (!hasAll) continue;
      }

      results.push({
        id: doc.id,
        url: doc.url,
        title: doc.title,
        snippet: makeSnippet(doc.content, parsed.includeTerms),
        score: scores[docId]
      });
    }

    results.sort((a, b) => b.score - a.score);

    let suggestion: string | undefined = undefined;
    if (results.length < 5 && queryTerms[0]) {
      const typo = queryTerms[0];
      const vocab = [...indexCache.getVocabulary(userId)];
      const corrected = getSuggestion(typo, vocab);
      if (corrected && corrected !== typo) {
        suggestion = corrected;
      }
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const startIdx = (page - 1) * limit;
    const pagedResults = results.slice(startIdx, startIdx + limit);

    const response: any = {
      results: pagedResults,
      total: results.length,
      page,
      timeMs: Date.now() - startTime,
      suggestion
    };

    if (mode === 'insight' && results.length > 0) {
      const topDocs: Document[] = [];
      for (const r of results.slice(0, 3)) {
        const fullDoc = indexCache.getDoc(r.id);
        if (fullDoc) topDocs.push(fullDoc);
      }

      const brainOutput = await brain.synthesizeSearch(rawQ, topDocs, {
        provider: req.header('x-insight-provider') || undefined,
        model: req.header('x-insight-model') || undefined,
        apiKey: req.header('x-insight-key') || undefined,
      });
      response.brainOutput = brainOutput;
    }

    storage.appendLog(userId, {
      query: rawQ,
      resultCount: results.length,
      responseMs: response.timeMs,
      timestamp: Date.now()
    }).catch(err => console.error('Failed to log search:', err));

    return res.status(200).json(response);

  } catch (error) {
    console.error('Search route error:', error);
    return res.status(500).json({ error: 'Internal server error during search' });
  }
});

router.get('/suggest', (req, res) => {
  const userId = req.userId!;
  const prefix = (req.query.q as string || '').trim().toLowerCase().slice(0, 50);
  if (!prefix) return res.json([]);
  const suggestions = indexCache.getSuggestions(userId, prefix, 10);
  return res.json(suggestions);
});

router.get('/insight/providers', (_req, res) => {
  res.json(INSIGHT_PROVIDERS);
});

export default router;
