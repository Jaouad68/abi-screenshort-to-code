@echo off
rem Installation sous Windows : double-cliquez sur ce fichier.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
pause
