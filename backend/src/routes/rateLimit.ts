import { Router } from 'express';
import { getTierConfigs, getHitInfo } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/rate-limit/status
 * Returns the rate-limit configuration for each tier and
 * the caller's current usage within each window.
 */
router.get('/status', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const configs = getTierConfigs();

  const status = Object.entries(configs).map(([tier, cfg]) => {
    const hit = getHitInfo(tier, ip);
    const remaining = hit ? Math.max(0, cfg.max - hit.hits) : cfg.max;
    const resetsAt = hit ? hit.windowStart + cfg.windowMs : null;

    return {
      tier: cfg.label,
      windowMs: cfg.windowMs,
      max: cfg.max,
      used: hit?.hits ?? 0,
      remaining,
      resetsAt,
    };
  });

  return res.status(200).json({ ip, tiers: status });
});

export default router;
