import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb, getMode } from '../db/index';
import { users } from '../db/schema';

const router = Router();

const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function issueToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev-secret-change-me', { expiresIn: '7d' });
}

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const db = getDb();

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();

  await db.insert(users).values({ id, email, passwordHash, createdAt: Date.now() });

  const token = issueToken(id);
  res.status(201).json({ token, user: { id, email, createdAt: Date.now() } });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const { email, password } = parsed.data;
  const db = getDb();

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = rows[0];
  if (!user.passwordHash) {
    return res.status(401).json({ error: 'Use OAuth login for this account' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = issueToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
});

router.get('/me', async (req, res) => {
  const mode = getMode();
  if (mode === 'local') {
    return res.json({ id: 'local', email: 'local@tse', createdAt: 0 });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || 'dev-secret-change-me') as { userId: string };
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    res.json({ id: u.id, email: u.email, createdAt: u.createdAt });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
