# Architecture

**Analysis Date:** 2026-04-14

## Pattern Overview

**Overall:** Zweistufige Client/Server-SPA mit lokaler JSON-Persistenz (local-first, single-user).

**Key Characteristics:**
- React-SPA (Vite-Build) im Browser, Express-API auf `localhost`
- Keine Datenbank – alle Nutzdaten liegen als JSON-Dateien im konfigurierbaren Datenordner
- Optionale Transparent-Verschlüsselung auf Datei-Ebene (AES-256-GCM); Schlüssel ausschließlich im RAM
- Props-Drilling statt globalem State-Container (kein Context/Redux/Zustand)
- Einheitliches API-Antwortschema `{ data, error }` für alle Endpunkte
- Dev-Modus: Vite (5173) + Express (3001), Produktions-Modus: Express (3000) serviert auch `dist/`

## Layers

**Frontend (React 19) – `src/`:**
- Purpose: Darstellung, Interaktion, Seiten-Navigation, lokale Berechnungen
- Location: `src/`
- Contains: Seiten (`src/pages/`), wiederverwendbare Komponenten (`src/components/`), zentraler Daten-Hook (`src/hooks/useFinanzDaten.js`), API-Wrapper (`src/api/api.js`), reine Utility-Funktionen (`src/utils/`)
- Depends on: API-Layer via `fetch('/api/...')`
- Used by: Browser (Entry `src/main.jsx` → `src/App.jsx`)

**API-Layer (Express 5) – `server/routes/`:**
- Purpose: HTTP-Endpunkte für CRUD, Auth, Datenintegrität, Einstellungen
- Location: `server/routes/*.js`
- Contains: Ein Router pro Ressource: `ausgaben`, `einnahmen`, `budgets`, `konten`, `kategorien`, `einstellungen`, `konsistenz`, `auth`
- Depends on: Storage-Layer (`server/storage/jsonStore.js`), Auth-Middleware (`server/middleware/requireUnlocked.js`)
- Used by: `server/index.js` (Mounting aller Router unter `/api`)

**Middleware – `server/middleware/`:**
- Purpose: Cross-cutting Lock-Schutz für alle API-Routen außer `/api/auth`
- Location: `server/middleware/requireUnlocked.js`
- Verhalten: Liefert HTTP 423 zurück, wenn Verschlüsselung eingerichtet aber Key nicht im RAM ist; passiert Plaintext-Modus unverändert

**Storage-Layer – `server/storage/`:**
- Purpose: JSON-Persistenz + Transparente AES-256-GCM-Verschlüsselung + Schlüssel-Lebenszyklus
- Location: `server/storage/jsonStore.js`, `server/storage/crypto.js`, `server/storage/keyStore.js`
- Contains: `readFile`/`writeFile` (entscheiden anhand `_enc`-Flag über Ver-/Entschlüsselung), `readConfig`/`writeConfig`/`migrateDatapfad` (Pointer-Prinzip für `config.json`), Singleton für den Key im RAM
- Used by: Alle Routen und die Auth-Logik

**Datenschicht – `data/`:**
- Purpose: Persistente JSON-Dateien für alle Nutzdaten
- Dateien: `einnahmen.json`, `ausgaben.json`, `budgets.json`, `konten.json`, `kategorien.json`, `config.json`
- Datenpfad: per `config.json` umleitbar (Cloud-/NAS-Sync-Szenarien); `./data/config.json` fungiert als Pointer

## Data Flow

**Lese-Pfad (Initialer App-Start):**
1. `src/main.jsx` mountet `<App />`
2. `App.jsx` ruft `authApi.status()` – Server prüft `config.json` und liefert `{ eingerichtet, gesperrt, verschluesseltOhneKonfig, encHintGesehen, onboardingGesehen }`
3. Je nach Status: `PasswortSperre`, `VerschluesselungsHinweis`, `Onboarding` oder Migrationsmeldung
4. Wenn entsperrt (oder nie verschlüsselt): `useFinanzDaten`-Hook lädt parallel `einnahmen`, `ausgaben`, `budgets`, `einstellungen`, `konten`, `kategorien`
5. `konsistenzApi.pruefen()` läuft zusätzlich – findet verwaiste Referenzen, triggert `KonsistenzModal`
6. Daten werden als Props an die aktive Seite weitergereicht

**Schreib-Pfad (CRUD):**
1. Nutzer interagiert auf Seite (z.B. `AusgabenSeite`) → ruft Methode aus `src/api/api.js` (`ausgabenApi.create(...)`)
2. `fetch('/api/ausgaben', { method: 'POST', ... })` → Vite-Proxy (Dev) oder direkter Express-Mount (Prod)
3. `requireUnlocked`-Middleware prüft Key-Status
4. Router `server/routes/ausgaben.js` liest via `readFile`, mutiert, schreibt via `writeFile`
5. `writeFile` verschlüsselt transparent, wenn Key im `keyStore` liegt
6. Response `{ data, error }` → Frontend ruft `onReload()` → `useFinanzDaten` lädt alle Daten neu

**State Management:**
- Zentraler Hook `src/hooks/useFinanzDaten.js` hält alle Listen als `useState`
- Keine Context-API, kein Redux, kein Zustand – bewusst einfach gehalten (Single-User, wenige Datensätze)
- Props-Drilling von `App.jsx` → Seiten → Komponenten
- Lokaler UI-State (z.B. Selektion, Modus "new/edit") wohnt direkt in der Seiten-Komponente
- Theme (`dark`/`light`) liegt als `useState` in `App.jsx` und wird via `document.documentElement.dataset.theme` auf CSS-Variablen gemappt

## Key Abstractions

**`request(method, url, body)` (Client):**
- Purpose: Einheitlicher `fetch`-Wrapper mit JSON-Handling
- Location: `src/api/api.js`
- Pattern: Alle API-Objekte (`ausgabenApi`, `einnahmenApi`, ...) bauen auf `request` auf

**`{ readFile, writeFile }` (Server):**
- Purpose: Einziger Zugriffspfad auf Nutzdaten; versteckt Verschlüsselung komplett vor den Routen
- Location: `server/storage/jsonStore.js`
- Pattern: Router kennen nur JSON-Arrays, keine Krypto-Details

**`keyStore` (Singleton):**
- Purpose: Hält den abgeleiteten AES-Key im Prozessspeicher
- Location: `server/storage/keyStore.js`
- Lifecycle: `setKey` bei `unlock`/`setup` → `clearKey` bei `lock`/Prozess-Ende; niemals persistiert

**`useFinanzDaten` (Client-Hook):**
- Purpose: Parallele Datenbeschaffung + stilles Nachladen ohne UI-Flackern
- Location: `src/hooks/useFinanzDaten.js`
- Pattern: `laden=true` nur beim Erstladen, danach Hintergrund-Refresh über `neu()`

## Entry Points

**Browser:**
- Location: `index.html` → `src/main.jsx` → `src/App.jsx`
- Triggers: Browser-Request auf Dev-URL `http://localhost:5173` bzw. Prod `http://localhost:3000`
- Responsibilities: React-Baum mounten, Theme setzen, Auth-/Onboarding-Entscheidungen orchestrieren

**Server:**
- Location: `server/index.js`
- Triggers: `npm run dev:server` bzw. `npm start`
- Responsibilities: Express-App bauen, Router mounten, Lock-Middleware setzen, in Prod auch `dist/` ausliefern und Fallback-Route auf `index.html`

## Error Handling

**Strategy:** Server antwortet immer mit `{ data, error }` plus passendem HTTP-Status. Client liest `res.json()` und prüft `error`.

**Patterns:**
- Krypto-Fehler (falsches Passwort) → HTTP 401 mit `error: 'Falsches Passwort.'`
- Lock-Status → HTTP 423 mit `error: 'Gesperrt. Bitte Passwort eingeben.'` – Client triggert `onGesperrt`-Callback in `useFinanzDaten`
- Validierungsfehler → HTTP 400 (`Pfad existiert nicht`, `Name darf nicht leer sein`)
- Konflikte (Löschen referenzierter Kategorien/Konten) → HTTP 409 mit Anzahl betroffener Ausgaben, damit das Frontend gezielt nachfragen kann
- `try/catch` in jeder Route, generischer Fallback: HTTP 500 mit `err.message`

## Cross-Cutting Concerns

**Logging:** Minimal – nur Server-Start-Hinweis in `server/index.js`. Keine Request-Logs.

**Validation:** Pro Route inline (Pflichtfelder, Längen, Existenz). Keine Schema-Library (Zod/Joi) im Einsatz.

**Authentication:**
- Passwortschutz ist optional – Plaintext-Modus ist der Default nach Neuinstall
- Ablauf: `setup` erzeugt Salt → scrypt leitet Key ab → Verifier wird mit diesem Key verschlüsselt und in `config.json` gespeichert
- `unlock` leitet den Key erneut ab und versucht, den Verifier zu entschlüsseln; schlägt GCM-Tag-Check fehl, ist das Passwort falsch
- `lock` entfernt den Key nur aus dem RAM (`keyStore.clearKey`)
- `remove` entschlüsselt alle Datendateien und löscht Salt/Verifier aus `config.json`

**Persistenz-Pointer:**
- `./data/config.json` ist der immer-gleiche Boot-Pfad
- Ist ein custom `datenpfad` gesetzt, enthält `./data/config.json` nur diesen Pointer; die "echte" `config.json` liegt mitsamt Nutzdaten im Zielordner
- Szenario "verschlüsselte Daten ohne passende `config.json`" wird beim Start erkannt → Frontend zeigt Migrationsdialog mit Soll-Pfad

## Sicherheitsarchitektur

**Algorithmen:**
- Key Derivation: `crypto.scrypt` mit `N=16384, r=8, p=1`, 32-Byte Ausgabe (`server/storage/crypto.js`)
- Verschlüsselung: AES-256-GCM mit 12-Byte-IV (zufällig pro Schreibvorgang) und Auth-Tag
- Salt: 32 Byte zufällig, hex-kodiert, dauerhaft in `config.json`

**Schlüsselhandling:**
- Key existiert ausschließlich als `Buffer` im `keyStore`-Singleton
- Nie auf Platte, nie über die Leitung (auch nicht hashed) – nur das User-Passwort wird via `POST /api/auth/unlock` übertragen
- Server-Neustart ⇒ Key weg ⇒ Nutzer muss entsperren (Frontend erkennt 423 und zeigt `PasswortSperre`)

**Verifier-Mechanismus:**
- Konstante `VERIFIER_PLAIN = 'cashfinch-auth-v1'` wird beim Setup verschlüsselt und in `config.json.verifier` abgelegt
- Beim Unlock wird versucht, den Verifier mit dem frisch abgeleiteten Key zu entschlüsseln – GCM-Tag-Mismatch ⇒ falsches Passwort
- Kein Timing-sensitiver Vergleich nötig, weil GCM selbst die Integrität prüft

**Dateiformat verschlüsselt:**
- `{ "_enc": true, "iv": "...", "tag": "...", "data": "..." }` – Flag `_enc` entscheidet transparent über Decrypt-Pfad in `readFile`

---

*Architecture analysis: 2026-04-14*
