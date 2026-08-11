import natural from 'natural';
import type { Document } from '@tse/shared';
import * as storage from './storage';
import { indexCache } from './indexCache';

const K1 = 1.2;
const B = 0.75;

export class Indexer {
  private tokenizer = new natural.WordTokenizer();
  private stemmer = natural.PorterStemmer;

  async indexDocument(userId: string, doc: Document, quality: 'normal' | 'low' = 'normal'): Promise<void> {
    const tokens = this.tokenizeAndStem(doc.content);
    const termCounts: Record<string, number> = {};
    tokens.forEach((token) => {
      termCounts[token] = (termCounts[token] || 0) + 1;
    });

    const docLength = tokens.length;
    if (docLength === 0) {
      console.warn(`Skipping index for ${doc.url}: zero tokens after tokenization`);
      return;
    }

    const totalDocs = indexCache.getTotalDocs(userId) + 1;
    const avgdl = indexCache.getAvgDocLength(userId) > 0 ? indexCache.getAvgDocLength(userId) : docLength;

    const qualityMultiplier = quality === 'low' ? 0.3 : 1.0;

    const batchEntries: { term: string; docId: string; weight: number }[] = [];

    for (const term in termCounts) {
      const tf = termCounts[term];
      const termDocMap = indexCache.getTermWeights(userId, term);
      const docsWithTerm = (termDocMap ? termDocMap.size : 0) + 1;

      const idf = Math.log(1 + (totalDocs - docsWithTerm + 0.5) / (docsWithTerm + 0.5));
      const bm25 = idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (docLength / avgdl)))) * qualityMultiplier;

      batchEntries.push({ term, docId: doc.id, weight: bm25 });
    }

    await storage.batchSaveTermWeights(userId, batchEntries);
    await storage.upsertDoc(userId, { ...doc, docLength });

    indexCache.addDoc(doc);
    for (const entry of batchEntries) {
      indexCache.updateTermWeight(entry.term, entry.docId, entry.weight);
    }
  }

  private tokenizeAndStem(text: string): string[] {
    const tokens = this.tokenizer.tokenize(text.toLowerCase()) || [];
    return tokens
      .filter((token) => !natural.stopwords.includes(token))
      .map((token) => this.stemmer.stem(token));
  }
}

export const indexer = new Indexer();
