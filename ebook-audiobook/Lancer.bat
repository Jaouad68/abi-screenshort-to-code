@echo off
rem Ouvre lapplication dans une fenetre sur cet ordinateur.
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Lancez dabord Installer.bat
  pause
  exit /b 1
)
".venv\Scripts\python.exe" run.py --app
pause
