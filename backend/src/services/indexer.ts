import natural from 'natural';
import type { Document } from '@tse/shared';
import * as storage from './storage';
import { indexCache } from './indexCache';

const K1 = 1.2;
const B = 0.75;

export class Indexer {
  private tokenizer = new natural.WordTokenizer();
  private stemmer = natural.PorterStemmer;

  async indexDocument(doc: Document): Promise<void> {
    const tokens = this.tokenizeAndStem(doc.content);
    const termCounts: Record<string, number> = {};
    tokens.forEach((token) => {
      termCounts[token] = (termCounts[token] || 0) + 1;
    });

    const docLength = tokens.length;
    const totalDocs = indexCache.totalDocs + 1;
    const avgdl = indexCache.avgDocLength > 0 ? indexCache.avgDocLength : docLength;

    const batchEntries: { term: string; docId: string; weight: number }[] = [];

    for (const term in termCounts) {
      const tf = termCounts[term];
      const termDocMap = indexCache.getTermWeights(term);
      const docsWithTerm = (termDocMap ? termDocMap.size : 0) + 1;

      const idf = Math.log(1 + (totalDocs - docsWithTerm + 0.5) / (docsWithTerm + 0.5));
      const bm25 = idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (docLength / avgdl))));

      batchEntries.push({ term, docId: doc.id, weight: bm25 });
    }

    await storage.batchSaveTermWeights(batchEntries);
    await storage.upsertDoc({ ...doc, docLength });

    indexCache.addDoc(doc);
    for (const entry of batchEntries) {
      indexCache.updateTermWeight(entry.term, entry.docId, entry.weight);
    }
  }

  async reindexAll(): Promise<void> {
    const docs = await storage.getDocs();
    const totalDocs = docs.length;
    if (totalDocs === 0) return;

    const docLengths: Record<string, number> = {};
    let totalLen = 0;
    for (const doc of docs) {
      const len = this.tokenizeAndStem(doc.content).length;
      docLengths[doc.id] = len;
      totalLen += len;
    }
    const avgdl = totalLen / totalDocs;

    for (const doc of docs) {
      const tokens = this.tokenizeAndStem(doc.content);
      const termCounts: Record<string, number> = {};
      tokens.forEach(t => termCounts[t] = (termCounts[t] || 0) + 1);

      const docLength = docLengths[doc.id];

      for (const term in termCounts) {
        const tf = termCounts[term];
        const termDocCount = await storage.getTermDocCount(term);
        const docsWithTerm = termDocCount || 1;

        const idf = Math.log(1 + (totalDocs - docsWithTerm + 0.5) / (docsWithTerm + 0.5));
        const bm25 = idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (docLength / avgdl))));

        await storage.saveTermWeights(term, { [doc.id]: bm25 });
      }
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
