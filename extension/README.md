# TSE Browser Extension

Chrome extension that scrapes opened webpages into TSE search index. Bypasses robots.txt, CDN blocks, and login walls (for pages the user can already see).

## Install

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension/` folder
5. Icon appears in toolbar

## Usage

1. Navigate to any page (Pinterest, Cloudflare-protected sites, etc.)
2. Click TSE extension icon
3. Click "Index This Page"
4. Content extracted → sent to backend → indexed

## Config

Default backend URL: `http://localhost:3000`

Change in popup if backend runs elsewhere.

## Architecture

```
popup.js → chrome.scripting.executeScript → content extraction in page context
         → fetch POST /api/crawl/direct → backend indexes
```

Content extraction:
- Strips scripts, styles, navs, footers, ads, modals
- Targets `article`, `[role="main"]`, `main`, `.post-content` first
- Falls back to full body text
- Reports word count before sending

## Permissions

- `activeTab`: read current tab URL/title
- `scripting`: execute content extraction in page
- `storage`: persist API URL config
- `host_permissions`: send to backend + read all sites

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Failed: Invalid request" | Backend `/api/crawl/direct` not running. Start backend first. |
| "CORS blocked" | Update backend CORS config (already handled in server.ts) |
| "Too little readable content" | Page is JS-only shell or login wall. Not indexable. |
| Extension icon grayed out | Page is `chrome://` or `chrome-extension://` — can't inject there. |
