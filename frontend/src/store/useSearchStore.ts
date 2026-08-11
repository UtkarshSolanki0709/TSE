import { create } from 'zustand';
import type { SearchResult, SearchMode, SearchAnalytics, CrawlProgress } from '@tse/shared';
import * as api from '../lib/api';
import { io } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';

let socket: ReturnType<typeof io> | null = null;
let socketInit = false;

interface SearchState {
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
  autocomplete: string[];
  insightKey: string;
  insightProvider: string;
  insightModel: string;
  insightProviders: { id: string; label: string; baseUrl: string; defaultModel: string; models: string[]; keyPlaceholder: string }[];

  setQuery: (q: string) => void;
  setMode: (mode: SearchMode) => void;
  setInsightKey: (key: string) => void;
  setInsightProvider: (provider: string) => void;
  setInsightModel: (model: string) => void;
  setCrawlDepth: (depth: number) => void;
  performSearch: (q?: string) => Promise<void>;
  performCrawl: (url: string) => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  fetchSuggestions: (prefix: string) => Promise<void>;
  fetchProviders: () => Promise<void>;
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
  autocomplete: [],
  insightKey: localStorage.getItem('tse_insight_key') || '',
  insightProvider: localStorage.getItem('tse_insight_provider') || 'openrouter',
  insightModel: localStorage.getItem('tse_insight_model') || '',
  insightProviders: [],

  setQuery: (query) => set({ query, brainOutput: null, ...(query.trim() ? {} : { results: [], total: 0 }) }),
  setMode: (mode) => set({ mode, brainOutput: null, results: get().query.trim() ? get().results : [], total: get().query.trim() ? get().total : 0 }),
  setInsightKey: (insightKey) => {
    localStorage.setItem('tse_insight_key', insightKey);
    set({ insightKey });
  },
  setInsightProvider: (insightProvider) => {
    localStorage.setItem('tse_insight_provider', insightProvider);
    set({ insightProvider });
  },
  setInsightModel: (insightModel) => {
    localStorage.setItem('tse_insight_model', insightModel);
    set({ insightModel });
  },
  setCrawlDepth: (crawlDepth) => set({ crawlDepth }),

  initSocket: () => {
    if (socketInit) return;
    socketInit = true;
    socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socket.on('crawl-progress', (progress: CrawlProgress) => {
      set({ crawlProgress: progress });
      if (progress.status === 'done' || progress.status === 'error') {
        setTimeout(() => set({ crawlProgress: null }), 5000);
      }
    });
    socket.on('crawl-failure', (failure: { url: string; reason: string; retryCount: number }) => {
      console.warn(`Crawl failure: ${failure.url} — ${failure.reason} (retries: ${failure.retryCount})`);
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
        insightKey: get().insightKey,
        insightProvider: get().insightProvider,
        insightModel: get().insightModel,
      });
      set({ 
        results: response.results, 
        total: response.total, 
        timeMs: response.timeMs,
        suggestion: response.suggestion || null,
        brainOutput: response.brainOutput || null,
        loading: false 
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Search failed';
      if (message === 'UNAUTHORIZED') {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return;
      }
      set({ error: message, loading: false });
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Crawl failed';
      if (message === 'UNAUTHORIZED') {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return;
      }
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
    } catch (e: unknown) {
       if (e instanceof Error && e.message === 'UNAUTHORIZED') {
         useAuthStore.getState().logout();
         window.location.href = '/login';
         return;
       }
       console.error('Failed to fetch analytics:', e);
    }
  },

  fetchSuggestions: async (prefix) => {
    if (prefix.length < 1) {
      set({ autocomplete: [] });
      return;
    }
    const words = await api.suggest(prefix);
    set({ autocomplete: words.slice(0, 8) });
  },

  fetchProviders: async () => {
    const providers = await api.getInsightProviders();
    if (providers.length > 0) {
      const current = get().insightProvider;
      const stillValid = providers.some(p => p.id === current);
      set({
        insightProviders: providers,
        insightModel: get().insightModel || (stillValid ? '' : providers.find(p => p.id === current)?.defaultModel || ''),
      });
    }
  },
}));
