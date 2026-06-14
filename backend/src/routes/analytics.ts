import { Router } from 'express';
import * as storage from '../services/storage';

const router = Router();

/**
 * GET /analytics
 */
router.get('/', async (req, res) => {
  try {
    const topQueries = await storage.getAnalytics();
    return res.status(200).json(topQueries);
  } catch (error) {
    console.error('Analytics route error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /analytics/gaps
 */
router.get('/gaps', async (req, res) => {
  try {
    const gaps = await storage.getAnalyticsGaps();
    return res.status(200).json(gaps);
  } catch (error) {
    console.error('Analytics gaps route error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
