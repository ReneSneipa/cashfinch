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

REM Installation pruefen
if not exist node_modules (
  echo  FEHLER: Abhaengigkeiten fehlen.
  echo  Bitte install.bat ausfuehren.
  echo.
  pause
  exit /b 1
)

if not exist dist (
  echo  FEHLER: Produktions-Build fehlt.
  echo  Bitte install.bat ausfuehren.
  echo.
  pause
  exit /b 1
)

echo  cashfinch laeuft auf http://localhost:3000
echo  Dieses Fenster offen lassen ^(Strg+C zum Beenden^).
echo.

REM Browser nach kurzer Verzoegerung oeffnen ^(im Hintergrund^)
start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000'"

REM Produktionsserver starten ^(blockiert bis Strg+C^)
set NODE_ENV=production
node server\index.js
