// ─── Document ────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  url: string;
  title: string;
  content: string; // Raw plain text (stripped HTML)
  timestamp: number; // Unix ms
  classification?: PageClassification;
}

// ─── Index ───────────────────────────────────────────────────────────────────

/** term → { docId → tf-idf weight } */
export type InvertedIndex = Record<string, Record<string, number>>;

/** docId → { term → tf-idf weight } — for cosine similarity */
export type TfIdfVectors = Record<string, Record<string, number>>;

export type PageClassification = 'Product' | 'Article' | 'Listing' | 'General';

export interface CrawlRequest {
  url: string;
  depth?: number; // Default 1
}

export type CrawlStatus = 'queued' | 'crawling' | 'done' | 'error';

export interface CrawlProgress {
  status: CrawlStatus;
  url: string;
  docsCrawled: number;
  totalExpected: number;
  currentLevel: number;
  maxDepth: number;
  activeUrl?: string;
  recentTerms: string[];
  startTime: number;
}

export interface CrawlResult {
  url: string;
  status: CrawlStatus;
  docsCrawled: number;
  message?: string;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export type SearchMode = 'keyword' | 'semantic' | 'hybrid' | 'meaningful';

export interface SearchAnalytics {
  query: string;
  count: number;
  avgLatency: number;
}

export interface SearchQuery {
  q: string;
  mode: SearchMode;
  page?: number; // 1-indexed, default 1
}

export interface SearchResult {
  id: string;
  url: string;
  title: string;
  snippet: string; // Highlighted excerpt
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  timeMs: number;
  suggestion?: string; // Spell-corrected query
  brainOutput?: {
    answer: string;
    reasoning?: unknown;
  };
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface SearchLog {
  query: string;
  resultCount: number;
  responseMs: number;
  timestamp: number;
}

export interface AnalyticsSummary {
  topQueries: { query: string; count: number }[];
  zeroResultQueries: string[];
  avgLatencyMs: number;
  totalSearches: number;
}

export interface Stats {
  totalDocs: number;
  totalWords: number;
  lastCrawledAt: number | null;
}
