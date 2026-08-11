import { Router, type Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/index';
import { users } from '../db/schema';

const router = Router();

function issueToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev-secret-change-me', { expiresIn: '7d' });
}

// ponytail: Express 5 res.redirect returns void, helper for cleaner code
function doRedirect(res: Response, url: string): void {
  res.redirect(url);
}

async function findOrCreateUser(email: string, provider: string, oauthId: string): Promise<{ id: string; email: string; createdAt: number }> {
  const db = getDb();

  let rows = await db.select().from(users).where(and(eq(users.oauthProvider, provider), eq(users.oauthId, oauthId))).limit(1);
  if (rows.length > 0) {
    return { id: rows[0].id, email: rows[0].email, createdAt: rows[0].createdAt };
  }

  rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (rows.length > 0) {
    await db.update(users).set({ oauthProvider: provider, oauthId }).where(eq(users.id, rows[0].id));
    return { id: rows[0].id, email: rows[0].email, createdAt: rows[0].createdAt };
  }

  const id = crypto.randomUUID();
  await db.insert(users).values({ id, email, oauthProvider: provider, oauthId, createdAt: Date.now() });
  return { id, email, createdAt: Date.now() };
}

function getBaseUrl(): string {
  return process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || 'http://localhost:3000';
}

function getFrontendUrl(): string {
  return process.env.RENDER_EXTERNAL_URL || process.env.CORS_ORIGIN || process.env.BASE_URL || 'http://localhost:5173';
}

// ─── Google OAuth ────────────────────────────────────────────────────────────

router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'Google OAuth not configured' });

  const redirectUri = getBaseUrl() + '/api/auth/google/callback';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  doRedirect(res, 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
});

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: getBaseUrl() + '/api/auth/google/callback',
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) throw new Error('Token exchange failed');
    const tokenData = await tokenRes.json() as { access_token: string };

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token },
    });

    if (!userRes.ok) throw new Error('User info fetch failed');
    const userData = await userRes.json() as { id: string; email: string };

    const user = await findOrCreateUser(userData.email, 'google', userData.id);
    const token = issueToken(user.id);

    doRedirect(res, getFrontendUrl() + '/auth/callback?token=' + token);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.status(500).json({ error: 'OAuth failed' });
  }
});

// ─── GitHub OAuth ────────────────────────────────────────────────────────────

router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'GitHub OAuth not configured' });

  const redirectUri = getBaseUrl() + '/api/auth/github/callback';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
  });
  doRedirect(res, 'https://github.com/login/oauth/authorize?' + params.toString());
});

router.get('/github/callback', async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GITHUB_CLIENT_ID || '',
        client_secret: process.env.GITHUB_CLIENT_SECRET || '',
        redirect_uri: getBaseUrl() + '/api/auth/github/callback',
      }),
    });

    if (!tokenRes.ok) throw new Error('Token exchange failed');
    const tokenData = await tokenRes.json() as { access_token: string };

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token, Accept: 'application/json' },
    });

    if (!userRes.ok) throw new Error('User info fetch failed');
    const userData = await userRes.json() as { id: number; login: string; email?: string };

    let email = userData.email;
    if (!email) {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: 'Bearer ' + tokenData.access_token, Accept: 'application/json' },
      });
      if (emailRes.ok) {
        const emails = await emailRes.json() as { email: string; primary: boolean }[];
        email = emails.find(e => e.primary)?.email || emails[0]?.email;
      }
    }

    if (!email) email = userData.login + '@users.noreply.github.com';

    const user = await findOrCreateUser(email, 'github', String(userData.id));
    const token = issueToken(user.id);

    doRedirect(res, getFrontendUrl() + '/auth/callback?token=' + token);
  } catch (err) {
    console.error('GitHub OAuth error:', err);
    res.status(500).json({ error: 'OAuth failed' });
  }
});

export default router;
