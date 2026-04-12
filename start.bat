@echo off
title cashfinch

cd /d "%~dp0"

echo.
echo  cashfinch wird gestartet...
echo.

REM Node.js pruefen
node --version >nul 2>nul
if errorlevel 1 (
  echo  FEHLER: Node.js nicht gefunden.
  echo.
  echo  Bitte Node.js installieren ^(Version 18 oder neuer^):
  echo  https://nodejs.org
  echo.
  pause
  exit /b 1
)

REM Abhaengigkeiten installieren falls node_modules fehlt
if not exist node_modules (
  echo  Installiere Abhaengigkeiten ^(einmalig, bitte warten^)...
  echo.
  call npm install
  echo.
)

REM App starten - Browser oeffnet sich automatisch
call npm run dev
