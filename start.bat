@echo off
title cashfinch

echo.
echo  cashfinch wird gestartet...
echo.

cd /d "%~dp0"

:: Abhängigkeiten installieren falls node_modules fehlt
if not exist "node_modules" (
  echo  Installiere Abhängigkeiten...
  npm install
  echo.
)

:: App starten – Browser öffnet automatisch dank Vite --open
npm run dev
