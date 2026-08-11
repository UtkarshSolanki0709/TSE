import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

// ─── Configuration ──────────────────────────────────────────────────────────

interface TierConfig {
  windowMs: number;
  max: number;
  label: string;
}

const tiers: Record<string, TierConfig> = {
  global: {
    windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || '') || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '') || 100,
    label: 'Global',
  },
  crawl: {
    windowMs: parseInt(process.env.RATE_LIMIT_CRAWL_WINDOW_MS || '') || 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_CRAWL_MAX || '') || 10,
    label: 'Crawl',
  },
  search: {
    windowMs: parseInt(process.env.RATE_LIMIT_SEARCH_WINDOW_MS || '') || 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || '') || 60,
    label: 'Search',
  },
};

// ─── Hit Tracker ────────────────────────────────────────────────────────────
// In-memory per-IP tracker so the status controller can report usage
// without relying on express-rate-limit internals.

interface HitRecord {
  hits: number;
  windowStart: number;
}

const hitStore = new Map<string, Map<string, HitRecord>>();

function trackHit(tier: string, ip: string, windowMs: number): void {
  if (!hitStore.has(tier)) hitStore.set(tier, new Map());
  const tierMap = hitStore.get(tier)!;
  const now = Date.now();
  const existing = tierMap.get(ip);

  if (existing && now - existing.windowStart < windowMs) {
    existing.hits++;
  } else {
    tierMap.set(ip, { hits: 1, windowStart: now });
  }
}

export function getHitInfo(tier: string, ip: string): HitRecord | null {
  const tierMap = hitStore.get(tier);
  if (!tierMap) return null;
  const record = tierMap.get(ip);
  if (!record) return null;

  const cfg = tiers[tier];
  if (!cfg) return null;

  // Expired window — treat as fresh
  if (Date.now() - record.windowStart >= cfg.windowMs) return null;
  return record;
}

// ─── Shared Options ─────────────────────────────────────────────────────────

function buildLimiter(tier: string) {
  const cfg = tiers[tier];
  return rateLimit({
    windowMs: cfg.windowMs,
    max: cfg.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests',
      tier: cfg.label,
      retryAfterMs: cfg.windowMs,
    },
    handler: (_req: Request, res: Response, _next: NextFunction, options: any) => {
      res.status(options.statusCode).json(options.message);
    },
    // Plug into our own tracker
    requestWasSuccessful: (req: Request) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      trackHit(tier, ip, cfg.windowMs);
      return true; // always count the request
    },
  });
}

// ─── Exported Limiters ──────────────────────────────────────────────────────

export const globalLimiter = buildLimiter('global');
export const crawlLimiter = buildLimiter('crawl');
export const searchLimiter = buildLimiter('search');

// ─── Tier config accessor (used by the status controller) ───────────────────

export function getTierConfigs() {
  return { ...tiers };
}
