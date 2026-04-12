@echo off
title cashfinch Setup

cd /d "%~dp0"

echo.
echo  cashfinch Setup
echo  --------------------------------
echo.

REM Pruefen ob aus ZIP gestartet
if not exist "%~dp0package.json" (
  echo  FEHLER: Bitte zuerst die ZIP-Datei entpacken.
  echo.
  echo  Rechtsklick auf ZIP -^> Alle extrahieren
  echo  Dann install.bat aus dem entpackten Ordner starten.
  echo.
  pause
  exit /b 1
)

REM Node.js pruefen
node --version >nul 2>nul
if errorlevel 1 (
  echo  FEHLER: Node.js wurde nicht gefunden.
  echo.
  echo  Bitte Node.js installieren ^(Version 18 oder neuer^):
  echo  https://nodejs.org
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  Node.js %NODE_VER% gefunden.
echo.

REM npm install
echo  Installiere Abhaengigkeiten...
echo  ^(Das kann beim ersten Mal einige Minuten dauern.^)
echo.
call npm install --no-audit --no-fund
if errorlevel 2 (
  echo.
  echo  FEHLER: Installation fehlgeschlagen.
  echo  Bitte Internetverbindung pruefen und erneut starten.
  echo.
  pause
  exit /b 1
)

REM Frontend bauen
echo  Erstelle Produktions-Build...
echo.
call npm run build
if errorlevel 1 (
  echo.
  echo  FEHLER: Build fehlgeschlagen.
  echo  Bitte erneut starten.
  echo.
  pause
  exit /b 1
)
echo.

REM Desktop-Verknuepfung erstellen
echo  Erstelle Desktop-Verknuepfung...
powershell -Command "$WS = New-Object -ComObject WScript.Shell; $sc = $WS.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\cashfinch.lnk'); $sc.TargetPath = '%~dp0start.bat'; $sc.WorkingDirectory = '%~dp0'; $sc.IconLocation = '%~dp0img\logo.ico, 0'; $sc.Description = 'cashfinch starten'; $sc.Save()"
echo  Verknuepfung auf dem Desktop erstellt.
echo.

echo.
echo  --------------------------------
echo  Installation erfolgreich!
echo  --------------------------------
echo.
echo  Zum Starten: cashfinch auf dem Desktop doppelklicken
echo.            oder start.bat im Ordner.
echo.

set /p STARTEN="  Jetzt starten? ^(j/n^): "
if /i "%STARTEN%"=="j" (
  start "" "%~dp0start.bat"
)

echo.
