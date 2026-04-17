# Codebase Structure

**Analysis Date:** 2026-04-14

## Directory Layout

```
App_Ausgabenübersicht/
├── index.html                  # HTML-Einstiegspunkt (lädt /src/main.jsx)
├── package.json                # Scripts + Dependencies (React 19, Express 5, Recharts, Vite 8)
├── vite.config.js              # Vite-Config: Port 5173, /api-Proxy → 3001, Recharts-Chunk
├── install.bat / install.sh    # Erstinstallation (npm install + Build)
├── start.bat  / start.sh       # Produktionsstart
├── README.md / LICENSE         # Projekt-Doku
├── .gitignore                  # Schließt data/, config.json, node_modules, dist aus
├── src/                        # Frontend (React 19 + Vite)
│   ├── main.jsx                # React-Root: createRoot → <App />
│   ├── App.jsx                 # Root-Komponente: Auth, Routing, Theme, Datenladen
│   ├── constants.js            # Statische Options (RHYTHMUS_OPTIONEN)
│   ├── index.css               # Globale CSS-Variablen (Dark/Light), Tailwind-Import
│   ├── api/
│   │   └── api.js              # Fetch-Wrapper + alle API-Objekte (ausgabenApi, authApi, …)
│   ├── hooks/
│   │   └── useFinanzDaten.js   # Zentraler Datenhook: paralleles Laden, stilles Refresh
│   ├── pages/                  # Eine Datei pro Haupt-Tab (Props-gesteuert)
│   │   ├── Dashboard.jsx       # Übersichts-Seite (Cards, Donut, Konto-Übersicht, Tabelle)
│   │   ├── AusgabenSeite.jsx   # CRUD für Ausgaben (Tabelle + Form-Panel)
│   │   ├── EinnahmenSeite.jsx  # CRUD für Einnahmen
│   │   ├── BudgetSeite.jsx     # CRUD für Budgets
│   │   └── EinstellungenSeite.jsx  # Konten, Kategorien, Datenpfad, Passwortschutz
│   ├── components/             # Wiederverwendbare UI-Bausteine
│   │   ├── Navbar.jsx          # Sticky Top-Nav mit Pill-Tabs, Theme-Toggle, Lock-Button
│   │   ├── SummaryCards.jsx    # Kennzahl-Kacheln (Einnahmen, Ausgaben, Saldo)
│   │   ├── BudgetCard.jsx      # Budget-Visualisierung auf Dashboard
│   │   ├── DonutChart.jsx      # Recharts-Donut für Kategorienanteile (mit "Sonstige")
│   │   ├── KontoAufschlüsselung.jsx  # Gruppierung nach Konto inkl. Prozent
│   │   ├── AusgabenTabelle.jsx # Read-only Tabelle für Dashboard + interaktiv in AusgabenSeite
│   │   ├── AusgabenFormPanel.jsx  # Formular für Neu/Edit (Rhythmus, Konto, Kategorie, geteilt)
│   │   ├── PasswortSperre.jsx  # Vollbild-Overlay: setup | unlock
│   │   ├── Onboarding.jsx      # Sticky-Karte unten rechts (Ersteinrichtung)
│   │   ├── VerschluesselungsHinweis.jsx  # Opt-in-Modal beim ersten Start
│   │   └── KonsistenzModal.jsx # Dialog für verwaiste Referenzen + Anlegen/Löschen
│   └── utils/
│       ├── berechnungen.js     # Rhythmus-Umrechnung, Gruppierungen, Summen
│       └── formatierung.js     # de-DE Locale (EUR, Rhythmus-Label)
├── server/                     # Backend (Express 5)
│   ├── index.js                # App-Bootstrap: Router mounten, Prod-Static-Serving
│   ├── middleware/
│   │   └── requireUnlocked.js  # HTTP 423, wenn Key fehlt und Setup aktiv
│   ├── routes/                 # Eine Datei pro Ressource
│   │   ├── ausgaben.js         # /api/ausgaben – CRUD
│   │   ├── einnahmen.js        # /api/einnahmen – CRUD
│   │   ├── budgets.js          # /api/budgets – CRUD
│   │   ├── konten.js           # /api/konten – CRUD + Default-Init (Girokonto, Sparkonto)
│   │   ├── kategorien.js       # /api/kategorien – CRUD + 7 Default-Kategorien
│   │   ├── einstellungen.js    # /api/einstellungen – config + Datenpfad-Wechsel
│   │   ├── konsistenz.js       # /api/konsistenz – Verwaiste Referenzen erkennen/heilen
│   │   └── auth.js             # /api/auth – status/setup/unlock/lock/remove + Hint-Flags
│   └── storage/
│       ├── jsonStore.js        # readFile/writeFile/readConfig/migrateDatapfad (Pointer-Prinzip)
│       ├── crypto.js           # generateSalt, deriveKey (scrypt), encrypt/decrypt (AES-GCM)
│       └── keyStore.js         # In-Memory Singleton für den aktiven Key
├── data/                       # Persistenz (in .gitignore!)
│   ├── config.json             # Salt, Verifier, Reihenfolgen, Flags (oder Pointer)
│   ├── einnahmen.json
│   ├── ausgaben.json
│   ├── budgets.json
│   ├── konten.json
│   └── kategorien.json
├── dist/                       # Vite-Build-Ausgabe (generiert, .gitignore)
├── docs/
│   ├── Ausgabenübersicht.xlsx  # Ursprüngliche Excel-Vorlage
│   └── screenshots/            # PNG-Screenshots für README
├── img/                        # Logo-Assets (svg, png, ico, afdesign)
├── node_modules/               # Abhängigkeiten (.gitignore)
└── .gsd/codebase/              # GSD-generierte Codebase-Analysen
```

## Directory Purposes

**`src/`:**
- Purpose: Komplettes Frontend, gebaut durch Vite
- Contains: JSX-Komponenten, Hooks, Utilities, API-Client, globales CSS
- Key files: `src/App.jsx`, `src/main.jsx`, `src/api/api.js`, `src/hooks/useFinanzDaten.js`

**`src/pages/`:**
- Purpose: Je eine Komponente pro Tab aus der Navbar
- Contains: Orchestrierende Seitenkomponenten, erhalten Daten als Props, nutzen `*Api.*` für Mutationen
- Key files: `src/pages/Dashboard.jsx`, `src/pages/AusgabenSeite.jsx`, `src/pages/EinstellungenSeite.jsx` (mit ~1100 Zeilen größter Einzelbaustein)

**`src/components/`:**
- Purpose: Wiederverwendbare UI-Bausteine + Overlays (Auth, Onboarding, Konsistenz)
- Contains: Präsentations- und Interaktions-Komponenten ohne Routing-Logik
- Key files: `src/components/PasswortSperre.jsx`, `src/components/KonsistenzModal.jsx`, `src/components/AusgabenTabelle.jsx`

**`src/hooks/`:**
- Purpose: Custom Hooks (aktuell nur `useFinanzDaten`)
- Contains: Stateful Logik, die zwischen Seiten geteilt wird
- Key files: `src/hooks/useFinanzDaten.js`

**`src/utils/`:**
- Purpose: Reine Funktionen ohne React-Abhängigkeit
- Contains: Fachliche Berechnungen (Rhythmus → Monat, Kategorie-Gruppen, `Sonstige`-Schwelle) und Formatierung
- Key files: `src/utils/berechnungen.js`, `src/utils/formatierung.js`

**`src/api/`:**
- Purpose: Zentraler HTTP-Client
- Contains: `request`-Wrapper + ein Objekt pro Ressource (`ausgabenApi`, `einnahmenApi`, `budgetsApi`, `kontenApi`, `kategorienApi`, `konsistenzApi`, `einstellungenApi`, `authApi`)
- Key files: `src/api/api.js`

**`server/`:**
- Purpose: Express-Backend
- Contains: Entry, Middleware, Router, Storage-Layer
- Key files: `server/index.js`

**`server/routes/`:**
- Purpose: HTTP-Handler pro Ressource, direkt auf `jsonStore` schreibend
- Pattern: Jede Datei exportiert einen `express.Router()` mit `GET/POST/PUT/DELETE`
- Key files: `server/routes/auth.js` (komplexeste Logik), `server/routes/konsistenz.js`

**`server/storage/`:**
- Purpose: Einzige Stelle, die Dateien oder Krypto kennt
- Contains: JSON-Persistenz, AES-GCM-Helpers, Key-Singleton
- Key files: `server/storage/jsonStore.js` (inkl. Pointer-Prinzip und Einmalmigration `config.json`)

**`server/middleware/`:**
- Purpose: Querschnittsfunktionen vor den Routern
- Key files: `server/middleware/requireUnlocked.js`

**`data/`:**
- Purpose: Produktive Nutzdaten im JSON-Format
- Generated: Ja (bei erstem API-Aufruf), Committed: Nein (in `.gitignore`)
- Besonderheit: `config.json` wirkt als Boot-Pointer, echter Datenordner per User konfigurierbar

**`dist/`:**
- Purpose: Vite-Build-Output, wird im Produktionsmodus von Express ausgeliefert
- Generated: Ja (`npm run build`), Committed: Nein

**`docs/`, `img/`:**
- Purpose: README-Assets, Excel-Vorlage, Logo in verschiedenen Formaten

**`.gsd/codebase/`:**
- Purpose: Von GSD-Commands generierte Architektur-/Struktur-Analysen (dieses Dokument)

## Key File Locations

**Entry Points:**
- `index.html` – Browser-Einstieg
- `src/main.jsx` – React-Mount
- `src/App.jsx` – Top-Level-Orchestrierung (Auth, Theme, Routing, Daten)
- `server/index.js` – Server-Bootstrap

**Configuration:**
- `package.json` – Scripts (`dev`, `dev:server`, `dev:client`, `build`, `start`, `preview`)
- `vite.config.js` – Dev-Server, Proxy `/api → 3001`, Data-Watch-Ignore
- `data/config.json` – Nutzer-Config + Pointer (nicht in Git)

**Core Logic:**
- `server/storage/jsonStore.js` – Herzstück der Persistenz + Pointer-Mechanik
- `server/storage/crypto.js` – AES-GCM + scrypt
- `src/hooks/useFinanzDaten.js` – Zentrale Datenbeschaffung
- `src/utils/berechnungen.js` – Fachliche Regeln (Rhythmus, 50/50-Split)
- `src/api/api.js` – Alle HTTP-Aufrufe gebündelt

**Auth-/Security-Flow:**
- `server/routes/auth.js` – setup/unlock/lock/remove/status
- `server/middleware/requireUnlocked.js` – 423-Guard
- `server/storage/keyStore.js` – RAM-Singleton für den Key
- `src/components/PasswortSperre.jsx` – UI für Einrichten und Entsperren
- `src/components/VerschluesselungsHinweis.jsx` – Opt-in-Promotion

## Naming Conventions

**Files:**
- React-Komponenten: PascalCase mit `.jsx` (z.B. `AusgabenTabelle.jsx`, `Dashboard.jsx`, `KontoAufschlüsselung.jsx` – Umlaute sind erlaubt)
- Hooks: camelCase mit `use`-Präfix (`useFinanzDaten.js`)
- Server-Module: camelCase (`jsonStore.js`, `keyStore.js`, `requireUnlocked.js`)
- Routen: Ressourcenname kleinschreibweise (`ausgaben.js`, `kategorien.js`)

**Directories:**
- Frontend: Rollen-basiert (`components`, `pages`, `hooks`, `utils`, `api`)
- Backend: Schichten-basiert (`routes`, `storage`, `middleware`)

**Sprache:**
- Projekt ist deutschsprachig – Variablen, Funktionen, Routen- und Dateinamen auf Deutsch (`ausgaben`, `einnahmen`, `kategorien`, `rhythmus`, `geteilt`, `laden`, `fehler`)

## Where to Add New Code

**Neue Seite / Tab:**
- Komponente: `src/pages/NeueSeite.jsx`
- In `src/App.jsx`: Import, Eintrag in `SEITEN_TITEL`, `renderSeite()`-Switch und ggf. `Navbar`-Tabs (`src/components/Navbar.jsx`)

**Neue Ressource (z.B. "Sparziele"):**
- Server-Route: `server/routes/sparziele.js` (Analog zu `budgets.js`)
- Mount in `server/index.js`: `app.use('/api/sparziele', sparzieleRouter)` (hinter `requireUnlocked`)
- Ggf. Datei in `DATEN_DATEIEN`-Listen aufnehmen (`server/routes/auth.js`, `server/routes/einstellungen.js`)
- Client-API: neues Objekt `sparzieleApi` in `src/api/api.js`
- Hook: in `src/hooks/useFinanzDaten.js` zusätzlich laden
- Props-Drilling von `App.jsx` → Zielseite

**Neue wiederverwendbare UI-Komponente:**
- Datei: `src/components/Name.jsx`

**Fachliche Berechnung:**
- Reine Funktion in `src/utils/berechnungen.js`
- Formatierung in `src/utils/formatierung.js`

**Konstante Optionen:**
- `src/constants.js` (derzeit nur `RHYTHMUS_OPTIONEN`)

**Krypto-/Storage-Erweiterung:**
- Bestehende Helpers in `server/storage/` erweitern – Routen sollen weiterhin nur `readFile`/`writeFile` kennen

## Special Directories

**`data/`:**
- Purpose: Nutzdaten + `config.json`
- Generated: Ja, wird bei Bedarf automatisch angelegt (`server/storage/jsonStore.js`)
- Committed: Nein (sensible Daten; bewusst in `.gitignore`)

**`dist/`:**
- Purpose: Vite-Produktions-Build
- Generated: Ja (`npm run build`)
- Committed: Nein

**`node_modules/`:**
- Standard – generiert, nicht committet

**`.gsd/`:**
- Purpose: GSD-Tooling-Artefakte; `codebase/`-Unterordner enthält Analysedokumente wie dieses

---

*Structure analysis: 2026-04-14*
