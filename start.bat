@echo off
echo ================================================
echo   RealTimeChat - Starting App
echo ================================================
echo.

echo Starting Redis (Docker)...
docker start redis-stack >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Could not start redis-stack container.
    echo Make sure Docker is running and redis-stack container exists.
    echo Run: docker run -d --name redis-stack -p 6379:6379 redis/redis-stack-server:latest
    echo.
)

echo Waiting for Redis to be ready...
timeout /t 2 /nobreak >nul

echo.
echo Starting server on http://localhost:4000 ...
start "RealTimeChat - Server" cmd /k "cd /d %~dp0server && npm run dev"

echo Waiting for server to boot...
timeout /t 3 /nobreak >nul

echo.
echo Starting client on http://localhost:5173 ...
start "RealTimeChat - Client" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ================================================
echo   App is starting!
echo.
echo   Client:  http://localhost:5173
echo   Server:  http://localhost:4000
echo   Health:  http://localhost:4000/health
echo.
echo   Close the two terminal windows to stop.
echo ================================================
pause
