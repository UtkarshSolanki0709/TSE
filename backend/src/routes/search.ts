import { Router } from 'express';
import natural from 'natural';
import * as storage from '../services/storage';
import type { SearchQuery, SearchResponse, SearchResult, Document } from '@tse/shared';
import { getSuggestion } from '../utils/spellcheck';
import { brain } from '../services/brain';

const router = Router();
const stemmer = natural.PorterStemmer;

/**
 * GET /search
 * Phase 2+: Ranked TF-IDF search + Spell Suggestions
 */
router.get('/', async (req, res) => {
  const { q } = req.query as unknown as SearchQuery;

  if (!q) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const startTime = Date.now();

  try {
    // 1. Process and Stem query terms
    const rawTerms = q.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const queryTerms = rawTerms.map(t => stemmer.stem(t));
    
    // 2. Accumulate scores per document
    const scores: Record<string, number> = {};
    for (const term of queryTerms) {
      const weights = await storage.getTermWeights(term);
      for (const docId in weights) {
        scores[docId] = (scores[docId] || 0) + weights[docId];
      }
    }

    // 3. format results
    const docIds = Object.keys(scores);
    const results: SearchResult[] = [];
    for (const docId of docIds) {
      const doc = await storage.getDocById(docId);
      if (doc) {
        results.push({
          id: doc.id,
          url: doc.url,
          title: doc.title,
          snippet: doc.content.substring(0, 200) + '...',
          score: scores[docId]
        });
      }
    }

    results.sort((a, b) => b.score - a.score);

    // 4. Spell Suggestion (only if few results or misspelled)
    let suggestion: string | undefined = undefined;
    if (results.length < 5) {
      const vocab = await storage.getVocabulary();
      // Simple suggestion for the first term for now
      if (queryTerms[0]) {
        const typo = queryTerms[0];
        const corrected = getSuggestion(typo, vocab);
        if (corrected && corrected !== typo) {
          suggestion = corrected;
        }
      }
    }

    const response: SearchResponse & { brainOutput?: any } = {
      results: results.slice(0, 50),
      total: results.length,
      page: 1,
      timeMs: Date.now() - startTime,
      suggestion
    };

    // 6. Brain Synthesis (if meaningful mode enabled)
    const { mode } = req.query;
    if (mode === 'meaningful' && results.length > 0) {
      // Get full content for top 3 results
      const topDocs: Document[] = [];
      for (const res of results.slice(0, 3)) {
        const fullDoc = await storage.getDocById(res.id);
        if (fullDoc) topDocs.push(fullDoc);
      }
      
      const brainOutput = await brain.synthesizeSearch(q, topDocs);
      response.brainOutput = brainOutput;
    }

    // 5. Async log
    storage.appendLog({
      query: q,
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

export default router;
