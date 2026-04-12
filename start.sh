#!/bin/bash
# cashfinch Startscript (macOS / Linux)

cd "$(dirname "$0")"

echo ""
echo "  cashfinch wird gestartet..."
echo ""

# Node.js prüfen
if ! command -v node &> /dev/null; then
  echo "  FEHLER: Node.js nicht gefunden."
  echo "  Bitte Node.js installieren: https://nodejs.org"
  echo ""
  read -p "  Taste drücken zum Beenden..."
  exit 1
fi

# Abhängigkeiten prüfen
if [ ! -d "node_modules" ]; then
  echo "  FEHLER: Abhängigkeiten fehlen."
  echo "  Bitte install.sh ausführen."
  echo ""
  read -p "  Taste drücken zum Beenden..."
  exit 1
fi

# Build prüfen
if [ ! -d "dist" ]; then
  echo "  FEHLER: Produktions-Build fehlt."
  echo "  Bitte install.sh ausführen."
  echo ""
  read -p "  Taste drücken zum Beenden..."
  exit 1
fi

echo "  cashfinch läuft auf http://localhost:3000"
echo "  Dieses Fenster offen lassen (Ctrl+C zum Beenden)."
echo ""

# Browser nach kurzer Verzögerung öffnen (macOS: open, Linux: xdg-open)
if [[ "$OSTYPE" == "darwin"* ]]; then
  (sleep 2 && open "http://localhost:3000") &
elif command -v xdg-open &> /dev/null; then
  (sleep 2 && xdg-open "http://localhost:3000") &
fi

# Produktionsserver starten (blockiert bis Ctrl+C)
NODE_ENV=production node server/index.js
