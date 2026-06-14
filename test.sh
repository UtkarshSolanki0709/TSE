#!/bin/bash

# TSE Backend Testing Script
# This script helps verify the search engine is working correctly

set -e

echo "🧪 Tiny Search Engine - Testing Suite"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3000
API_BASE="http://localhost:${BACKEND_PORT}"
CURL_TIMEOUT=10

# Helper functions
check_server() {
  echo -e "${YELLOW}[1/5]${NC} Checking if server is running..."
  
  if ! curl -s -m $CURL_TIMEOUT "${API_BASE}/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Server not running on port ${BACKEND_PORT}${NC}"
    echo "   Start the server with: npm run start"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Server is running${NC}"
}

check_database() {
  echo -e "\n${YELLOW}[2/5]${NC} Checking database..."
  
  if [ ! -f ".data/tse.db" ]; then
    echo -e "${RED}❌ Database file not found at .data/tse.db${NC}"
    echo "   This might be normal on first run. Verify database was created."
    return 1
  fi
  
  echo -e "${GREEN}✓ Database file exists${NC}"
  
  # Check tables exist
  if command -v sqlite3 &> /dev/null; then
    TABLES=$(sqlite3 .data/tse.db ".tables" 2>/dev/null | wc -w)
    if [ "$TABLES" -lt 3 ]; then
      echo -e "${RED}❌ Not all tables created (found $TABLES, expected 3)${NC}"
      return 1
    fi
    echo -e "${GREEN}✓ All 3 tables created${NC}"
    
    # Check document count
    DOC_COUNT=$(sqlite3 .data/tse.db "SELECT COUNT(*) FROM documents;" 2>/dev/null)
    echo "   Documents in DB: $DOC_COUNT"
  fi
  return 0
}

test_crawl() {
  echo -e "\n${YELLOW}[3/5]${NC} Testing crawl endpoint..."
  
  CRAWL_URL="https://en.wikipedia.org/wiki/Web_search"
  
  RESPONSE=$(curl -s -X POST "${API_BASE}/crawl" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${CRAWL_URL}\"}")
  
  if echo "$RESPONSE" | grep -q "Successfully indexed\|already in database"; then
    echo -e "${GREEN}✓ Crawl endpoint working${NC}"
    echo "   Response: $(echo $RESPONSE | jq -r '.message' 2>/dev/null || echo $RESPONSE)"
    return 0
  else
    echo -e "${RED}❌ Crawl endpoint failed${NC}"
    echo "   Response: $RESPONSE"
    return 1
  fi
}

test_search() {
  echo -e "\n${YELLOW}[4/5]${NC} Testing search endpoint..."
  
  QUERY="web search"
  
  RESPONSE=$(curl -s "${API_BASE}/search?q=${QUERY}")
  
  if echo "$RESPONSE" | grep -q "results\|total"; then
    TOTAL=$(echo "$RESPONSE" | jq -r '.total' 2>/dev/null || echo "0")
    echo -e "${GREEN}✓ Search endpoint working${NC}"
    echo "   Query: '$QUERY'"
    echo "   Results found: $TOTAL"
    
    if [ "$TOTAL" -gt 0 ]; then
      echo -e "${GREEN}✓ Search returned results${NC}"
      return 0
    else
      echo -e "${YELLOW}⚠ No results found${NC}"
      return 1
    fi
  else
    echo -e "${RED}❌ Search endpoint failed${NC}"
    echo "   Response: $RESPONSE"
    return 1
  fi
}

test_analytics() {
  echo -e "\n${YELLOW}[5/5]${NC} Testing analytics endpoint..."
  
  RESPONSE=$(curl -s "${API_BASE}/analytics")
  
  if echo "$RESPONSE" | grep -q "\[\|{"; then
    echo -e "${GREEN}✓ Analytics endpoint working${NC}"
    echo "   Response: $(echo $RESPONSE | jq '.[0:2]' 2>/dev/null || echo "$RESPONSE")"
    return 0
  else
    echo -e "${RED}❌ Analytics endpoint failed${NC}"
    echo "   Response: $RESPONSE"
    return 1
  fi
}

# Main execution
echo "Prerequisites:"
echo "  • Backend running: npm run start"
echo "  • Port: ${BACKEND_PORT}"
echo ""

# Run checks
FAILED=0

check_server || FAILED=$((FAILED + 1))
check_database || FAILED=$((FAILED + 1))
test_crawl || FAILED=$((FAILED + 1))
test_search || FAILED=$((FAILED + 1))
test_analytics || FAILED=$((FAILED + 1))

# Summary
echo ""
echo "======================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  echo "Your TSE is working correctly. 🎉"
else
  echo -e "${RED}❌ $FAILED test(s) failed${NC}"
  echo ""
  echo "Debugging steps:"
  echo "  1. Check backend console for errors"
  echo "  2. Read DEBUG_REPORT.md for detailed info"
  echo "  3. Verify database with: sqlite3 .data/tse.db '.tables'"
  echo "  4. Try crawling a simpler URL (like https://example.com)"
fi

exit $FAILED
