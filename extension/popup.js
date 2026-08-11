document.addEventListener('DOMContentLoaded', async () => {
  const urlBox = document.getElementById('current-url');
  const scrapeBtn = document.getElementById('scrape-btn');
  const statusDiv = document.getElementById('status');
  const pageTitleSpan = document.getElementById('page-title');
  const contentLengthSpan = document.getElementById('content-length');
  const apiUrlInput = document.getElementById('api-url');

  // Load saved API URL
  const stored = await chrome.storage.local.get(['apiUrl']);
  if (stored.apiUrl) apiUrlInput.value = stored.apiUrl;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    urlBox.textContent = 'No active tab found';
    scrapeBtn.disabled = true;
    return;
  }

  urlBox.textContent = tab.url;
  pageTitleSpan.textContent = tab.title || '';

  scrapeBtn.addEventListener('click', async () => {
    const apiUrl = apiUrlInput.value.trim().replace(/\/$/, '');
    await chrome.storage.local.set({ apiUrl: apiUrlInput.value.trim() });

    scrapeBtn.disabled = true;
    statusDiv.className = 'status loading';
    statusDiv.textContent = 'Extracting content...';

    try {
      // Inject content script to extract readable text
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageContent,
      });

      const { title, content, url, wordCount } = results[0].result;

      if (!content || wordCount < 10) {
        statusDiv.className = 'status error';
        statusDiv.textContent = 'Page has too little readable content (login wall? JS-only page?)';
        scrapeBtn.disabled = false;
        return;
      }

      contentLengthSpan.textContent = `${wordCount} words`;

      statusDiv.textContent = 'Sending to TSE backend...';

      const response = await fetch(`${apiUrl}/api/crawl/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, content }),
      });

      const data = await response.json();

      if (response.ok) {
        statusDiv.className = 'status success';
        statusDiv.textContent = 'Indexed locally to your device!';
      } else {
        statusDiv.className = 'status error';
        statusDiv.textContent = `Failed: ${data.error || 'Unknown error'}`;
      }
    } catch (error) {
      statusDiv.className = 'status error';
      statusDiv.textContent = `Error: ${error.message}`;
    }

    scrapeBtn.disabled = false;
  });
});

// This function runs in the page context
function extractPageContent() {
  // Remove scripts, styles, navs, footers, ads
  const clone = document.body.cloneNode(true);
  const removeSelectors = [
    'script', 'style', 'noscript', 'nav', 'footer', 'header',
    'aside', '.sidebar', '.menu', '.ad', '.advertisement',
    '.popup', '.modal', '.cookie', '.consent'
  ];
  removeSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  // Try to find main content area
  const mainContent = clone.querySelector('article, [role="main"], main, .post-content, .entry-content, .article-body');
  const textSource = mainContent || clone;

  const text = textSource.innerText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  return {
    title: document.title || '',
    content: text,
    url: window.location.href,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
  };
}
