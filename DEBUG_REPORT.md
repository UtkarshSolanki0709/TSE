# Tiny Search Engine - Debug Report & Fixes

## 🔴 Issues Found

### 1. **Database Promise Resolution Bug** ⭐ CRITICAL
**File**: `backend/src/services/storage.ts`

**Problem**: 
- The `run()` function used an arrow function callback `(err)` instead of a regular function with `this` context
- This caused sqlite3 promise callbacks to not resolve properly, preventing tables from being created
- Result: Database initialization could fail silently

**Fix Applied**:
```typescript
// BEFORE (Wrong)
const run = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {  // ❌ Arrow function loses 'this' context
      if (err) reject(err);
      else resolve();
    });
  });
};

// AFTER (Correct)
const run = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {  // ✓ Regular function maintains context
      if (err) reject(err);
      else resolve();
    });
  });
};
```

---

### 2. **Missing `getOne()` Wrapper Function**
**File**: `backend/src/services/storage.ts`

**Problem**: 
- Functions like `getDocById()`, `getDocCount()`, and `getTermDocCount()` were using `query()` (which uses `db.all()`) to fetch single rows
- This is inefficient and potentially problematic
- `db.all()` returns all matching rows, not ideal for single-row queries

**Fix Applied**:
- Added `getOne()` wrapper function using `db.get()`
- Updated all single-row queries to use `getOne()` instead of `query()`
- Updated functions:
  - `getDocById()`
  - `getDocByUrl()`
  - `getDocCount()`
  - `getTermDocCount()`

```typescript
// NEW FUNCTION
const getOne = (sql: string, params: any[] = []): Promise<any | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};
```

---

### 3. **Empty Result Handling**
**File**: `backend/src/services/storage.ts`

**Problem**:
- `query()` could return `undefined` instead of empty array

**Fix Applied**:
```typescript
else resolve(rows || []);  // Ensure empty array if no rows
```

---

## 🔧 How the System Should Work

### Flow: Crawl Mode
```
1. Frontend: User enters URL → POST /crawl
2. Backend Route (crawl.ts):
   - Check if URL already indexed
   - Call crawler.crawl(url)
3. Crawler Service:
   - Fetch HTML with axios
   - Parse with cheerio
   - Extract title & content
   - Return Document object
4. Indexer Service:
   - Tokenize & stem content (natural.js)
   - Calculate TF-IDF weights
   - Save term weights to inverted_index table
   - Save document to documents table ✓ Call storage.upsertDoc()
5. Storage:
   - Insert document record
   - Insert inverted_index records (term → docId → weight)
```

### Flow: Search Mode
```
1. Frontend: User types search query → GET /search?q=...
2. Search Route (search.ts):
   - Split query into terms (lowercase, split on whitespace)
   - For each term:
     a. Call storage.getTermWeights(term)
     b. Accumulate scores from returned weights
   - For each docId found:
     a. Call storage.getDocById(docId)
     b. Format as SearchResult
   - Sort by score (descending)
   - Return up to 50 results
3. Storage Operations:
   - getTermWeights(term): Query inverted_index table
   - getDocById(docId): Query documents table
```

---

## ✅ Testing Checklist

### 1. **Start Backend with Clean Database**
```bash
cd TSE/backend
npm run build
npm run start
# Wait for: "Server running on port 3000"
```

You should see `.data/tse.db` created in the project root.

### 2. **Test Crawl Mode**
```bash
# Using curl or Postman
POST http://localhost:3000/crawl
Content-Type: application/json

{
  "url": "https://en.wikipedia.org/wiki/Artificial_intelligence"
}
```

Expected Response:
```json
{
  "message": "Successfully indexed",
  "result": {
    "url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
    "status": "done",
    "docsCrawled": 1
  }
}
```

Check console for any errors.

### 3. **Test Search Mode**
```bash
# After crawling above URL, search for a term that should be in it
GET http://localhost:3000/search?q=artificial+intelligence
```

Expected Response:
```json
{
  "results": [
    {
      "id": "...",
      "url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
      "title": "Artificial Intelligence - Wikipedia",
      "snippet": "Artificial intelligence (AI) is...",
      "score": 2.5
    }
  ],
  "total": 1,
  "page": 1,
  "timeMs": 45,
  "suggestion": null
}
```

### 4. **Debug Commands**

Check if database was created:
```bash
ls -la .data/
sqlite3 .data/tse.db ".tables"
```

Count documents:
```bash
sqlite3 .data/tse.db "SELECT COUNT(*) FROM documents;"
```

Check inverted index:
```bash
sqlite3 .data/tse.db "SELECT DISTINCT term FROM inverted_index LIMIT 10;"
```

View search logs:
```bash
sqlite3 .data/tse.db "SELECT * FROM search_logs;"
```

---

## 🎯 Frontend Integration

The frontend (`frontend/lib/api.ts`) is correctly structured:
- ✓ Search endpoint: `GET /search?q={query}&mode={mode}&page={page}`
- ✓ Crawl endpoint: `POST /crawl` with `{ url }`
- ✓ Analytics endpoint: `GET /analytics`

---

## 📋 Summary of Changes

| File | Issue | Fix |
|------|-------|-----|
| `backend/src/services/storage.ts` | Promise resolution in `run()` | Changed arrow function to regular function |
| `backend/src/services/storage.ts` | Missing single-row query wrapper | Added `getOne()` function |
| `backend/src/services/storage.ts` | Inefficient single-row queries | Updated to use `getOne()` |
| `backend/src/services/storage.ts` | Potential undefined array returns | Added `|| []` fallback |

---

## 🚀 Next Steps

1. **Rebuild Backend**
   ```bash
   cd TSE/backend && npm run build
   ```

2. **Start Fresh** (Delete old database if issues persist)
   ```bash
   rm -rf .data/
   npm run start
   ```

3. **Test Crawl + Search** with the checklist above

4. **Monitor Console Output** for any errors

If issues persist, check:
- Are terms being indexed? (Check inverted_index table)
- Are documents being saved? (Check documents table)
- Are queries being executed correctly? (Enable SQL logging if needed)

---

## 🔍 Additional Improvements (Optional)

1. **Add logging** to indexer:
   ```typescript
   console.log(`Indexed ${tokens.length} terms for doc ${doc.id}`);
   ```

2. **Add error handling** to crawl route for network failures

3. **Add request timeout** to prevent hanging on large pages

4. **Implement concurrent crawling** with p-limit (already in dependencies!)

5. **Add database transaction support** for batch indexing
