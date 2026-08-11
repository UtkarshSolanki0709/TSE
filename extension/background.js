// Background service worker for TSE Scraper extension
// Handles API communication and stores crawl stats

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    apiUrl: 'http://localhost:3000',
    totalIndexed: 0,
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INDEX_PAGE') {
    indexPage(message.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // async response
  }
});

async function indexPage({ url, title, content, apiUrl }) {
  const response = await fetch(`${apiUrl}/api/crawl/direct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title, content }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  // Update stats
  const stored = await chrome.storage.local.get(['totalIndexed']);
  await chrome.storage.local.set({ totalIndexed: (stored.totalIndexed || 0) + 1 });

  return data;
}
