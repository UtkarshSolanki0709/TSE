import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import http from 'http';
import crawlRouter, { setupCrawlSocket } from './routes/crawl';
import searchRouter from './routes/search';
import analyticsRouter from './routes/analytics';
import scrapedRouter from './routes/scraped';
import rateLimitRouter from './routes/rateLimit';
import authRouter from './routes/auth';
import oauthRouter from './routes/oauth';
import { requireAuth } from './middleware/auth';
import { initDb } from './db/init';
import { indexCache } from './services/indexCache';
import { globalLimiter, crawlLimiter, searchLimiter } from './middleware/rateLimiter';
import { getMode } from './db/index';

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = [corsOrigin, 'chrome-extension://*'];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => {
      if (allowed.includes('*')) return origin.startsWith(allowed.replace('*', ''));
      return origin === allowed;
    })) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST'],
};

const io = new Server(server, { cors: corsOptions });

const PORT = process.env.PORT || 3000;
const mode = getMode();
const bindHost = mode === 'cloud' ? '0.0.0.0' : '127.0.0.1';

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(globalLimiter);

setupCrawlSocket(io);

// Public routes (no auth)
app.use('/api/auth', authRouter);
app.use('/api/auth', oauthRouter);

const handleHealthCheck = (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok', storageMode: mode === 'cloud' ? 'cloud' : 'local-first', host: bindHost });
};

app.get('/', handleHealthCheck);
app.get('/api/health', handleHealthCheck);
app.get('/api/healthz', handleHealthCheck);
app.get('/health', handleHealthCheck);
app.get('/healthz', handleHealthCheck);


app.get('/api/storage/info', (req, res) => {
  res.status(200).json({
    mode: mode === 'cloud' ? 'cloud' : 'local-first',
    localOnly: mode === 'local',
    dataDirectory: path.resolve(__dirname, '..', '..', '.data'),
    databaseFile: mode === 'local' ? path.resolve(__dirname, '..', '..', '.data', 'tse.db') : null,
    scrapedDirectory: path.resolve(__dirname, '..', '..', '.data', 'scraped'),
    privacyNotice: mode === 'cloud'
      ? 'Data stored securely on cloud. Only you can access your data.'
      : 'All scraped documents, inverted indexes, and logs are stored strictly on your local device.',
  });
});

// Protected routes (auth required in cloud mode)
app.use('/api/crawl', requireAuth, crawlLimiter, crawlRouter);
app.use('/api/search', requireAuth, searchLimiter, searchRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);
app.use('/api/scraped', requireAuth, scrapedRouter);
app.use('/api/rate-limit', requireAuth, rateLimitRouter);

// Serve frontend React static assets if built
const frontendDistPath = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health') && !req.path.startsWith('/socket.io')) {
      return res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
    next();
  });
}

initDb().then(async () => {
  await indexCache.init();
  server.listen(Number(PORT), bindHost, () => {
    console.log(`TSE ${mode === 'cloud' ? 'Cloud' : 'Local'} Engine running on http://${bindHost}:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
