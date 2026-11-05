@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "runtime\node.exe" (
  echo Missing runtime\node.exe. Please use the complete portable package.
  pause
  exit /b 1
)
"runtime\node.exe" "packaging\launch.mjs"
if errorlevel 1 pause
