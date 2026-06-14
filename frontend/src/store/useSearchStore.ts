import { create } from 'zustand';
import type { SearchResult, SearchMode, SearchAnalytics, CrawlProgress } from '@tse/shared';
import * as api from '../lib/api';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

interface SearchState {
  // State
  query: string;
  mode: SearchMode;
  results: SearchResult[];
  suggestion: string | null;
  total: number;
  loading: boolean;
  error: string | null;
  timeMs: number;
  analytics: SearchAnalytics[];
  gaps: string[];
  crawlDepth: number;
  crawlProgress: CrawlProgress | null;
  brainOutput: { answer: string; reasoning?: unknown } | null;

  // Actions
  setQuery: (q: string) => void;
  setMode: (mode: SearchMode) => void;
  setCrawlDepth: (depth: number) => void;
  performSearch: (q?: string) => Promise<void>;
  performCrawl: (url: string) => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  initSocket: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  mode: 'keyword',
  crawlDepth: 1,
  crawlProgress: null,
  results: [],
  suggestion: null,
  total: 0,
  loading: false,
  error: null,
  timeMs: 0,
  analytics: [],
  gaps: [],
  brainOutput: null,

  setQuery: (query) => set({ query }),
  setMode: (mode) => set({ mode }),
  setCrawlDepth: (crawlDepth) => set({ crawlDepth }),

  initSocket: () => {
    socket.on('crawl-progress', (progress: CrawlProgress) => {
      set({ crawlProgress: progress });
      if (progress.status === 'done' || progress.status === 'error') {
        setTimeout(() => set({ crawlProgress: null }), 5000);
      }
    });
  },

  performSearch: async (q) => {
    const searchString = q !== undefined ? q : get().query;
    if (!searchString.trim()) return;

    set({ loading: true, error: null, suggestion: null });
    try {
      const response = await api.search({
        q: searchString,
        mode: get().mode,
      });
      set({ 
        results: response.results, 
        total: response.total, 
        timeMs: response.timeMs,
        suggestion: response.suggestion || null,
        brainOutput: response.brainOutput || null,
        loading: false 
      });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  performCrawl: async (url) => {
    if (!url.trim()) return;
    set({ loading: true, error: null });
    try {
      await api.crawl({ 
        url, 
        depth: get().crawlDepth 
      });
      set({ loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Crawl failed';
      set({ error: message, loading: false });
    }
  },

  fetchAnalytics: async () => {
    try {
       const [stats, gaps] = await Promise.all([
         api.getAnalytics(),
         api.getAnalyticsGaps()
       ]);
       set({ analytics: stats, gaps });
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }
}));
