# TSE Quick Reference & Troubleshooting

## 🚀 Quick Start

### 1. Build Backend
```bash
cd TSE/backend
npm install  # If not already done
npm run build
```

### 2. Start Backend
```bash
npm run start
# Output: "Server running on port 3000"
```

### 3. In Another Terminal, Start Frontend
```bash
cd TSE/frontend
npm install  # If not already done
npm run dev
# Output: "Local: http://localhost:5173"
```

### 4. Open Browser
```
http://localhost:5173
```

### 5. Test It
- **Crawl Mode**: Enter a URL (e.g., https://en.wikipedia.org/wiki/JavaScript)
- **Search Mode**: After crawling, search for terms from that page

---

## 🔧 Troubleshooting

### ❌ "No Results Found" When Searching

**Check List:**
1. ✓ Did you crawl a URL first?
2. ✓ Is the backend running?
3. ✓ Are there any errors in the backend console?

**Solution:**
```bash
# 1. Clear database and restart
rm -rf TSE/.data/
cd TSE/backend
npm run start

# 2. Crawl a simple URL
# POST http://localhost:3000/crawl
# { "url": "https://example.com" }

# 3. Search for a common word
# GET http://localhost:3000/search?q=example
```

---

### ❌ "Crawl Failed" or Network Error

**Possible Causes:**
- URL is unreachable
- Website blocks automated requests
- Network timeout
- Invalid URL format

**Solution:**
```bash
# Make sure URL starts with http:// or https://
# Try example.com (not valid)
# Try https://example.com (valid)

# Try a simpler, more accessible URL:
# https://example.com
# https://en.wikipedia.org/wiki/Artificial_intelligence
```

---

### ⚠️ Port Already in Use

**Error**: `listen EADDRINUSE :::3000`

**Solution:**
```bash
# Option 1: Kill process on port 3000
# Windows: 
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Option 2: Use different port
PORT=3001 npm run start
# Then update frontend: API_BASE = 'http://localhost:3001'
```

---

### ⚠️ Database Errors

**Error**: `SQLITE_CANTOPEN` or similar

**Solution:**
```bash
# 1. Check if .data directory exists
ls -la TSE/.data/

# 2. Delete corrupt database
rm -rf TSE/.data/

# 3. Restart backend (will create fresh database)
cd TSE/backend
npm run start
```

---

### 🐛 Debugging Database

**Check what's in the database:**
```bash
# List all tables
sqlite3 TSE/.data/tse.db ".tables"

# Count documents
sqlite3 TSE/.data/tse.db "SELECT COUNT(*) FROM documents;"

# View a document
sqlite3 TSE/.data/tse.db "SELECT id, url, title FROM documents LIMIT 1;"

# Check indexed terms
sqlite3 TSE/.data/tse.db "SELECT DISTINCT term FROM inverted_index LIMIT 10;"

# View search logs
sqlite3 TSE/.data/tse.db "SELECT query, resultCount FROM search_logs;"
```

---

### 🐛 Debugging Backend

**Enable detailed logging:**

Edit `backend/src/routes/search.ts` and add:
```typescript
console.log('Query terms:', queryTerms);
console.log('Found docs:', Object.keys(scores));
console.log('Scores:', scores);
```

Edit `backend/src/services/indexer.ts` and add:
```typescript
console.log(`Indexed ${tokens.length} tokens for ${doc.url}`);
console.log('Sample tokens:', tokens.slice(0, 10));
```

Then rebuild and test:
```bash
cd TSE/backend
npm run build
npm run start
```

---

## 📊 Database Schema

### Documents Table
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  url TEXT UNIQUE,
  title TEXT,
  content TEXT,
  timestamp INTEGER
);
```

### Inverted Index Table
```sql
CREATE TABLE inverted_index (
  term TEXT,
  docId TEXT,
  weight REAL,
  PRIMARY KEY (term, docId)
);
```

### Search Logs Table
```sql
CREATE TABLE search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT,
  resultCount INTEGER,
  responseMs INTEGER,
  timestamp INTEGER
);
```

---

## 🔄 How Results are Calculated

### During Crawl:
1. **Fetch** HTML content from URL
2. **Parse** with cheerio, extract text and title
3. **Tokenize** text into words
4. **Stem** words (e.g., "running" → "run")
5. **Calculate TF-IDF**:
   - TF (Term Frequency) = word_count / total_words
   - IDF (Inverse Document Frequency) = log10(total_docs / docs_with_term)
   - TF-IDF = TF × IDF
6. **Store** in inverted_index table

### During Search:
1. **Split** query into terms
2. **Stem** each term (same way as crawl)
3. **Lookup** each term in inverted_index
4. **Accumulate** scores from all matching documents
5. **Sort** by score (highest first)
6. **Return** top 50 results with snippets

---

## 🎯 Common Test Queries

After crawling from Wikipedia articles:

```bash
# URL: https://en.wikipedia.org/wiki/Artificial_intelligence
curl "http://localhost:3000/search?q=machine+learning"
curl "http://localhost:3000/search?q=neural"
curl "http://localhost:3000/search?q=algorithm"

# URL: https://en.wikipedia.org/wiki/JavaScript
curl "http://localhost:3000/search?q=browser"
curl "http://localhost:3000/search?q=dynamic"
curl "http://localhost:3000/search?q=ecmascript"
```

---

## 📈 Performance Tips

1. **Reindex documents** if adding many at once:
   ```typescript
   // In backend console after crawling
   import { indexer } from './services/indexer';
   await indexer.reindexAll();
   ```

2. **Monitor response times** in analytics dashboard

3. **Check which queries have no results**:
   ```bash
   curl http://localhost:3000/analytics/gaps
   ```

---

## 🔐 Safety Notes

- ✓ Respects robots.txt (placeholder for Phase 2)
- ✓ Uses User-Agent header
- ✓ Has 10-second timeout per request
- ✓ Skips very large pages
- ⚠️ Don't crawl sites you don't own without permission

---

## 📝 Project Files

```
TSE/
├── backend/
│   ├── src/
│   │   ├── server.ts          ← Main entry point
│   │   ├── routes/
│   │   │   ├── search.ts      ← Search logic
│   │   │   ├── crawl.ts       ← Crawl logic
│   │   │   └── analytics.ts   ← Analytics
│   │   └── services/
│   │       ├── storage.ts     ← Database (FIXED ✓)
│   │       ├── crawler.ts     ← HTML fetching & parsing
│   │       └── indexer.ts     ← Tokenizing & TF-IDF
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── lib/api.ts         ← API client
│   │   ├── components/
│   │   └── pages/
│   └── package.json
│
├── shared/
│   └── src/types/index.ts     ← TypeScript types
│
├── .data/                      ← Database (created at runtime)
│   └── tse.db
│
├── DEBUG_REPORT.md            ← Detailed bug report (NEW)
├── QUICKREF.md                ← This file
├── test.sh                    ← Testing script (bash)
└── test.bat                   ← Testing script (Windows)
```

---

## ❓ FAQ

**Q: Why are search results empty even after crawling?**
A: Check that the backend database was properly initialized. Check `.data/tse.db` exists and has data using sqlite3.

**Q: Can I search multiple words?**
A: Yes! Searching "machine learning" will find documents with both terms and score higher results that have both.

**Q: Why is the crawl slow?**
A: Large pages take time to download and parse. Check console for timeout messages.

**Q: Can I crawl multiple URLs?**
A: Yes, the database stores multiple documents and search across all of them.

**Q: Where are search logs stored?**
A: In the `search_logs` table in the database. View them at `/analytics` endpoint.

---

## 🎓 What Was Fixed

| Issue | Status | File |
|-------|--------|------|
| Database promise resolution | ✅ FIXED | storage.ts |
| Missing getOne() wrapper | ✅ FIXED | storage.ts |
| Single-row query inefficiency | ✅ FIXED | storage.ts |
| Empty array handling | ✅ FIXED | storage.ts |

**The system should now work!** 🎉

---

**Need help?** Check:
1. Backend console for error messages
2. Database with sqlite3 CLI
3. Browser DevTools (Network tab)
4. DEBUG_REPORT.md for detailed info
