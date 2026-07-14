@echo off
setlocal EnableExtensions

cd /d "%~dp0web"
if errorlevel 1 (
  echo [ERROR] Cannot enter web directory.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERROR] package.json not found in web folder.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found. Install Node.js from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo Starting T-calculator Web...
echo If browser does not open, visit http://localhost:8081
echo Press Ctrl+C to stop.
echo.

call npm run web

pause
