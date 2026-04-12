@echo off
title cashfinch Setup
color 0F

cd /d "%~dp0"

echo.
echo  cashfinch Setup
echo  --------------------------------
echo.

:: Node.js prüfen
where node >nul 2>&1
if errorlevel 1 (
  echo  FEHLER: Node.js wurde nicht gefunden.
  echo.
  echo  Bitte Node.js installieren (Version 18 oder neuer):
  echo  https://nodejs.org  --^>  LTS-Version herunterladen
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  Node.js %NODE_VER% gefunden.
echo.

:: npm install
echo  Installiere Abhaengigkeiten...
echo.
npm install
if errorlevel 1 (
  echo.
  echo  FEHLER: Installation fehlgeschlagen.
  echo  Bitte Internetverbindung pruefen und erneut versuchen.
  echo.
  pause
  exit /b 1
)

echo.
echo  --------------------------------
echo  Installation abgeschlossen.
echo  --------------------------------
echo.
echo  cashfinch starten: start.bat doppelklicken
echo.

set /p STARTEN="  Jetzt starten? (j/n): "
if /i "%STARTEN%"=="j" (
  start "" "%~dp0start.bat"
)

exit /b 0
