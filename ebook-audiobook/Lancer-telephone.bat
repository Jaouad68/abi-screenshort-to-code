@echo off
rem Ouvre lapplication ET la rend accessible au telephone (meme Wi-Fi).
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Lancez dabord Installer.bat
  pause
  exit /b 1
)
".venv\Scripts\python.exe" run.py --app --lan
pause
