import type { Document } from '@tse/shared';
import * as storage from './storage';

export class IndexCache {
  terms = new Map<string, Map<string, number>>();
  docs = new Map<string, Document>();
  vocabulary = new Set<string>();
  totalDocs = 0;
  avgDocLength = 0;

  async init(): Promise<void> {
    const [allDocs, indexRows] = await Promise.all([
      storage.getDocs(),
      storage.getIndexRows(),
    ]);

    let totalLength = 0;
    for (const doc of allDocs) {
      this.docs.set(doc.id, doc);
      const len = this.tokenCount(doc.content);
      totalLength += len;
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
  }

  getTermWeights(term: string): Map<string, number> | undefined {
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

  removeDoc(docId: string): void {
    const doc = this.docs.get(docId);
    if (!doc) return;

    this.docs.delete(docId);
    this.totalDocs--;

    for (const [term, docMap] of this.terms) {
      if (docMap.delete(docId) && docMap.size === 0) {
        this.terms.delete(term);
        this.vocabulary.delete(term);
      }
    }
  }

  getSuggestions(prefix: string, max = 10): string[] {
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

  private tokenCount(text: string): number {
    return text.split(/\s+/).filter(t => t.length > 0).length;
  }
}

export const indexCache = new IndexCache();
