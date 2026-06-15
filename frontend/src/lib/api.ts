import type { SearchQuery, SearchResponse, CrawlRequest, CrawlResult, SearchAnalytics } from '@tse/shared';

const API_BASE = 'http://localhost:3000';

export async function search(params: SearchQuery): Promise<SearchResponse> {
  const query = new URLSearchParams({
    q: params.q,
    mode: params.mode || 'keyword',
    page: (params.page || 1).toString(),
  });

  const response = await fetch(`${API_BASE}/search?${query}`);
  if (!response.ok) {
    throw new Error('Search failed');
  }
  return response.json();
}

export async function crawl(params: CrawlRequest): Promise<CrawlResult> {
  const response = await fetch(`${API_BASE}/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Crawl failed');
  }
  return data.result;
}

export async function getAnalytics(): Promise<SearchAnalytics[]> {
  const response = await fetch(`${API_BASE}/analytics`);
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
}

export async function getAnalyticsGaps(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/analytics/gaps`);
  if (!response.ok) throw new Error('Failed to fetch analytics gaps');
  return response.json();
}

export async function suggest(prefix: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/search/suggest?q=${encodeURIComponent(prefix)}`);
  if (!response.ok) return [];
  return response.json();
}
