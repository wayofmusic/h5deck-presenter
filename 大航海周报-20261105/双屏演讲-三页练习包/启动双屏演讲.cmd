@echo off
chcp 65001 >nul
cd /d "%~dp0app"
"runtime\node.exe" "packaging\launch.mjs"
if errorlevel 1 pause
