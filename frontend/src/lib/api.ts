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

async function parseJsonResponse<T>(response: Response, defaultError = 'Request failed'): Promise<T> {
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');

    if (contentType.includes('application/json')) {
      try {
        const data = await response.json();
        throw new Error(data.error || data.message || defaultError);
      } catch (e: unknown) {
        if (e instanceof Error && e.message !== defaultError) throw e;
      }
    }

    const text = await response.text();
    const cleanMsg = text.replace(/<[^>]*>/g, '').trim();
    throw new Error(cleanMsg || `${defaultError} (${response.status})`);
  }

  return response.json() as Promise<T>;
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
  return parseJsonResponse<SearchResponse>(response, 'Search failed');
}

export async function crawl(params: CrawlRequest): Promise<CrawlResult> {
  const response = await fetch(`${API_BASE}/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify(params),
  });

  const data = await parseJsonResponse<{ result?: CrawlResult; error?: string }>(response, 'Crawl failed');
  if (data.result) return data.result;
  throw new Error(data.error || 'Crawl failed');
}

export async function getAnalytics(): Promise<SearchAnalytics[]> {
  const response = await fetch(`${API_BASE}/analytics`, { headers: getHeaders() });
  return parseJsonResponse<SearchAnalytics[]>(response, 'Failed to fetch analytics');
}

export async function getAnalyticsGaps(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/analytics/gaps`, { headers: getHeaders() });
  return parseJsonResponse<string[]>(response, 'Failed to fetch analytics gaps');
}

export async function suggest(prefix: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/search/suggest?q=${encodeURIComponent(prefix)}`, { headers: getHeaders() });
  if (!response.ok) return [];
  try {
    return await response.json();
  } catch {
    return [];
  }
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
  try {
    return await response.json();
  } catch {
    return [];
  }
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
  return parseJsonResponse<AuthResponse>(response, 'Signup failed');
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseJsonResponse<AuthResponse>(response, 'Login failed');
}

export async function getMe(): Promise<{ id: string; email: string; createdAt: number }> {
  const response = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
  return parseJsonResponse<{ id: string; email: string; createdAt: number }>(response, 'Not authenticated');
}

export function oauthLogin(provider: 'google' | 'github'): void {
  window.location.href = `${API_BASE}/auth/${provider}`;
}
