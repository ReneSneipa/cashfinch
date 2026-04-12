@echo off
title cashfinch Setup

cd /d "%~dp0"

echo.
echo  cashfinch Setup
echo  --------------------------------
echo.

:: Pruefen ob aus ZIP gestartet (package.json muss vorhanden sein)
if not exist "%~dp0package.json" (
  echo  FEHLER: Bitte zuerst die ZIP-Datei entpacken.
  echo.
  echo  Rechtsklick auf ZIP -^> "Alle extrahieren"
  echo  Dann install.bat aus dem entpackten Ordner starten.
  echo.
  pause
  exit /b 1
)

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

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  Node.js %NODE_VER% gefunden.
echo.

:: npm install
echo  Installiere Abhaengigkeiten...
echo  (Das kann beim ersten Mal einige Minuten dauern.)
echo.
npm install
if errorlevel 1 (
  echo.
  echo  FEHLER: Installation fehlgeschlagen.
  echo  Bitte Internetverbindung pruefen und erneut starten.
  echo.
  pause
  exit /b 1
)

echo.
echo  --------------------------------
echo  Installation erfolgreich!
echo  --------------------------------
echo.
echo  Zum Starten: start.bat doppelklicken
echo.

set /p STARTEN="  Jetzt starten? (j/n): "
if /i "%STARTEN%"=="j" (
  start "" "%~dp0start.bat"
)

echo.
pause
