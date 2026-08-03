import axios from 'axios';
import * as cheerio from 'cheerio';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
chromium.use(stealth());
import crypto from 'crypto';
import type { Document, PageClassification } from '@tse/shared';

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

  async crawl(url: string, forceBrowser = false): Promise<{ doc: Document | null; links: string[]; classification: PageClassification; structuredData: any; rawHtml: string }> {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const state = this.getOrCreateState(domain);

      if (!(await this.canCrawl(url, domain, state))) {
        return { doc: null, links: [], classification: 'General', structuredData: null, rawHtml: '' };
      }

      await this.enforcePoliteness(state);

      if (forceBrowser) {
        return await this.crawlWithBrowser(url, state);
      }

      return await this.crawlWithAxios(url, urlObj);
    } catch (error: any) {
      // If Axios fails due to Cloudflare or bot protection, fallback to the browser
      if (!forceBrowser && error.isAxiosError && (error.response?.status === 403 || error.response?.status === 503)) {
        try {
          const urlObj = new URL(url);
          const state = this.getOrCreateState(urlObj.hostname);
          return await this.crawlWithBrowser(url, state);
        } catch (browserError) {
          return { doc: null, links: [], classification: 'General', structuredData: null, rawHtml: '' };
        }
      }
      return { doc: null, links: [], classification: 'General', structuredData: null, rawHtml: '' };
    }
  }

  private async crawlWithAxios(url: string, urlObj: URL): Promise<{ doc: Document | null; links: string[]; classification: PageClassification; structuredData: any; rawHtml: string }> {
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

    if (response.status !== 200) return { doc: null, links: [], classification: 'General', structuredData: null, rawHtml: '' };

    const html = response.data;
    const $ = cheerio.load(html);
    const links = this.extractLinks($, url, urlObj);

    // Classification
    const classification = this.classifyPage($, html, url);

    // Structured Extraction based on classification
    let structuredData: any = null;
    let content = '';
    let title = $('title').text().trim() || url;

    const article = this.extractWithReadability(html, url);
    const readabilityContent = article ? article.textContent.replace(/\s+/g, ' ').trim() : '';

    if (classification === 'Product') {
      structuredData = this.extractProductData($, html, url);
      title = structuredData.name || title;
      content = `${structuredData.name}. ${structuredData.description}. ${structuredData.features.join('. ')}`;
    } else if (classification === 'Article') {
      structuredData = this.extractArticleData($, html, url, readabilityContent);
      title = structuredData.title || title;
      content = structuredData.body || readabilityContent || this.extractWithCheerio($);
    } else if (classification === 'Listing') {
      structuredData = this.extractListingData($, html, url);
      content = this.extractWithCheerio($);
    } else {
      // General fallback
      content = readabilityContent && readabilityContent.length >= 200 ? readabilityContent : this.extractWithCheerio($);
    }

    return {
      doc: {
        id: crypto.randomUUID(),
        url,
        title,
        content: content.replace(/\s+/g, ' ').trim(),
        timestamp: Date.now(),
        classification,
      },
      links,
      classification,
      structuredData,
      rawHtml: html,
    };
  }

  private async crawlWithBrowser(url: string, state: DomainCrawlState): Promise<{ doc: Document | null; links: string[]; classification: PageClassification; structuredData: any; rawHtml: string }> {
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

      // Classification
      const classification = this.classifyPage($, html, url);

      // Structured Extraction based on classification
      let structuredData: any = null;
      let content = '';
      let title = $('title').text().trim() || url;

      const article = this.extractWithReadability(html, url);
      const readabilityContent = article ? article.textContent.replace(/\s+/g, ' ').trim() : '';

      if (classification === 'Product') {
        structuredData = this.extractProductData($, html, url);
        title = structuredData.name || title;
        content = `${structuredData.name}. ${structuredData.description}. ${structuredData.features.join('. ')}`;
      } else if (classification === 'Article') {
        structuredData = this.extractArticleData($, html, url, readabilityContent);
        title = structuredData.title || title;
        content = structuredData.body || readabilityContent || this.extractWithCheerio($);
      } else if (classification === 'Listing') {
        structuredData = this.extractListingData($, html, url);
        content = this.extractWithCheerio($);
      } else {
        // General fallback
        content = readabilityContent && readabilityContent.length >= 200 ? readabilityContent : this.extractWithCheerio($);
      }

      return {
        doc: {
          id: crypto.randomUUID(),
          url,
          title,
          content: content.replace(/\s+/g, ' ').trim(),
          timestamp: Date.now(),
          classification,
        },
        links,
        classification,
        structuredData,
        rawHtml: html,
      };
    } finally {
      await context.close();
    }
  }

  private classifyPage($: cheerio.CheerioAPI, html: string, url: string): PageClassification {
    const urlLower = url.toLowerCase();
    
    // 1. JSON-LD Check
    try {
      const jsonLdScripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < jsonLdScripts.length; i++) {
        const content = $(jsonLdScripts[i]).html();
        if (content) {
          const parsed = JSON.parse(content);
          const checkType = (obj: any): PageClassification | null => {
            if (!obj) return null;
            if (Array.isArray(obj)) {
              for (const item of obj) {
                const res = checkType(item);
                if (res) return res;
              }
            } else if (typeof obj === 'object') {
              const type = obj['@type'];
              if (typeof type === 'string') {
                if (type.toLowerCase() === 'product') return 'Product';
                if (['article', 'newsarticle', 'blogposting', 'techarticle'].includes(type.toLowerCase())) return 'Article';
                if (['itemlist', 'offer目录', 'collectionpage'].includes(type.toLowerCase())) return 'Listing';
              }
              // Check nested @graph
              if (obj['@graph']) {
                return checkType(obj['@graph']);
              }
            }
            return null;
          };
          const detected = checkType(parsed);
          if (detected) return detected;
        }
      }
    } catch (e) {
      // Ignore JSON parse errors
    }

    // 2. Microdata Check
    try {
      const itemTypes = $('[itemtype]');
      for (let i = 0; i < itemTypes.length; i++) {
        const itemType = $(itemTypes[i]).attr('itemtype') || '';
        if (itemType.includes('schema.org/Product')) return 'Product';
        if (itemType.includes('schema.org/Article') || itemType.includes('schema.org/BlogPosting') || itemType.includes('schema.org/NewsArticle')) return 'Article';
        if (itemType.includes('schema.org/ItemList')) return 'Listing';
      }
    } catch (e) {}

    // 3. Amazon patterns and e-commerce URL patterns
    if (
      urlLower.includes('/dp/') || 
      urlLower.includes('/gp/product/') || 
      urlLower.includes('/product/') || 
      urlLower.includes('/products/')
    ) {
      // Check if it's a search / listing page or a product detail page
      if (!urlLower.includes('search') && !urlLower.includes('category') && !urlLower.includes('collections')) {
        return 'Product';
      }
    }

    // 4. Listing Page indicators
    // Amazon search or category page indicators
    if (urlLower.includes('/s?') || urlLower.includes('search') || urlLower.includes('/category/') || urlLower.includes('/categories/') || urlLower.includes('/collections/')) {
      return 'Listing';
    }

    // Heuristic: Grid list with many items
    const productGrid = $('.s-result-item, .product-grid, .product-list, .grid-item, .post-item, .article-item, .listing-item');
    if (productGrid.length >= 3) {
      return 'Listing';
    }

    // 5. Article indicators
    if (
      urlLower.includes('/blog/') || 
      urlLower.includes('/news/') || 
      urlLower.includes('/article/') || 
      urlLower.includes('/post/')
    ) {
      return 'Article';
    }

    // Heuristics for Article tags
    if ($('article').length > 0 && $('article').text().trim().length > 500) {
      return 'Article';
    }

    // Default Fallback
    return 'General';
  }

  private extractProductData($: cheerio.CheerioAPI, html: string, url: string): any {
    const product: any = {
      name: '',
      price: '',
      currency: '',
      rating: null,
      reviewCount: 0,
      description: '',
      features: [] as string[],
      imageUrl: '',
    };

    // 1. JSON-LD Extraction
    try {
      const jsonLdScripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < jsonLdScripts.length; i++) {
        const content = $(jsonLdScripts[i]).html();
        if (content) {
          const parsed = JSON.parse(content);
          const extractFromObj = (obj: any): boolean => {
            if (!obj) return false;
            if (Array.isArray(obj)) {
              for (const item of obj) {
                if (extractFromObj(item)) return true;
              }
            } else if (typeof obj === 'object') {
              if (obj['@type'] && obj['@type'].toLowerCase() === 'product') {
                product.name = obj.name || product.name;
                product.description = obj.description || product.description;
                if (obj.image) {
                  product.imageUrl = Array.isArray(obj.image) ? obj.image[0] : (typeof obj.image === 'object' ? obj.image.url : obj.image);
                }
                if (obj.offers) {
                  const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
                  product.price = offers.price || product.price;
                  product.currency = offers.priceCurrency || product.currency;
                }
                if (obj.aggregateRating) {
                  product.rating = obj.aggregateRating.ratingValue || product.rating;
                  product.reviewCount = obj.aggregateRating.reviewCount || obj.aggregateRating.ratingCount || product.reviewCount;
                }
                return true;
              }
              if (obj['@graph']) {
                return extractFromObj(obj['@graph']);
              }
            }
            return false;
          };
          extractFromObj(parsed);
        }
      }
    } catch (e) {}

    // 2. Selectors Fallback (especially for Amazon)
    const isAmazon = url.toLowerCase().includes('amazon.');

    // Product Name
    if (!product.name) {
      if (isAmazon) {
        product.name = $('#productTitle').text().trim();
      }
      if (!product.name) {
        product.name = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';
      }
    }

    // Product Image
    if (!product.imageUrl) {
      if (isAmazon) {
        const landingImage = $('#landingImage').attr('data-a-dynamic-image');
        if (landingImage) {
          try {
            const parsedImages = JSON.parse(landingImage);
            product.imageUrl = Object.keys(parsedImages)[0] || '';
          } catch (e) {}
        }
        if (!product.imageUrl) {
          product.imageUrl = $('#landingImage').attr('src') || $('#imgBlkFront').attr('src') || '';
        }
      }
      if (!product.imageUrl) {
        product.imageUrl = $('meta[property="og:image"]').attr('content') || $('img[itemprop="image"]').attr('src') || '';
      }
    }

    // Price and Currency
    if (!product.price) {
      if (isAmazon) {
        const priceOffscreen = $('.a-price .a-offscreen').first().text().trim();
        if (priceOffscreen) {
          product.price = priceOffscreen;
        } else {
          product.price = $('#priceblock_ourprice').text().trim() || $('#priceblock_dealprice').text().trim() || $('.a-price-whole').first().text().trim() || '';
        }
      }
      if (!product.price) {
        product.price = $('[itemprop="price"]').attr('content') || $('[itemprop="price"]').text().trim() || $('.price').first().text().trim() || '';
      }
    }

    // Parse Currency out of price
    if (product.price && typeof product.price === 'string') {
      const priceStr = String(product.price);
      if (priceStr.includes('$')) product.currency = 'USD';
      else if (priceStr.includes('£')) product.currency = 'GBP';
      else if (priceStr.includes('€')) product.currency = 'EUR';
      else if (priceStr.includes('₹') || priceStr.includes('Rs')) product.currency = 'INR';
      else product.currency = 'USD';
      
      const numMatch = priceStr.replace(/[^\d.]/g, '');
      if (numMatch) {
        product.price = parseFloat(numMatch);
      }
    }

    // Rating
    if (!product.rating) {
      if (isAmazon) {
        const ratingText = $('#acrPopover').attr('title') || $('.a-icon-alt').first().text().trim();
        const ratingMatch = ratingText.match(/([0-9.]+)\s*out\s*of\s*5/i) || ratingText.match(/([0-9.]+)\s*von\s*5/i);
        if (ratingMatch) product.rating = parseFloat(ratingMatch[1]);
      }
      if (!product.rating) {
        const ratingVal = $('[itemprop="ratingValue"]').attr('content') || $('[itemprop="ratingValue"]').text().trim();
        if (ratingVal) product.rating = parseFloat(ratingVal);
      }
    }

    // Review Count
    if (!product.reviewCount) {
      if (isAmazon) {
        const reviewText = $('#acrCustomerReviewText').first().text().trim();
        const reviewMatch = reviewText.replace(/[^\d]/g, '');
        if (reviewMatch) product.reviewCount = parseInt(reviewMatch, 10);
      }
      if (!product.reviewCount) {
        const reviewVal = $('[itemprop="reviewCount"]').attr('content') || $('[itemprop="reviewCount"]').text().trim() || $('[itemprop="ratingCount"]').attr('content');
        if (reviewVal) product.reviewCount = parseInt(String(reviewVal).replace(/[^\d]/g, ''), 10) || 0;
      }
    }

    // Features
    if (isAmazon) {
      $('#feature-bullets ul li span.a-list-item').each((_, el) => {
        const text = $(el).text().trim();
        if (text) product.features.push(text);
      });
    }
    if (product.features.length === 0) {
      $('ul.specs-list li, ul.specifications li, .product-features li').each((_, el) => {
        const text = $(el).text().trim();
        if (text) product.features.push(text);
      });
    }

    // Description
    if (!product.description) {
      if (isAmazon) {
        product.description = $('#productDescription').text().trim();
      }
      if (!product.description) {
        product.description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
      }
    }

    return product;
  }

  private extractArticleData($: cheerio.CheerioAPI, html: string, url: string, articleText: string): any {
    const article: any = {
      title: '',
      author: '',
      datePublished: '',
      headings: [] as { tag: string; text: string }[],
      body: articleText,
    };

    // 1. JSON-LD Extraction
    try {
      const jsonLdScripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < jsonLdScripts.length; i++) {
        const content = $(jsonLdScripts[i]).html();
        if (content) {
          const parsed = JSON.parse(content);
          const extractFromObj = (obj: any): boolean => {
            if (!obj) return false;
            if (Array.isArray(obj)) {
              for (const item of obj) {
                if (extractFromObj(item)) return true;
              }
            } else if (typeof obj === 'object') {
              const type = obj['@type'];
              if (type && ['article', 'newsarticle', 'blogposting', 'techarticle'].includes(type.toLowerCase())) {
                article.title = obj.headline || obj.name || article.title;
                article.datePublished = obj.datePublished || obj.dateCreated || article.datePublished;
                if (obj.author) {
                  article.author = Array.isArray(obj.author) 
                    ? obj.author.map((a: any) => a.name || a).join(', ') 
                    : (obj.author.name || obj.author);
                }
                return true;
              }
              if (obj['@graph']) {
                return extractFromObj(obj['@graph']);
              }
            }
            return false;
          };
          extractFromObj(parsed);
        }
      }
    } catch (e) {}

    // Title fallback
    if (!article.title) {
      article.title = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || $('title').text().trim() || '';
    }

    // Author fallback
    if (!article.author) {
      article.author = $('[itemprop="author"]').text().trim() || $('.author').first().text().trim() || $('meta[name="author"]').attr('content') || '';
    }

    // Date fallback
    if (!article.datePublished) {
      article.datePublished = $('[itemprop="datePublished"]').attr('datetime') || $('[itemprop="datePublished"]').text().trim() || $('time').first().attr('datetime') || $('meta[property="article:published_time"]').attr('content') || '';
    }

    // Headings Hierarchy
    $('h1, h2, h3, h4').each((_, el) => {
      const tag = el.name.toLowerCase();
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text && text.length < 200) {
        article.headings.push({ tag, text });
      }
    });

    return article;
  }

  private extractListingData($: cheerio.CheerioAPI, html: string, url: string): any {
    const listing = {
      items: [] as { title: string; url: string; price?: string; imageUrl?: string }[],
    };

    const isAmazon = url.toLowerCase().includes('amazon.');
    if (isAmazon) {
      $('[data-component-type="s-search-result"]').each((_, el) => {
        const itemEl = $(el);
        const titleEl = itemEl.find('h2 a span');
        const title = titleEl.text().trim();
        const relativeUrl = itemEl.find('h2 a').attr('href') || '';
        const itemUrl = relativeUrl ? new URL(relativeUrl, url).href : '';
        const price = itemEl.find('.a-price .a-offscreen').first().text().trim();
        const imageUrl = itemEl.find('img.s-image').attr('src') || '';

        if (title && itemUrl) {
          listing.items.push({ title, url: itemUrl, price, imageUrl });
        }
      });
    }

    if (listing.items.length === 0) {
      const selectors = [
        '.product-card', '.product-item', '.grid-item', '.post-item', 
        '.article-card', '.card', '.item', 'li.product', 'article'
      ];
      
      for (const sel of selectors) {
        const cards = $(sel);
        if (cards.length >= 3) {
          cards.each((_, el) => {
            const card = $(el);
            const titleEl = card.find('h2, h3, .title, a[class*="title"], a[class*="name"]').first();
            const title = titleEl.text().trim();
            let itemUrl = card.find('a').attr('href') || '';
            if (itemUrl) {
              try {
                itemUrl = new URL(itemUrl, url).href;
              } catch (e) {}
            }
            const price = card.find('.price, [class*="price"]').first().text().trim() || undefined;
            const imageUrl = card.find('img').first().attr('src') || undefined;

            if (title && itemUrl && listing.items.length < 50) {
              listing.items.push({ title, url: itemUrl, price, imageUrl });
            }
          });
          break;
        }
      }
    }

    if (listing.items.length === 0) {
      $('a').each((_, el) => {
        const anchor = $(el);
        const title = anchor.text().trim();
        let itemUrl = anchor.attr('href') || '';
        if (title && title.length > 10 && itemUrl && !itemUrl.startsWith('#') && !itemUrl.startsWith('javascript:')) {
          try {
            itemUrl = new URL(itemUrl, url).href;
            if (itemUrl.startsWith('http') && listing.items.length < 30) {
              listing.items.push({ title, url: itemUrl });
            }
          } catch (e) {}
        }
      });
    }

    return listing;
  }

  private extractWithReadability(html: string, url: string): { title: string | null; textContent: string } | null {
    try {
      const virtualConsole = new VirtualConsole();
      virtualConsole.on("error", () => {});
      const dom = new JSDOM(html, { url, virtualConsole });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      if (article && article.textContent) {
        return { title: article.title || null, textContent: article.textContent };
      }
    } catch (e) {
      // Readability failed
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
    const now = Date.now();
    const nextAllowedTime = state.lastRequestTime + this.politenessDelayMs;
    
    if (now < nextAllowedTime) {
      const delay = nextAllowedTime - now;
      state.lastRequestTime = nextAllowedTime; 
      await new Promise(r => setTimeout(r, delay));
    } else {
      state.lastRequestTime = now;
    }
  }
}

export const crawler = new Crawler();
