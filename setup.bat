@echo off
echo ========================================
echo   Restorante - Setup Script
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed
  pause
  exit /b 1
)

echo.
echo [2/4] Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
  echo ERROR: prisma generate failed
  pause
  exit /b 1
)

echo.
echo [3/4] Pushing database schema...
call npx prisma db push
if errorlevel 1 (
  echo ERROR: prisma db push failed
  pause
  exit /b 1
)

echo.
echo [4/4] Setup complete!
echo.
echo ========================================
echo   Run: npm run dev
echo   Open: http://localhost:3000
echo ========================================
echo.
pause
