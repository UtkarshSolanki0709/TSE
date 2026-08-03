import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import express from 'express';

import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import http from 'http';
import crawlRouter, { setupCrawlSocket } from './routes/crawl';
import searchRouter from './routes/search';
import analyticsRouter from './routes/analytics';
import scrapedRouter from './routes/scraped';

import { initDb } from './services/storage';
import { indexCache } from './services/indexCache';

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Socket.io for real-time crawl updates
setupCrawlSocket(io);

const crawlLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use('/crawl', crawlLimiter, crawlRouter);
app.use('/search', searchRouter);
app.use('/analytics', analyticsRouter);
app.use('/api/scraped', scrapedRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

initDb().then(async () => {
  await indexCache.init();
  server.listen(PORT);
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
