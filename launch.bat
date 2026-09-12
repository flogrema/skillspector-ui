@echo off
title SkillSpector UI
cd /d "%~dp0"

echo ===================================================
echo   Starting SkillSpector UI (Windows Desktop)
echo ===================================================

REM Check if dist exists; if not, build first
if not exist "dist\index.html" (
  echo Building application assets...
  call npm run build
)

REM Launch Electron application
npx electron .

