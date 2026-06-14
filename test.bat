@echo off
REM TSE Backend Testing Script (Windows)
REM This script helps verify the search engine is working correctly

setlocal enabledelayedexpansion

echo 🧪 Tiny Search Engine - Testing Suite
echo ======================================
echo.

set BACKEND_PORT=3000
set API_BASE=http://localhost:%BACKEND_PORT%

echo Prerequisites:
echo   • Backend running: npm run start
echo   • Port: %BACKEND_PORT%
echo.

REM Test 1: Check Server
echo [1/5] Checking if server is running...
for /f "delims=" %%A in ('powershell -Command "try { $response = Invoke-WebRequest -Uri '%API_BASE%/health' -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue; if ($response.StatusCode -eq 200) { Write-Host 'ok' } } catch { Write-Host 'error' }"') do set SERVER_STATUS=%%A

if "%SERVER_STATUS%"=="ok" (
    echo ✓ Server is running
) else (
    echo ❌ Server not running on port %BACKEND_PORT%
    echo    Start the server with: npm run start
    goto end_error
)

REM Test 2: Check Database
echo.
echo [2/5] Checking database...
if exist ".data\tse.db" (
    echo ✓ Database file exists
) else (
    echo ⚠ Database file not found (might be created on first crawl)
)

REM Test 3: Test Crawl
echo.
echo [3/5] Testing crawl endpoint...
for /f "delims=" %%A in ('powershell -Command "try { $response = Invoke-WebRequest -Uri '%API_BASE%/crawl' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{\"url\":\"https://en.wikipedia.org/wiki/Web_search\"}' -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue; Write-Host $response.Content } catch { Write-Host 'ERROR' }"') do set CRAWL_RESPONSE=%%A

if "%CRAWL_RESPONSE%"=="ERROR" (
    echo ❌ Crawl endpoint failed or timed out
) else (
    echo ✓ Crawl endpoint working
    echo    Response: %CRAWL_RESPONSE:~0,100%...
)

REM Test 4: Test Search
echo.
echo [4/5] Testing search endpoint...
for /f "delims=" %%A in ('powershell -Command "try { $response = Invoke-WebRequest -Uri '%API_BASE%/search?q=web+search' -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue; if ($response.StatusCode -eq 200) { Write-Host 'ok' } else { Write-Host 'error' } } catch { Write-Host 'error' }"') do set SEARCH_STATUS=%%A

if "%SEARCH_STATUS%"=="ok" (
    echo ✓ Search endpoint working
    echo    Try: %API_BASE%/search?q=your+query
) else (
    echo ❌ Search endpoint failed
)

REM Test 5: Test Analytics
echo.
echo [5/5] Testing analytics endpoint...
for /f "delims=" %%A in ('powershell -Command "try { $response = Invoke-WebRequest -Uri '%API_BASE%/analytics' -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue; if ($response.StatusCode -eq 200) { Write-Host 'ok' } else { Write-Host 'error' } } catch { Write-Host 'error' }"') do set ANALYTICS_STATUS=%%A

if "%ANALYTICS_STATUS%"=="ok" (
    echo ✓ Analytics endpoint working
) else (
    echo ❌ Analytics endpoint failed
)

echo.
echo ======================================
echo ✓ Test suite complete
echo.
echo Next steps:
echo   1. Try crawling a URL in the UI
echo   2. Search for terms that should exist
echo   3. Check console for any error messages
echo.
goto end_success

:end_error
exit /b 1

:end_success
exit /b 0
