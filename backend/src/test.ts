import { crawler } from './services/crawler';
import { getScrapedDirPath, sanitizePathSegment, saveScrapedTree } from './services/storage';
import * as cheerio from 'cheerio';
import assert from 'assert';

console.log('Running scraping pipeline and tree structure tests...\n');

// ─── Test 1: URL Sanitization and Directory Path Mapping ─────────────────────
console.log('Test 1: Path sanitization & directory mapping...');
try {
  const segment1 = sanitizePathSegment('news-item?id=10');
  assert.strictEqual(segment1, 'news-item_id=10');
  
  const path1 = getScrapedDirPath('https://example.com/blog/2026/06/hello');
  assert.ok(path1.includes('example.com'));
  assert.ok(path1.includes('blog'));
  assert.ok(path1.includes('2026'));
  assert.ok(path1.includes('06'));
  assert.ok(path1.includes('hello'));
  
  // Home URL mapping
  const pathHome = getScrapedDirPath('https://example.com');
  assert.ok(pathHome.endsWith('_root') || pathHome.endsWith('_root\\'));
  
  console.log('✓ Test 1 Passed.');
} catch (e) {
  console.error('✗ Test 1 Failed:', e);
  process.exit(1);
}

// ─── Test 2: Page Classification Heuristics ───────────────────────────────
console.log('Test 2: Page Classification Heuristics...');
try {
  const crawlerAny = crawler as any;

  // Product classification via JSON-LD
  const htmlProductJsonLd = `
    <html>
      <head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "Super Widget"
          }
        </script>
      </head>
      <body></body>
    </html>
  `;
  const class1 = crawlerAny.classifyPage(cheerio.load(htmlProductJsonLd), htmlProductJsonLd, 'https://store.com/widget');
  assert.strictEqual(class1, 'Product');

  // Article classification via markup
  const htmlArticle = `
    <html>
      <body>
        <article>
          <h1>Amazing Discovery</h1>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
        </article>
      </body>
    </html>
  `;
  const class2 = crawlerAny.classifyPage(cheerio.load(htmlArticle), htmlArticle, 'https://blog.com/post/discovery');
  assert.strictEqual(class2, 'Article');

  // Listing classification via repeating elements
  const htmlListing = `
    <html>
      <body>
        <div class="product-grid">
          <div class="product-card"><h3>Item 1</h3></div>
          <div class="product-card"><h3>Item 2</h3></div>
          <div class="product-card"><h3>Item 3</h3></div>
        </div>
      </body>
    </html>
  `;
  const class3 = crawlerAny.classifyPage(cheerio.load(htmlListing), htmlListing, 'https://store.com/search?q=widgets');
  assert.strictEqual(class3, 'Listing');

  console.log('✓ Test 2 Passed.');
} catch (e) {
  console.error('✗ Test 2 Failed:', e);
  process.exit(1);
}

// ─── Test 3: Structured Data Extraction ────────────────────────────────────
console.log('Test 3: Structured Data Extraction...');
try {
  const crawlerAny = crawler as any;

  // Extract Product Details
  const htmlProduct = `
    <html>
      <body>
        <h1 id="productTitle">Awesome Product</h1>
        <span class="a-price"><span class="a-offscreen">$149.99</span></span>
        <div id="acrCustomerReviewText">1,250 ratings</div>
        <span class="a-icon-alt">4.5 out of 5 stars</span>
        <div id="productDescription">This is an amazing product with lots of features.</div>
        <div id="feature-bullets">
          <ul>
            <li><span class="a-list-item">Feature 1</span></li>
            <li><span class="a-list-item">Feature 2</span></li>
          </ul>
        </div>
      </body>
    </html>
  `;
  const productData = crawlerAny.extractProductData(cheerio.load(htmlProduct), htmlProduct, 'https://amazon.com/dp/B000123');
  assert.strictEqual(productData.name, 'Awesome Product');
  assert.strictEqual(productData.price, 149.99);
  assert.strictEqual(productData.currency, 'USD');
  assert.strictEqual(productData.reviewCount, 1250);
  assert.strictEqual(productData.rating, 4.5);
  assert.strictEqual(productData.description, 'This is an amazing product with lots of features.');
  assert.deepStrictEqual(productData.features, ['Feature 1', 'Feature 2']);

  console.log('✓ Test 3 Passed.');
} catch (e) {
  console.error('✗ Test 3 Failed:', e);
  process.exit(1);
}

// ─── Test 4: E2E Scrape Pipeline & Directory Storage ────────────────────────
console.log('Test 4: E2E Scrape Pipeline & Directory Storage...');
import axios from 'axios';
import fs from 'fs';
import path from 'path';

(async () => {
  const originalGet = axios.get;
  try {
    const mockHtml = `
      <html>
        <head>
          <title>Test Blog Post</title>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              "headline": "Testing the Crawler Pipeline",
              "author": { "@type": "Person", "name": "Jane Doe" },
              "datePublished": "2026-06-22"
            }
          </script>
        </head>
        <body>
          <article>
            <h1>Testing the Crawler Pipeline</h1>
            <p>This is a complete integration test for the new scraping pipeline. It verifies that we successfully classify, extract structured data, and write the nested files into the directory tree.</p>
          </article>
        </body>
      </html>
    `;

    axios.get = async (url: string, config?: any): Promise<any> => {
      if (url.includes('robots.txt')) {
        return { status: 200, data: 'User-agent: *\nAllow: /' };
      }
      return { status: 200, data: mockHtml };
    };

    const testUrl = 'https://blog.example.com/2026/integration-test';
    
    // Clean up existing directory if any
    const targetDir = getScrapedDirPath(testUrl);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    // Trigger crawl
    const result = await crawler.crawl(testUrl);
    assert.ok(result.doc);
    assert.strictEqual(result.classification, 'Article');
    assert.strictEqual(result.structuredData.author, 'Jane Doe');
    assert.strictEqual(result.structuredData.title, 'Testing the Crawler Pipeline');

    // Trigger storage
    await saveScrapedTree({
      url: testUrl,
      title: result.doc.title,
      classification: result.classification,
      timestamp: result.doc.timestamp,
      statusCode: 200,
      rawHtml: result.rawHtml,
      content: result.doc.content,
      structuredData: result.structuredData,
    });

    // Verify files are written
    assert.ok(fs.existsSync(path.join(targetDir, 'raw.html')));
    assert.ok(fs.existsSync(path.join(targetDir, 'content.txt')));
    assert.ok(fs.existsSync(path.join(targetDir, 'metadata.json')));
    assert.ok(fs.existsSync(path.join(targetDir, 'data.json')));

    // Verify metadata contents
    const metaContent = JSON.parse(fs.readFileSync(path.join(targetDir, 'metadata.json'), 'utf-8'));
    assert.strictEqual(metaContent.url, testUrl);
    assert.strictEqual(metaContent.classification, 'Article');

    // Verify data contents
    const dataContent = JSON.parse(fs.readFileSync(path.join(targetDir, 'data.json'), 'utf-8'));
    assert.strictEqual(dataContent.author, 'Jane Doe');

    console.log('✓ Test 4 Passed.');
    console.log('\nAll Scraper Pipeline Unit and E2E Tests Passed successfully!');
  } catch (e) {
    console.error('✗ Test 4 Failed:', e);
    process.exit(1);
  } finally {
    axios.get = originalGet;
  }
})();
