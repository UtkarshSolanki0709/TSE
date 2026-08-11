import { Router } from 'express';
import * as storage from '../services/storage';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.userId!;
    const topQueries = await storage.getAnalytics(userId);
    return res.status(200).json(topQueries);
  } catch (error) {
    console.error('Analytics route error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/gaps', async (req, res) => {
  try {
    const userId = req.userId!;
    const gaps = await storage.getAnalyticsGaps(userId);
    return res.status(200).json(gaps);
  } catch (error) {
    console.error('Analytics gaps route error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
