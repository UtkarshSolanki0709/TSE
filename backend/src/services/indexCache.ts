import type { Document } from '@tse/shared';
import * as storage from './storage';

// ponytail: per-user cache. In cloud mode, each user has isolated data.
// Local mode uses single "local" userId, so cache behaves as before.

export class IndexCache {
  private terms = new Map<string, Map<string, number>>();
  private docs = new Map<string, Document>();
  private vocabulary = new Set<string>();
  private totalDocs = 0;
  private avgDocLength = 0;
  private loadedUserId: string | null = null;

  async init(): Promise<void> {
    const mode = process.env.MODE || 'local';
    if (mode === 'local') {
      await this.loadUser('local');
    }
  }

  async loadUser(userId: string): Promise<void> {
    if (this.loadedUserId === userId) return;

    // ponytail: clear and reload. For multi-user cloud, this means cache
    // only holds one user's data at a time. LRU for multiple users later.
    this.terms.clear();
    this.docs.clear();
    this.vocabulary.clear();
    this.totalDocs = 0;
    this.avgDocLength = 0;

    const [allDocs, indexRows] = await Promise.all([
      storage.getDocs(userId),
      storage.getIndexRows(userId),
    ]);

    let totalLength = 0;
    for (const doc of allDocs) {
      this.docs.set(doc.id, doc);
      totalLength += this.tokenCount(doc.content);
    }

    this.totalDocs = allDocs.length;
    this.avgDocLength = this.totalDocs > 0 ? totalLength / this.totalDocs : 0;

    for (const row of indexRows) {
      if (!this.terms.has(row.term)) {
        this.terms.set(row.term, new Map());
      }
      this.terms.get(row.term)!.set(row.docId, row.weight);
      this.vocabulary.add(row.term);
    }

    this.loadedUserId = userId;
  }

  getTermWeights(userId: string, term: string): Map<string, number> | undefined {
    if (this.loadedUserId !== userId) return undefined;
    return this.terms.get(term);
  }

  getDoc(id: string): Document | undefined {
    return this.docs.get(id);
  }

  addDoc(doc: Document): void {
    this.docs.set(doc.id, doc);
    this.totalDocs++;
    const len = this.tokenCount(doc.content);
    this.avgDocLength = ((this.avgDocLength * (this.totalDocs - 1)) + len) / this.totalDocs;
  }

  updateTermWeight(term: string, docId: string, weight: number): void {
    if (!this.terms.has(term)) {
      this.terms.set(term, new Map());
    }
    this.terms.get(term)!.set(docId, weight);
    this.vocabulary.add(term);
  }

  getSuggestions(userId: string, prefix: string, max = 10): string[] {
    if (this.loadedUserId !== userId) return [];
    const lower = prefix.toLowerCase();
    const matches: string[] = [];
    for (const word of this.vocabulary) {
      if (word.startsWith(lower)) {
        matches.push(word);
        if (matches.length >= max) break;
      }
    }
    return matches;
  }

  getVocabulary(userId: string): Set<string> {
    if (this.loadedUserId !== userId) return new Set();
    return this.vocabulary;
  }

  getTotalDocs(userId: string): number {
    if (this.loadedUserId !== userId) return 0;
    return this.totalDocs;
  }

  getAvgDocLength(userId: string): number {
    if (this.loadedUserId !== userId) return 0;
    return this.avgDocLength;
  }

  private tokenCount(text: string): number {
    return text.split(/\s+/).filter(t => t.length > 0).length;
  }
}

export const indexCache = new IndexCache();
