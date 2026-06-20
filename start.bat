@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

echo.
echo  UnifiedAIToolbox - Starting...
echo  --------------------------------
echo  Backend:  http://localhost:3007
echo  Frontend: http://localhost:5176
echo.

:: Install backend dependencies if missing
if not exist "%BACKEND%\node_modules" (
    echo [1/4] Installing backend dependencies...
    pushd "%BACKEND%"
    call npm install --silent
    popd
)

:: Install frontend dependencies if missing
if not exist "%FRONTEND%\node_modules" (
    echo [2/4] Installing frontend dependencies...
    pushd "%FRONTEND%"
    call npm install --silent
    popd
)

:: Start backend in a new window
echo [3/4] Starting backend...
start "UnifiedAIToolbox - Backend" /D "%BACKEND%" cmd /k "npm run dev"

:: Give the backend a moment to bind its port before the frontend proxy needs it
timeout /t 3 /nobreak >nul

:: Start frontend in a new window
echo [4/4] Starting frontend...
start "UnifiedAIToolbox - Frontend" /D "%FRONTEND%" cmd /k "npm run dev"

:: Open browser after frontend has time to compile
timeout /t 5 /nobreak >nul
start "" "http://localhost:5176"

echo.
echo  Both servers are starting in separate windows.
echo  Press any key to close this launcher.
echo.
pause >nul
endlocal
