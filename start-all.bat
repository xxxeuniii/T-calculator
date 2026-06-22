@echo off
setlocal EnableExtensions

cd /d "%~dp0"
set "ROOT=%CD%"

if "%BACKEND_HOST%"=="" set "BACKEND_HOST=0.0.0.0"
if "%BACKEND_PORT%"=="" set "BACKEND_PORT=8000"
if "%FRONTEND_PORT%"=="" set "FRONTEND_PORT=8081"

echo ============================================================
echo T Calculator - start frontend and backend
echo Root: %ROOT%
echo Backend: http://%BACKEND_HOST%:%BACKEND_PORT%
echo Frontend: Expo web dev server, port %FRONTEND_PORT%
echo.
echo Tip for server deployment:
echo - Production deployment uses docker-compose.yml.
echo - Set WEB_PORT if port 80 is occupied, for example: set WEB_PORT=8080
echo - GitHub Actions deploys with: docker compose up -d --build
echo ============================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] python not found. Please install Python 3.11+ first.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist "%ROOT%\service\backend\.venv\Scripts\python.exe" (
  echo [backend] Creating virtual environment...
  python -m venv "%ROOT%\service\backend\.venv"
  if errorlevel 1 (
    echo [ERROR] Failed to create backend virtual environment.
    pause
    exit /b 1
  )
)

echo [backend] Installing dependencies...
call "%ROOT%\service\backend\.venv\Scripts\python.exe" -m pip install -r "%ROOT%\service\backend\requirements.txt"
if errorlevel 1 (
  echo [ERROR] Backend dependency install failed.
  pause
  exit /b 1
)

if not exist "%ROOT%\web\node_modules" (
  echo [frontend] Installing dependencies...
  pushd "%ROOT%\web"
  call npm install
  if errorlevel 1 (
    popd
    echo [ERROR] Frontend dependency install failed.
    pause
    exit /b 1
  )
  popd
)

echo [backend] Starting FastAPI...
start "T Calculator Backend" cmd /k "cd /d ""%ROOT%\service\backend"" && call "".venv\Scripts\activate.bat"" && python -m uvicorn app.main:app --host %BACKEND_HOST% --port %BACKEND_PORT%"

echo [frontend] Starting Expo Web...
start "T Calculator Frontend" cmd /k "cd /d ""%ROOT%\web"" && set EXPO_NO_TELEMETRY=1 && npx expo start --web --port %FRONTEND_PORT% --host lan"

echo.
echo Started.
echo Backend docs: http://127.0.0.1:%BACKEND_PORT%/docs
echo Frontend: check the Expo window for the exact URL.
echo.
pause
