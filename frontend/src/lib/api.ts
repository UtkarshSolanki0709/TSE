import type { SearchQuery, SearchResponse, CrawlRequest, CrawlResult, SearchAnalytics } from '@tse/shared';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('tse_token');
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function search(params: SearchQuery & { insightKey?: string; insightProvider?: string; insightModel?: string }): Promise<SearchResponse> {
  const query = new URLSearchParams({
    q: params.q,
    mode: params.mode || 'keyword',
    page: (params.page || 1).toString(),
  });

  const headers = getHeaders();
  if (params.mode === 'insight') {
    if (params.insightKey) headers['x-insight-key'] = params.insightKey;
    if (params.insightProvider) headers['x-insight-provider'] = params.insightProvider;
    if (params.insightModel) headers['x-insight-model'] = params.insightModel;
  }

  const response = await fetch(`${API_BASE}/search?${query}`, { headers });
  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error('Search failed');
  }
  return response.json();
}

export async function crawl(params: CrawlRequest): Promise<CrawlResult> {
  const response = await fetch(`${API_BASE}/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(data.error || 'Crawl failed');
  }
  return data.result;
}

export async function getAnalytics(): Promise<SearchAnalytics[]> {
  const response = await fetch(`${API_BASE}/analytics`, { headers: getHeaders() });
  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error('Failed to fetch analytics');
  }
  return response.json();
}

export async function getAnalyticsGaps(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/analytics/gaps`, { headers: getHeaders() });
  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error('Failed to fetch analytics gaps');
  }
  return response.json();
}

export async function suggest(prefix: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/search/suggest?q=${encodeURIComponent(prefix)}`, { headers: getHeaders() });
  if (!response.ok) return [];
  return response.json();
}

export interface InsightProviderConfig {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  keyPlaceholder: string;
}

export async function getInsightProviders(): Promise<InsightProviderConfig[]> {
  const response = await fetch(`${API_BASE}/search/insight/providers`, { headers: getHeaders() });
  if (!response.ok) return [];
  return response.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; createdAt: number };
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Signup failed');
  }
  return response.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Login failed');
  }
  return response.json();
}

export async function getMe(): Promise<{ id: string; email: string; createdAt: number }> {
  const response = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Not authenticated');
  return response.json();
}

export function oauthLogin(provider: 'google' | 'github'): void {
  window.location.href = `${API_BASE}/auth/${provider}`;
}
