import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { Document } from '@tse/shared';

export class Crawler {
  private userAgent = 'TSE-Crawler/1.0';

  /**
   * Fetches the content of a URL and scrapes it for text and links.
   */
  async crawl(url: string): Promise<{ doc: Document | null; links: string[] }> {
    try {
      // Validate URL
      const urlObj = new URL(url);
      
      // 1. Fetch content
      const response = await axios.get(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 15000,
      });

      if (response.status !== 200) return { doc: null, links: [] };

      const html = response.data;
      const $ = cheerio.load(html);

      // 2. Extract Data
      const title = $('title').text().trim() || url;
      
      // Extract links for recursive crawling
      const links: string[] = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const absoluteUrl = new URL(href, url).href;
            // Only follow http/https and stay on same domain to avoid infinite internet crawl
            const absObj = new URL(absoluteUrl);
            if (absObj.protocol.startsWith('http') && absObj.hostname === urlObj.hostname) {
              links.push(absoluteUrl);
            }
          } catch (e) {}
        }
      });

      // Basic text extraction: remove scripts, styles, and get text
      $('script, style, nav, footer, header').remove();
      const content = $('body').text().replace(/\s+/g, ' ').trim();

      // 3. Construct Document
      return {
        doc: {
          id: crypto.randomUUID(),
          url,
          title,
          content,
          timestamp: Date.now(),
        },
        links: [...new Set(links)] // Unique links
      };
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
      return { doc: null, links: [] };
    }
  }

  /**
   * Basic ethics check - placeholder for actual robots.txt parsing
   */
  async canCrawl(url: string): Promise<boolean> {
    // In Phase 1, we assume everything is okay for demonstration
    // In Phase 2, we should include 'robots-parser' logic
    return true;
  }
}

export const crawler = new Crawler();
