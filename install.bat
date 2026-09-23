@echo off
echo ================================================
echo   RealTimeChat - Install Dependencies
echo ================================================
echo.

echo [1/2] Installing server dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Server install failed.
    pause
    exit /b 1
)
echo Server dependencies installed.
echo.

echo [2/2] Installing client dependencies...
cd ..\client
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Client install failed.
    pause
    exit /b 1
)
echo Client dependencies installed.
echo.

cd ..

echo ================================================
echo   Installation complete!
echo.
echo   Next steps:
echo   1. Make sure server\.env is configured
echo   2. Make sure Redis is running (docker start redis-stack)
echo   3. Run: npm run migrate  (inside server folder)
echo   4. Run: start.bat
echo ================================================
pause
