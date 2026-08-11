import * as cheerio from 'cheerio';
import type { ScrapedArtifacts } from './storage';

// Convert scraped HTML to readable markdown. No new dep: cheerio already ships in backend.
export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, nav, footer, header, aside, iframe, form, .sidebar, .menu, .ad, .advertisement, [hidden]').remove();

  const blockTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'pre', 'blockquote', 'div', 'section', 'article', 'main', 'table', 'tr', 'img', 'hr', 'br']);

  const inlineText = (el: any): string => {
    if (!el.name) return $(el).text();
    const tag = el.name.toLowerCase();
    if (tag === 'a') {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      return href && text ? `[${text}](${href})` : text;
    }
    if (tag === 'img') {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt') || '';
      return src ? `![${alt}](${src})` : '';
    }
    if (tag === 'code') {
      return `\`${$(el).text().trim()}\``;
    }
    if (tag === 'br') return '\n';
    if (tag === 'strong' || tag === 'b') return `**${$(el).text().trim()}**`;
    if (tag === 'em' || tag === 'i') return `*${$(el).text().trim()}*`;
    return $(el).contents().map((_, child) => inlineText(child)).get().join('');
  };

  const render = (el: any, listDepth: string[] = []): string[] => {
    const tag = (el.name || '').toLowerCase();
    const out: string[] = [];

    if (tag === 'h1') return [`# ${inlineText(el)}`, ''];
    if (tag === 'h2') return [`## ${inlineText(el)}`, ''];
    if (tag === 'h3') return [`### ${inlineText(el)}`, ''];
    if (tag === 'h4') return [`#### ${inlineText(el)}`, ''];
    if (tag === 'h5') return [`##### ${inlineText(el)}`, ''];
    if (tag === 'h6') return [`###### ${inlineText(el)}`, ''];

    if (tag === 'p') {
      const text = inlineText(el).replace(/\n+/g, ' ').trim();
      return text ? [text, ''] : [];
    }

    if (tag === 'blockquote') {
      const lines = $(el).contents().map((_, child) => render(child)).get().flat().filter(l => l.trim());
      return lines.map(l => `> ${l}`).concat(['']);
    }

    if (tag === 'pre') {
      const code = $(el).text().replace(/\s+$/, '');
      return ['```', code, '```', ''];
    }

    if (tag === 'ul') {
      const items = $(el).children('li').map((_, li) => `- ${$(li).contents().map((_, c) => render(c, [...listDepth])).get().flat().filter(l => l.trim()).join(' ')}`).get();
      return items.length ? items.concat(['']) : [];
    }

    if (tag === 'ol') {
      const items = $(el).children('li').map((idx, li) => `${idx + 1}. ${$(li).contents().map((_, c) => render(c, [...listDepth])).get().flat().filter(l => l.trim()).join(' ')}`).get() as string[];
      return items.length ? items.concat(['']) : [];
    }

    if (tag === 'table') {
      const rows = $(el).find('tr').map((_, tr) => $(tr).find('th, td').map((_, cell) => inlineText(cell).replace(/\s+/g, ' ').trim()).get().join(' | ')).get();
      return rows.length ? [rows.join('\n'), ''] : [];
    }

    if (tag === 'hr') return ['---', ''];

    if (tag === 'img') {
      const text = inlineText(el);
      return text ? [text, ''] : [];
    }

    if (tag === 'br') return [];

    if (tag === 'li') return [];

    const children = $(el).contents().map((_, child) => render(child)).get().flat();
    return out.concat(children);
  };

  const lines = $('body').contents().map((_, el) => render(el)).get().flat();

  const cleaned = lines
    .map(l => l.trimEnd())
    .reduce((acc: string[], l) => {
      if (l === '' && (acc.length === 0 || acc[acc.length - 1] === '')) return acc;
      acc.push(l);
      return acc;
    }, []);

  return cleaned.join('\n').trim();
}

function fmtDate(ts: number): string {
  return new Date(ts).toISOString();
}

// Render a full offline page.md from scraped artifacts.
export function renderScrapedMarkdown(page: ScrapedArtifacts): string {
  const parts: string[] = [];

  parts.push(`# ${page.title || 'Untitled'}`, '');

  const meta: string[] = [];
  if (page.url) meta.push(`- **Source:** ${page.url}`);
  meta.push(`- **Type:** ${page.classification || 'General'}`);
  meta.push(`- **Crawled:** ${fmtDate(page.timestamp)}`);
  parts.push(...meta, '', '---', '');

  const sd = page.structuredData || {};

  if (page.classification === 'Product') {
    parts.push('## Product Details', '');
    if (sd.price) parts.push(`- **Price:** ${sd.currency || ''} ${sd.price}`.trim());
    if (sd.rating) parts.push(`- **Rating:** ${sd.rating}${sd.reviewCount ? ` (${sd.reviewCount} reviews)` : ''}`);
    if (sd.description) parts.push('', '## Description', '', sd.description);
    if (Array.isArray(sd.features) && sd.features.length) {
      parts.push('', '## Features', '', ...sd.features.map((f: string) => `- ${f}`));
    }
    parts.push('');
  } else if (page.classification === 'Listing') {
    parts.push('## Items', '');
    if (Array.isArray(sd.items) && sd.items.length) {
      parts.push(...sd.items.map((item: any) => {
        const name = item.title ? (item.url ? `[${item.title}](${item.url})` : item.title) : item.url;
        return `- ${name}${item.price ? ` — ${item.price}` : ''}`;
      }));
      parts.push('');
    }
  } else if (page.classification === 'Article') {
    if (sd.author) parts.push('## Byline', '', sd.author, '');
    if (sd.datePublished) parts.push('', `Published: ${sd.datePublished}`, '');
  }

  parts.push('---', '', '## Page Content', '');

  const body = page.rawHtml ? htmlToMarkdown(page.rawHtml) : page.content;
  parts.push(body || '_No readable content extracted._', '');

  return parts.join('\n');
}
