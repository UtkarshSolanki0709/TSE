import dotenv from 'dotenv';
dotenv.config();

import express from 'express';

import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import http from 'http';
import crawlRouter, { setupCrawlSocket } from './routes/crawl';
import searchRouter from './routes/search';
import analyticsRouter from './routes/analytics';

import { initDb } from './services/storage';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false // For dev
}));
app.use(cors());
app.use(express.json());

// Socket.io for real-time crawl updates
setupCrawlSocket(io);

// Routes
app.use('/crawl', crawlRouter);
app.use('/search', searchRouter);
app.use('/analytics', analyticsRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
