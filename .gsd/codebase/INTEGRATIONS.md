# External Integrations

**Analysis Date:** 2026-04-14
**Project:** cashfinch (local-first, single-user)

## Überblick

cashfinch ist eine **local-first**-Anwendung ohne Cloud-, Drittanbieter- oder Datenbank-Integrationen. Sämtliche Daten liegen als JSON-Dateien auf dem lokalen Dateisystem. Die einzige "Integration" ist die Kommunikation zwischen React-Frontend und Express-Backend innerhalb desselben Node-Prozesses (Prod) bzw. zweier Prozesse (Dev mit Vite-Proxy).

## APIs & External Services

**Keine.** Es werden keine HTTP-Aufrufe an externe Dienste (Banken, Payment-Provider, Analytics, Telemetrie) getätigt.

**Einzige externe Ressource:**
- Google Fonts (Figtree) via `<link rel="stylesheet">` in `index.html:8-11` – reiner Browser-Abruf beim Laden der SPA, kein Backend-Call.

## Data Storage

**Primär – Dateisystem (lokal):**
Alle Nutzdaten als JSON-Dateien. Pfad konfigurierbar via `config.json` (für Cloud-Sync-Ordner / NAS).

**Standard-Datenpfad:** `./data/` (relativ zum Projektroot)
**Custom-Pfad:** Beliebiger lokaler Ordner, gesetzt über `POST /api/einstellungen/datenpfad-wechsel`

**Datendateien (`server/routes/auth.js:23-29`):**
- `einnahmen.json` – Einnahmen (`server/routes/einnahmen.js`)
- `ausgaben.json` – wiederkehrende Ausgaben (`server/routes/ausgaben.js`)
- `budgets.json` – Budgets (`server/routes/budgets.js`)
- `konten.json` – Bankkonten-Namen (`server/routes/konten.js`)
- `kategorien.json` – Kategorien mit Farben (`server/routes/kategorien.js`)

**Konfigurationsdatei:**
- `data/config.json` – Datenpfad, Sortierreihenfolgen, Salt, Verifier, UI-Flags
- **Pointer-Logik** (`server/storage/jsonStore.js:38-67`): Ist ein custom `datenpfad` gesetzt, enthält `./data/config.json` nur `{ datenpfad }` als Pointer; die vollständige Config liegt dann unter `<datenpfad>/config.json`.
- **Einmal-Migration** (`server/storage/jsonStore.js:27-36`): Altes `./config.json` wird beim Start automatisch in `./data/config.json` verschoben.

**Verschlüsselung at-rest:**
- Datendateien können mit AES-256-GCM verschlüsselt werden (`server/storage/crypto.js`)
- Schlüsselableitung: scrypt mit N=16384, r=8, p=1, 32-Byte-Salt
- Schlüssel lebt nur im RAM (`server/storage/keyStore.js`) – nie persistiert
- Verschlüsselte Dateien tragen `_enc: true` + `{ iv, tag, data }` im Hex-Format
- `config.json` bleibt immer Klartext (enthält nur Salt + Verifier, nie den Schlüssel)

**Dateien gitignored (`.gitignore:13-14`):**
```
data/*.json
config.json
```
Persönliche Daten werden nie committed.

## File Storage

Nur lokales Dateisystem. Zentrale I/O-Funktionen in `server/storage/jsonStore.js`:
- `readFile(filename)` – liest + entschlüsselt automatisch wenn Key aktiv
- `writeFile(filename, data)` – schreibt + verschlüsselt automatisch wenn Key aktiv
- `readConfig()` / `writeConfig(updates)` – config.json (immer Klartext, Merge-Semantik)
- `migrateDatapfad(neuerPfad, behalteZielConfig)` – Pfadwechsel mit optionalem Dateien-Umzug
- `getDataPath()` / `getConfigPath()` – aktive Pfade (respektiert Pointer)

## Caching

**Keine** externe oder interne Cache-Schicht. Daten werden bei jedem API-Request neu aus der Datei gelesen.

## Authentication & Identity

**Lokaler Passwortschutz (optional), kein externer Identity-Provider:**
- Implementierung in `server/routes/auth.js` + `server/storage/crypto.js`
- Passwort → scrypt → 32-Byte-Key
- Verifier-Pattern: bekannter Klartext `"cashfinch-auth-v1"` wird bei Setup verschlüsselt und in `config.json` gespeichert; beim Unlock wird er mit dem abgeleiteten Key entschlüsselt – schlägt bei falschem Passwort durch GCM-Tag-Fehler sofort fehl
- Key nur im RAM (`server/storage/keyStore.js`); Server-Neustart = App gesperrt

**Kein Multi-User:** Das System kennt keine Benutzer- oder Rollenverwaltung.

## Monitoring & Observability

- **Kein** Error-Tracking (Sentry o. ä.)
- **Kein** strukturiertes Logging
- Nur `console.log` beim Server-Start: `cashfinch laeuft auf http://localhost:...` (`server/index.js:71`)

## CI/CD & Deployment

- **Keine** CI-Pipeline (kein `.github/workflows`, kein `Dockerfile`)
- **Hosting:** läuft ausschließlich lokal beim Nutzer
- Deployment = ZIP entpacken + `install.bat`/`install.sh` (macht `npm install` + `npm run build`, legt Desktop-Verknüpfung unter Windows an)

## Frontend ↔ Backend Communication

**Protokoll:** REST über HTTP/JSON, Base-URL `/api` (`src/api/api.js:6`)
**Response-Format:** Einheitlich `{ data, error }` bei allen Endpunkten
**Frontend-Fetch:** Native `fetch` (kein Axios), gekapselt in `src/api/api.js`
**Zentraler Datenladen:** `src/hooks/useFinanzDaten.js` lädt alle Listen parallel via `Promise.all`

**Dev-Kommunikation:**
- Vite (5173) → Proxy `/api` → Express (3001) (`vite.config.js:15-21`)

**Prod-Kommunikation:**
- Express (3000) serviert statisches `dist/` + `/api`-Routen aus demselben Prozess (`server/index.js:58-67`)
- SPA-Fallback: unbekannte Non-API-Pfade liefern `dist/index.html`

## Express-Endpoints (vollständig)

**Auth (immer zugänglich, kein Lock-Check, `server/routes/auth.js`):**
- `GET  /api/auth/status` – eingerichtet? gesperrt? Flags
- `POST /api/auth/setup` – Ersteinrichtung Passwort + alle Daten verschlüsseln
- `POST /api/auth/unlock` – Passwort prüfen, Key in RAM
- `POST /api/auth/lock` – Key aus RAM entfernen
- `POST /api/auth/remove` – Passwortschutz entfernen (Daten entschlüsseln)
- `POST /api/auth/enc-hint-gesehen` – UI-Flag in config
- `POST /api/auth/onboarding-gesehen` – UI-Flag in config

**Geschützt durch `requireUnlocked`-Middleware (`server/middleware/requireUnlocked.js`):**
- Einnahmen: `GET|POST /api/einnahmen`, `PUT|DELETE /api/einnahmen/:id`
- Ausgaben: `GET|POST /api/ausgaben`, `PUT|DELETE /api/ausgaben/:id`
- Budgets: `GET|POST /api/budgets`, `PUT|DELETE /api/budgets/:id`
- Konten: `GET|POST /api/konten`, `PUT|DELETE /api/konten/:id?mitAusgaben=true`
- Kategorien: `GET|POST /api/kategorien`, `PUT|DELETE /api/kategorien/:id?mitAusgaben=true`
- Einstellungen: `GET|POST /api/einstellungen`, `POST /api/einstellungen/datenpfad-wechsel`, `GET /api/einstellungen/datenpfad-pruefen?pfad=...`
- Datenintegrität: `GET /api/konsistenz`, `POST /api/konsistenz/{kategorien,konten}/{anlegen,loeschen}`

**HTTP-Statuscodes:**
- `423 Locked` – App ist eingerichtet aber gesperrt (`server/middleware/requireUnlocked.js:17`)
- `409 Conflict` – Löschen blockiert durch vorhandene Referenzen (Konten/Kategorien)
- `401 Unauthorized` – Passwort falsch
- `400 / 404 / 500` – Validierung / Not found / Server-Fehler

## Environment Configuration

**Einzige ENV-Variable:**
- `NODE_ENV` – `production` aktiviert Port 3000 + statisches Ausliefern von `dist/`; sonst Port 3001 (Dev)

**Keine Secrets in ENV-Variablen** – Salt + Verifier liegen in `config.json`, Passwort gibt der Nutzer zur Laufzeit ein.

## Webhooks & Callbacks

**Incoming:** Keine.
**Outgoing:** Keine.

## Netzwerk-Interfaces

Der Express-Server lauscht per Default auf allen Interfaces (`app.listen(PORT, ...)` ohne Host-Binding in `server/index.js:69`). `cors()` wird ohne Origin-Whitelist genutzt (`server/index.js:40`). Für ein Single-User-Local-Tool auf `localhost` unkritisch; bei Exposition ins LAN relevant.

---

*Integration audit: 2026-04-14*
