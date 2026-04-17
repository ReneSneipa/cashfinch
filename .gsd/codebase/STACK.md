# Technology Stack

**Analysis Date:** 2026-04-14
**Project:** cashfinch (persönlicher Finanz-Überblick)

## Languages

**Primary:**
- JavaScript (ESM im Frontend, CommonJS im Backend) – verwendet in `src/` und `server/`
- JSX – React-Komponenten unter `src/components/`, `src/pages/`

**Sonstige:**
- HTML – `index.html` (Vite-Einstiegspunkt)
- CSS – `src/index.css` mit Tailwind v4
- Shell/Batch – `start.bat`, `start.sh`, `install.bat`, `install.sh`

## Runtime

**Environment:**
- Node.js ≥ 18 (via `install.bat` / `install.sh` vorausgesetzt)
- Browser (Frontend wird als SPA ausgeliefert)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` vorhanden

**Keine TypeScript-, Test- oder Lint-Konfiguration** im Projekt hinterlegt (keine `tsconfig.json`, `.eslintrc*`, `jest.config.*`, `vitest.config.*` gefunden).

## Frameworks

**Frontend:**
- `react` ^19.2.5 – UI-Bibliothek (`src/App.jsx`, `src/main.jsx`)
- `react-dom` ^19.2.5 – DOM-Rendering via `createRoot` in `src/main.jsx`
- `recharts` ^3.8.1 – Diagramme (Donut für Ausgaben, genutzt in `src/components/DonutChart.jsx`)

**Backend:**
- `express` ^5.2.1 – HTTP-Server + Routing (`server/index.js`)
- `cors` ^2.8.6 – CORS-Middleware (erlaubt Dev-Proxy `localhost:5173 → localhost:3001`)
- `uuid` ^13.0.0 – ID-Generierung für Einnahmen, Ausgaben, Budgets, Konten, Kategorien

**Build/Dev:**
- `vite` ^8.0.8 – Dev-Server + Build-Tool (`vite.config.js`)
- `@vitejs/plugin-react` ^6.0.1 – React-Support in Vite
- `@tailwindcss/vite` ^4.2.2 – Tailwind-Integration als Vite-Plugin
- `tailwindcss` ^4.2.2 – Utility-CSS (v4, kein `tailwind.config.js` nötig)
- `nodemon` ^3.1.14 – Auto-Restart des Express-Servers im Dev-Modus (ignoriert `config.json` und `data/`)
- `concurrently` ^9.2.1 – startet Server + Vite parallel via `npm run dev`

**Testing:**
- Nicht vorhanden. Weder Framework noch Testdateien im Projekt.

## Key Dependencies

**Kritisch (Runtime):**
- `express` – gesamte API-Schicht
- `react` / `react-dom` – gesamtes UI
- `recharts` – in eigenen Vite-Chunk ausgelagert (siehe `vite.config.js` Zeile 30–32)
- `uuid` – alle Datensätze nutzen `uuidv4()` (z. B. `server/routes/ausgaben.js:29`)

**Infrastruktur/Sicherheit:**
- `crypto` (Node.js built-in) – AES-256-GCM + scrypt für Passwortschutz
  - Key-Ableitung: `scrypt` mit N=16384, r=8, p=1 (`server/storage/crypto.js:18`)
  - Verschlüsselung: `aes-256-gcm` mit 96-bit IV, 256-bit Key, 256-bit Salt (`server/storage/crypto.js:12-15`)
- `fs` / `path` (Node.js built-in) – JSON-Dateisystem-Speicher (`server/storage/jsonStore.js`)

## Configuration

**Umgebung:**
- `NODE_ENV=production` → Port 3000, Frontend aus `dist/` ausgeliefert
- Dev-Default → Express auf Port 3001, Vite auf Port 5173 mit Proxy auf 3001
- Quelle: `server/index.js:32-33`

**Vite-Config (`vite.config.js`):**
- Dev-Server-Port: 5173, `open: true`
- Datendateien aus File-Watcher ausgeschlossen: `**/data/**`, `**/config.json`
- API-Proxy `/api` → `http://localhost:3001`
- Build-Output: `dist/`
- Manual Chunking: `recharts` + `victory-vendor` in eigenen Chunk
- `chunkSizeWarningLimit`: 600 KB

**Keine .env-Dateien** – gesamte Konfiguration läuft über `data/config.json` (Datenpfad, Salt, Verifier, UI-Flags).

## Scripts (`package.json`)

```bash
npm run dev          # concurrently: nodemon server/index.js + vite
npm run dev:server   # nur Express (Port 3001) mit nodemon
npm run dev:client   # nur Vite-Dev-Server (Port 5173)
npm run build        # vite build → dist/
npm start            # NODE_ENV=production node server/index.js (Port 3000)
npm run preview      # vite preview
```

## Platform Requirements

**Development:**
- Node.js ≥ 18
- npm (Lockfile committed)
- Freie Ports: 3001 (Express), 5173 (Vite)

**Production:**
- Node.js ≥ 18 auf dem Host
- Start über `start.bat` (Windows) oder `start.sh` (macOS/Linux)
- Erstinstallation: `install.bat` / `install.sh` (führt `npm install` + `npm run build` aus, legt Desktop-Verknüpfung auf Windows an)
- Single-Process (Express serviert sowohl `/api` als auch das statische `dist/`)
- Local-first: keine externe Datenbank, kein Cloud-Dienst

## Architektur-Hinweise (Stack-relevant)

- **Monolith-Bundle:** Ein Repo, ein Node-Prozess in Produktion
- **Module-Systeme gemischt:** Backend CJS (`require`), Frontend ESM (`import`)
- **Kein Electron** – läuft im normalen Browser, der Node-Prozess ist der lokale Server
- **Keine CI/CD-Konfiguration** im Repo (kein `.github/workflows`, kein Docker)

---

*Stack analysis: 2026-04-14*
