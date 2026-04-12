#!/bin/bash
# cashfinch Startscript (macOS / Linux)

echo ""
echo "  cashfinch wird gestartet..."
echo ""

# In das Verzeichnis des Scripts wechseln
cd "$(dirname "$0")"

# Abhängigkeiten installieren falls node_modules fehlt
if [ ! -d "node_modules" ]; then
  echo "  Installiere Abhängigkeiten..."
  npm install
  echo ""
fi

# App starten – Browser öffnet automatisch dank Vite open: true
npm run dev
