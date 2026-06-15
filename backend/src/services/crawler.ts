import axios from 'axios';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { chromium } from 'playwright';
import crypto from 'crypto';
import type { Document } from '@tse/shared';

class DomainCrawlState {
  lastRequestTime = 0;
  robotsCache: { allowed: boolean; expiresAt: number } | null = null;
}

let browserInstance: any = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

export class Crawler {
  private userAgent = 'TSE-Crawler/1.0';
  private domainStates = new Map<string, DomainCrawlState>();
  private politenessDelayMs = 500;

  async crawl(url: string, forceBrowser = false): Promise<{ doc: Document | null; links: string[] }> {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const state = this.getOrCreateState(domain);

      if (!(await this.canCrawl(url, domain, state))) {
        return { doc: null, links: [] };
      }

      await this.enforcePoliteness(state);

      if (forceBrowser) {
        return this.crawlWithBrowser(url, state);
      }

      return this.crawlWithAxios(url, urlObj);
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
      return { doc: null, links: [] };
    }
  }

  private async crawlWithAxios(url: string, urlObj: URL): Promise<{ doc: Document | null; links: string[] }> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
      },
      timeout: 10000,
      maxRedirects: 3,
    });

    if (response.status !== 200) return { doc: null, links: [] };

    const html = response.data;
    const $ = cheerio.load(html);
    const links = this.extractLinks($, url, urlObj);

    const article = this.extractWithReadability(html, url);
    if (article && article.textContent.length >= 200) {
      return {
        doc: {
          id: crypto.randomUUID(),
          url,
          title: article.title || $('title').text().trim() || url,
          content: article.textContent.replace(/\s+/g, ' ').trim(),
          timestamp: Date.now(),
        },
        links,
      };
    }

    const content = this.extractWithCheerio($);
    return {
      doc: {
        id: crypto.randomUUID(),
        url,
        title: $('title').text().trim() || url,
        content,
        timestamp: Date.now(),
      },
      links,
    };
  }

  private async crawlWithBrowser(url: string, state: DomainCrawlState): Promise<{ doc: Document | null; links: string[] }> {
    const browser = await getBrowser();
    const context = await browser.newContext({ userAgent: this.userAgent });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);

      const html = await page.content();
      const urlObj = new URL(url);
      const $ = cheerio.load(html);
      const links = this.extractLinks($, url, urlObj);

      const article = this.extractWithReadability(html, url);
      if (article && article.textContent && article.textContent.length >= 50) {
        return {
          doc: {
            id: crypto.randomUUID(),
            url,
            title: article.title || url,
            content: article.textContent.replace(/\s+/g, ' ').trim(),
            timestamp: Date.now(),
          },
          links,
        };
      }

      const content = this.extractWithCheerio($);
      return {
        doc: {
          id: crypto.randomUUID(),
          url,
          title: $('title').text().trim() || url,
          content,
          timestamp: Date.now(),
        },
        links,
      };
    } finally {
      await context.close();
    }
  }

  private extractWithReadability(html: string, url: string): { title: string | null; textContent: string } | null {
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      if (article && article.textContent) {
        return { title: article.title || null, textContent: article.textContent };
      }
    } catch (e) {
      // Readability failed, fall through to cheerio
    }
    return null;
  }

  private extractWithCheerio($: cheerio.CheerioAPI): string {
    const selectors = ['article', '[role="main"]', '#mw-content-text', '#content', '.post-content', '.entry-content', 'main'];
    for (const sel of selectors) {
      const el = $(sel);
      if (el.length && el.text().trim().length > 200) {
        return el.text().replace(/\s+/g, ' ').trim();
      }
    }
    $('script, style, noscript, nav, footer, header, aside, .sidebar, .menu, .ad, .advertisement').remove();
    return $('body').text().replace(/\s+/g, ' ').trim();
  }

  private extractLinks($: cheerio.CheerioAPI, url: string, urlObj: URL): string[] {
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, url).href;
          const absObj = new URL(absoluteUrl);
          if (absObj.protocol.startsWith('http') && absObj.hostname === urlObj.hostname) {
            links.push(absoluteUrl);
          }
        } catch (e) {}
      }
    });
    return [...new Set(links)];
  }

  private getOrCreateState(domain: string): DomainCrawlState {
    if (!this.domainStates.has(domain)) {
      this.domainStates.set(domain, new DomainCrawlState());
    }
    return this.domainStates.get(domain)!;
  }

  private async canCrawl(url: string, domain: string, state: DomainCrawlState): Promise<boolean> {
    const now = Date.now();
    if (state.robotsCache && state.robotsCache.expiresAt > now) {
      return state.robotsCache.allowed;
    }

    try {
      const robotsUrl = `https://${domain}/robots.txt`;
      const res = await axios.get(robotsUrl, {
        timeout: 3000,
        headers: { 'User-Agent': this.userAgent }
      });

      if (res.status === 200) {
        const robotsParser = (await import('robots-parser')).default;
        const robots = robotsParser(robotsUrl, res.data);
        const isAllowed = robots.isAllowed(url, this.userAgent) !== false;
        state.robotsCache = { allowed: isAllowed, expiresAt: now + 3600000 };
        return isAllowed;
      }
    } catch (e) {}

    state.robotsCache = { allowed: true, expiresAt: now + 3600000 };
    return true;
  }

  private async enforcePoliteness(state: DomainCrawlState): Promise<void> {
    const elapsed = Date.now() - state.lastRequestTime;
    if (elapsed < this.politenessDelayMs) {
      await new Promise(r => setTimeout(r, this.politenessDelayMs - elapsed));
    }
    state.lastRequestTime = Date.now();
  }
}

export const crawler = new Crawler();
