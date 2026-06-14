import natural from 'natural';
import type { Document } from '@tse/shared';
import * as storage from './storage';

export class Indexer {
  private tokenizer = new natural.WordTokenizer();
  private stemmer = natural.PorterStemmer;

  /**
   * Processes a document and updates the index with TF-IDF weights.
   */
  async indexDocument(doc: Document): Promise<void> {
    const tokens = this.tokenizeAndStem(doc.content);
    const termCounts: Record<string, number> = {};

    // 1. Calculate Raw Term Counts
    tokens.forEach((token) => {
      termCounts[token] = (termCounts[token] || 0) + 1;
    });

    const totalDocs = (await storage.getDocCount()) + 1; // +1 for the new doc
    const batchEntries: { term: string; docId: string; weight: number }[] = [];

    // 2. Calculate TF and initial weights
    for (const term in termCounts) {
      const tf = termCounts[term] / tokens.length;
      
      // Calculate IDF: log10(totalDocs / docsWithTerm) + 1.0 (smoothing)
      const docsWithTerm = (await storage.getTermDocCount(term)) + 1;
      const idf = Math.log10(totalDocs / docsWithTerm) + 1.0;
      
      const tfIdf = tf * idf;
      batchEntries.push({ term, docId: doc.id, weight: tfIdf });
    }

    // Persist to SQLite in a single batch
    await storage.batchSaveTermWeights(batchEntries);

    // 3. Save the document itself
    await storage.upsertDoc(doc);
  }

  /**
   * Recalculates all TF-IDF weights across the entire corpus.
   * This should be run when the total number of documents changes significantly.
   */
  async reindexAll(): Promise<void> {
    const docs = await storage.getDocs();
    const totalDocs = docs.length;
    if (totalDocs === 0) return;

    console.log(`Re-indexing ${totalDocs} documents...`);

    for (const doc of docs) {
      const tokens = this.tokenizeAndStem(doc.content);
      const termCounts: Record<string, number> = {};
      tokens.forEach(t => termCounts[t] = (termCounts[t] || 0) + 1);

      for (const term in termCounts) {
        const tf = termCounts[term] / tokens.length;
        const docsWithTerm = await storage.getTermDocCount(term);
        const idf = Math.log10(totalDocs / (docsWithTerm || 1));
        await storage.saveTermWeights(term, { [doc.id]: tf * idf });
      }
    }
  }

  /**
   * Tokenizes text, converts to lowercase, stems, and filters stopwords.
   */
  private tokenizeAndStem(text: string): string[] {
    const tokens = this.tokenizer.tokenize(text.toLowerCase()) || [];
    return tokens
      .filter((token) => !natural.stopwords.includes(token))
      .map((token) => this.stemmer.stem(token));
  }
}

export const indexer = new Indexer();
