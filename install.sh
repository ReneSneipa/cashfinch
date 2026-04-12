#!/bin/bash
# cashfinch – Installationsskript (macOS / Linux)

set -e

echo ""
echo "  ╔══════════════════════════════════╗"
echo "  ║        cashfinch Setup           ║"
echo "  ╚══════════════════════════════════╝"
echo ""

# In das Verzeichnis des Scripts wechseln
cd "$(dirname "$0")"

# --- Node.js prüfen ---
if ! command -v node &> /dev/null; then
  echo "  [FEHLER] Node.js wurde nicht gefunden!"
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
echo "  Node.js gefunden: $NODE_VER"
echo ""

# --- npm install ---
echo "  Installiere Abhängigkeiten (einmalig, kann einige Minuten dauern)..."
echo ""
npm install

echo ""
echo "  ╔══════════════════════════════════╗"
echo "  ║    Installation abgeschlossen!   ║"
echo "  ╚══════════════════════════════════╝"
echo ""
echo "  cashfinch starten:  ./start.sh"
echo ""

read -p "  Jetzt starten? (j/n): " ANTWORT
if [[ "$ANTWORT" =~ ^[jJyY] ]]; then
  chmod +x start.sh
  ./start.sh
fi
