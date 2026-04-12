#!/bin/bash
# cashfinch – Installationsskript (macOS / Linux)

cd "$(dirname "$0")"
SCRIPT_DIR="$(pwd)"

echo ""
echo "  cashfinch Setup"
echo "  --------------------------------"
echo ""

# --- Node.js prüfen ---
if ! command -v node &> /dev/null; then
  echo "  FEHLER: Node.js wurde nicht gefunden."
  echo ""
  echo "  Bitte Node.js installieren (Version 18 oder neuer):"
  echo "  https://nodejs.org"
  echo ""
  echo "  macOS (mit Homebrew):  brew install node"
  echo "  Linux (Debian/Ubuntu): sudo apt install nodejs npm"
  echo ""
  exit 1
fi

NODE_VER=$(node --version)
echo "  Node.js $NODE_VER gefunden."
echo ""

# --- npm install ---
echo "  Installiere Abhängigkeiten..."
echo "  (Das kann beim ersten Mal einige Minuten dauern.)"
echo ""
npm install --no-audit --no-fund
if [ $? -ne 0 ]; then
  echo ""
  echo "  FEHLER: Installation fehlgeschlagen."
  echo "  Bitte Internetverbindung prüfen und erneut starten."
  echo ""
  exit 1
fi

# --- Frontend bauen ---
echo ""
echo "  Erstelle Produktions-Build..."
echo ""
npm run build
if [ $? -ne 0 ]; then
  echo ""
  echo "  FEHLER: Build fehlgeschlagen."
  echo "  Bitte erneut starten."
  echo ""
  exit 1
fi
echo ""

# --- macOS: .app auf Desktop + Dock-Eintrag ---
if [[ "$OSTYPE" == "darwin"* ]]; then

  APP_PATH="$HOME/Desktop/cashfinch.app"

  echo "  Erstelle cashfinch.app auf dem Desktop..."

  # AppleScript-App erzeugen, die ein Terminal-Fenster öffnet und start.sh ausführt
  osacompile -o "$APP_PATH" -e "
tell application \"Terminal\"
  activate
  do script \"cd '$SCRIPT_DIR' && bash start.sh\"
end tell" 2>/dev/null

  # Icon setzen: logo.png -> ICNS -> in App-Bundle kopieren
  if [ -f "$SCRIPT_DIR/img/logo.png" ]; then
    ICONSET="$TMPDIR/cashfinch_install.iconset"
    ICNS_OUT="$TMPDIR/cashfinch.icns"
    mkdir -p "$ICONSET"

    # Alle benötigten Größen für ein macOS ICNS-Paket
    sips -z 16   16   "$SCRIPT_DIR/img/logo.png" --out "$ICONSET/icon_16x16.png"      &>/dev/null
    sips -z 32   32   "$SCRIPT_DIR/img/logo.png" --out "$ICONSET/icon_16x16@2x.png"   &>/dev/null
    sips -z 32   32   "$SCRIPT_DIR/img/logo.png" --out "$ICONSET/icon_32x32.png"      &>/dev/null
    sips -z 64   64   "$SCRIPT_DIR/img/logo.png" --out "$ICONSET/icon_32x32@2x.png"   &>/dev/null
    sips -z 128  128  "$SCRIPT_DIR/img/logo.png" --out "$ICONSET/icon_128x128.png"    &>/dev/null
    sips -z 256  256  "$SCRIPT_DIR/img/logo.png" --out "$ICONSET/icon_128x128@2x.png" &>/dev/null
    sips -z 256  256  "$SCRIPT_DIR/img/logo.png" --out "$ICONSET/icon_256x256.png"    &>/dev/null
    sips -z 512  512  "$SCRIPT_DIR/img/logo.png" --out "$ICONSET/icon_256x256@2x.png" &>/dev/null
    sips -z 512  512  "$SCRIPT_DIR/img/logo.png" --out "$ICONSET/icon_512x512.png"    &>/dev/null
    sips -z 1024 1024 "$SCRIPT_DIR/img/logo.png" --out "$ICONSET/icon_512x512@2x.png" &>/dev/null

    iconutil -c icns "$ICONSET" -o "$ICNS_OUT" 2>/dev/null

    if [ -f "$ICNS_OUT" ]; then
      # osacompile legt das Icon als applet.icns ab
      cp "$ICNS_OUT" "$APP_PATH/Contents/Resources/applet.icns"
      # Finder-Cache für diese App zurücksetzen
      touch "$APP_PATH"
    fi

    rm -rf "$ICONSET" "$ICNS_OUT"
  fi

  echo "  cashfinch.app auf dem Desktop erstellt."
  echo ""

  # Dock-Eintrag hinzufügen (Dock startet kurz neu)
  echo "  Füge cashfinch zum Dock hinzu..."
  defaults write com.apple.dock persistent-apps -array-add \
    "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>$APP_PATH</string><key>_CFURLStringType</key><integer>0</integer></dict></dict></dict>" 2>/dev/null
  killall Dock 2>/dev/null
  echo "  cashfinch im Dock hinzugefügt."
  echo ""

fi

echo "  --------------------------------"
echo "  Installation erfolgreich!"
echo "  --------------------------------"
echo ""
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "  Zum Starten: cashfinch im Dock oder auf dem Desktop doppelklicken"
  echo "               oder ./start.sh im Terminal."
else
  echo "  Zum Starten: ./start.sh"
fi
echo ""

read -p "  Jetzt starten? (j/n): " ANTWORT
if [[ "$ANTWORT" =~ ^[jJyY] ]]; then
  chmod +x start.sh
  ./start.sh
fi
