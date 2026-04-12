@echo off
title cashfinch – Installation
color 0A
chcp 65001 > nul

echo.
echo  ╔══════════════════════════════════╗
echo  ║        cashfinch Setup           ║
echo  ╚══════════════════════════════════╝
echo.

:: Verzeichnis des Skripts als Arbeitsverzeichnis setzen
cd /d "%~dp0"

:: --- Node.js prüfen ---
where node >nul 2>&1
if errorlevel 1 (
  echo  [FEHLER] Node.js wurde nicht gefunden!
  echo.
  echo  Bitte Node.js installieren (Version 18 oder neuer):
  echo  https://nodejs.org
  echo.
  echo  Nach der Installation dieses Skript erneut ausführen.
  echo.
  pause
  exit /b 1
)

:: Node.js-Version anzeigen
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  Node.js gefunden: %NODE_VER%
echo.

:: --- npm install ---
echo  Installiere Abhängigkeiten (einmalig, kann einige Minuten dauern)...
echo.
npm install
if errorlevel 1 (
  echo.
  echo  [FEHLER] npm install fehlgeschlagen.
  echo  Bitte Internetverbindung prüfen und erneut versuchen.
  echo.
  pause
  exit /b 1
)

echo.
echo  ╔══════════════════════════════════╗
echo  ║    Installation abgeschlossen!   ║
echo  ╚══════════════════════════════════╝
echo.
echo  cashfinch starten:  start.bat doppelklicken
echo.

set /p STARTEN="  Jetzt starten? (j/n): "
if /i "%STARTEN%"=="j" (
  start "" "%~dp0start.bat"
)

exit /b 0
