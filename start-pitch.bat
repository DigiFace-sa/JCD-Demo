@echo off
rem Double-click to launch the pitch build (Windows). See README > Pitch day.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it from nodejs.org, then run start-pitch.bat again.
  pause
  exit /b 1
)
node scripts\pitch.mjs %*
if errorlevel 1 pause
