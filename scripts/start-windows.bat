@echo off
setlocal enabledelayedexpansion

set PROJECT_ROOT=%~dp0..
set CLIENT_DIR=%PROJECT_ROOT%\client
set SERVER_DIR=%PROJECT_ROOT%\server

set CLIENT_PORT=9300
set SERVER_PORT=9200
set WS_PORT=9210

title CSSC Node-View Startup

echo.
echo ==========================================
echo   CSSC Node-View Windows Startup
echo ==========================================
echo.

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pnpm not found
    echo Please install: npm install -g pnpm
    pause
    exit /b 1
)
echo [OK] pnpm found
echo.

call :kill_port %CLIENT_PORT%
call :kill_port %SERVER_PORT%
call :kill_port %WS_PORT%

if not exist "%CLIENT_DIR%\node_modules" (
    echo [INFO] Installing client dependencies...
    cd /d "%CLIENT_DIR%"
    call pnpm install
    if !errorlevel! neq 0 (
        echo [ERROR] Client install failed
        pause
        exit /b 1
    )
    echo [OK] Client dependencies installed
) else (
    echo [OK] Client dependencies ready
)

if not exist "%SERVER_DIR%\node_modules" (
    echo [INFO] Installing server dependencies...
    cd /d "%SERVER_DIR%"
    call pnpm install
    if !errorlevel! neq 0 (
        echo [ERROR] Server install failed
        pause
        exit /b 1
    )
    echo [OK] Server dependencies installed
) else (
    echo [OK] Server dependencies ready
)

echo.
echo ==========================================
echo [INFO] Starting services...
echo ==========================================
echo.

echo [INFO] Starting server...
start "CSSC-Server" cmd /k "cd /d "%SERVER_DIR%" && pnpm start"
echo [OK] Server started

timeout /t 2 /nobreak >nul

echo [INFO] Starting client...
start "CSSC-Client" cmd /k "cd /d "%CLIENT_DIR%" && pnpm dev"
echo [OK] Client started

echo.
echo ==========================================
echo [SUCCESS] All services started
echo ==========================================
echo.
echo   Frontend: http://localhost:%CLIENT_PORT%
echo   Backend:  http://localhost:%SERVER_PORT%
echo   WebSocket: ws://localhost:%WS_PORT%
echo   API Docs: http://localhost:%SERVER_PORT%/api-docs
echo.
echo   Services running in new windows
echo   Close windows to stop services
echo ==========================================
echo.
pause
exit /b 0

:kill_port
set port=%1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%port%" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process on port %port%...
    taskkill /F /PID %%a >nul 2>&1
)
goto :eof

