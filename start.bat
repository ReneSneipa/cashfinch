@echo off
title cashfinch

cd /d "%~dp0"

echo.
echo  cashfinch wird gestartet...
echo.

:: Node.js pruefen
where node >nul 2>&1
if errorlevel 1 (
  echo  FEHLER: Node.js wurde nicht gefunden.
  echo.
  echo  Bitte Node.js installieren (Version 18 oder neuer):
  echo  https://nodejs.org
  echo.
  pause
  exit /b 1
)

:: Abhaengigkeiten installieren falls node_modules fehlt
if not exist "node_modules" (
  echo  Installiere Abhaengigkeiten (einmalig, bitte warten)...
  echo.
  npm install
  echo.
)

:: App starten - Browser oeffnet sich automatisch
npm run dev
