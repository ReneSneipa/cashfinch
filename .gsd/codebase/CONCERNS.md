# Codebase Concerns

**Analysis Date:** 2026-04-14
**Scope:** cashfinch – lokale Personal-Finance-App (React + Vite + Express + JSON)

Dieses Dokument listet Risiken, technische Schulden und offene Baustellen. Einordnung nach Schweregrad: **Critical → High → Medium → Low**.

---

## Critical

### C1 – Datenverlust durch nicht-atomare Schreibvorgänge

- **Files:** `server/storage/jsonStore.js:109`, `109-113`, `152`, `175`, `179`, `184`
- **Problem:** Alle Datendateien werden mit `fs.writeFileSync(filePath, JSON.stringify(...))` direkt in die Zieldatei geschrieben. Stürzt der Prozess, geht der Strom aus oder kollidieren zwei nebenläufige Requests, bleibt eine halb geschriebene (=kaputte) JSON-Datei zurück. Bei verschlüsselten Dateien ist die Folge fataler: Der Nutzer sieht beim nächsten Entsperren nur noch einen Tag-Check-Fehler und hält die Daten für unwiederbringlich verloren.
- **Impact:** Kompletter Verlust der Datendatei (`ausgaben.json`, `einnahmen.json`, `budgets.json`, `konten.json`, `kategorien.json`) inkl. eingecheckter Historie. Kein Backup-Mechanismus vorhanden.
- **Fix-Ansatz:**
  1. Schreibe zuerst in `filename.tmp`, dann `fs.renameSync(tmp, filePath)` (POSIX-atomar). Unter Windows ist `rename` atomar solange Ziel im gleichen Volume liegt.
  2. Optional vorab `.bak`-Kopie anlegen (einfaches Rolling-Backup: `.bak.1`, `.bak.2`).
  3. Für Konkurrenz: einfaches In-Process-Mutex pro Datei (z. B. Serialisieren über eine Queue), da Node-Single-Thread ohnehin nur Race-Conditions aus mehreren Requests ablaufen hat.

### C2 – `auth.js /remove` nutzt `setKey`/`clearKey` innerhalb der Schleife inkorrekt

- **Files:** `server/routes/auth.js:198-205`
- **Problem:** Der Flow liest die Datei **verschlüsselt**, löscht dann den Key, schreibt **Klartext**, setzt den Key zurück – und das in einer Schleife pro Datei. Tritt in der Schleife ein Fehler auf, ist der Zustand inkonsistent: einige Dateien liegen bereits in Klartext vor, andere noch verschlüsselt, der Key kann im RAM fehlen. Der `catch { }` verschluckt jeden Fehler pro Datei komplett (keine Logs).
- **Impact:** Teilweise entschlüsselter Datenbestand. Bei Absturz zwischen den Dateien kann die App in einen Zustand geraten, in dem `config.json` schon gelöscht wurde (Zeile 211), aber manche Dateien noch verschlüsselt sind – damit dauerhaft unlesbar.
- **Fix-Ansatz:** Alle Dateien erst entschlüsselt einlesen, dann Key ein einziges Mal löschen, dann alle schreiben. Bei Fehler den alten Zustand wiederherstellen (oder vorher komplettes Backup-Snapshot anlegen und bei Fehler zurückrollen). `writeConfig({ salt: null, verifier: null })` ZUERST nur dann, wenn alle Schreibvorgänge erfolgreich waren.

---

## High

### H1 – Keine Rate-Limiting / Brute-Force-Schutz auf `/api/auth/unlock`

- **Files:** `server/routes/auth.js:136-169`, `server/index.js:40` (nur `cors()`, kein `helmet`, kein Limiter)
- **Problem:** Jede beliebige lokale Anwendung kann unbegrenzt oft `POST /api/auth/unlock` aufrufen. Zwar bremst `scrypt` (N=16384, ~50–100 ms pro Versuch) massives Brute-Forcing, aber ein Angreifer mit lokalem Netzzugriff (siehe H2) kann trotzdem 10–20 Versuche/Sekunde fahren. Bei einem 4-Zeichen-Mindestpasswort ist das relevant.
- **Impact:** Offline-/lokale Brute-Force-Angriffe praktikabel – vor allem bei schwachen Passwörtern (Minimum 4 Zeichen ist sehr niedrig).
- **Fix-Ansatz:** Einfaches In-Memory-Rate-Limit (z. B. `express-rate-limit`, 10 Versuche/Minute) auf `/api/auth/unlock`, `/api/auth/setup`, `/api/auth/remove`. Zusätzlich Mindest-Passwortlänge auf 8 erhöhen.

### H2 – Express-Server bindet an 0.0.0.0, CORS offen – potentiell im LAN erreichbar

- **Files:** `server/index.js:40` (`app.use(cors())` ohne Origin-Whitelist), `server/index.js:69` (`app.listen(PORT, ...)` ohne Host-Argument → bindet default auf alle Interfaces)
- **Problem:** `app.listen(PORT)` ohne explizites `'127.0.0.1'` lauscht unter Windows je nach Firewall-Dialog auf allen Interfaces. Zusammen mit `cors()` ohne Konfiguration akzeptiert der Server Requests von jedem Origin. Als "local-first"-App ist das unnötige Angriffsfläche (z. B. auf Café-WLAN).
- **Impact:** Jeder im gleichen LAN kann potentiell `http://<ip>:3000/api/auth/unlock` ansprechen, sobald die Windows-Firewall das zulässt.
- **Fix-Ansatz:**
  - `app.listen(PORT, '127.0.0.1', …)` erzwingen.
  - `cors()` nur im Dev-Modus aktivieren oder auf `origin: 'http://localhost:5173'` einschränken.
  - Zusätzlich `helmet()` einbinden für sichere Default-Header.

### H3 – Kein Auth-Tag / kein Salt-Check für verschlüsselte Datendateien nach Passwort-Reset

- **Files:** `server/routes/auth.js:89-133` (Setup liest `readFile`, das wiederum Klartext erwartet wenn kein Key gesetzt ist)
- **Problem:** Der Setup-Flow liest zuerst `readFile(datei)` (Zeile 110). `readFile` entscheidet anhand des `_enc`-Flags, ob entschlüsselt wird. Liegt die Datei bereits verschlüsselt vor (z. B. weil ein früherer Setup-Versuch teilweise durchlief), führt `readFile` zu einem Fehler im `catch`, der still `[]` liefert – **alle Daten werden dann gelöscht** (Zeile 124: `writeFile(datei, allesDaten[datei])` schreibt das leere Array verschlüsselt neu).
- **Impact:** Silenter Datenverlust bei Setup-Wiederholung nach Fehler.
- **Fix-Ansatz:** In `auth.js:110` den `catch` entfernen bzw. echten Fehler werfen, wenn die Datei `_enc: true` hat. Setup darf nicht starten wenn verschlüsselte Daten vorliegen – dann gehört der Flow nach `/unlock`, nicht `/setup`. In `jsonStore.js:82-87` ist die Absicherung schon korrekt; das `try/catch` im Setup-Route unterläuft sie.

### H4 – Konsistenz-Löschaktionen bieten kein Undo und kein Confirm

- **Files:** `server/routes/konsistenz.js:107-121` (`kategorien/loeschen`), `server/routes/konsistenz.js:146-160` (`konten/loeschen`)
- **Problem:** Ein einziger API-Call löscht potentiell alle Ausgaben, die verwaiste Referenzen haben. Es gibt keine serverseitige Preview-Anzahl im Response vor dem Löschen, keine Transaktion, kein Undo. Kombiniert mit C1 (nicht-atomares Schreiben) riskanter Flow.
- **Impact:** Versehentlicher Komplettverlust historischer Ausgaben durch Fehlklick im `KonsistenzModal`.
- **Fix-Ansatz:** Endpoints auf `dry-run` (nur Preview) + expliziten `bestaetigt: true`-Body splitten. Vor dem Löschen automatische Backup-Kopie der betroffenen Datei (`ausgaben.json.bak-YYYY-MM-DD-HHMMSS`).

### H5 – `EinstellungenSeite.jsx` ist mit 1030 LoC zu groß, mehrere Zuständigkeiten vermischt

- **Files:** `src/pages/EinstellungenSeite.jsx` (1030 Zeilen)
- **Problem:** Datei enthält Datenpfad-Karte, Konten-Verwaltung, Kategorien-Verwaltung, Shortcut-Hinweis, Passwort-Verwaltung, Drag-&-Drop. Sehr schwer zu warten, hohe kognitive Last, Bug-Risiko steigt mit jedem Feature.
- **Impact:** Weitere Features (Export, Import, Theme-Varianten) würden die Datei explodieren lassen.
- **Fix-Ansatz:** Karten in eigene Dateien extrahieren: `components/einstellungen/DatenpfadKarte.jsx`, `KontenKarte.jsx`, `KategorienKarte.jsx`, `PasswortKarte.jsx`, `ShortcutKarte.jsx`. `EinstellungenSeite.jsx` wird zum reinen Layout-Komposit.

---

## Medium

### M1 – Keine Tests vorhanden (weder Unit noch Integration)

- **Files:** Komplettes Repo – keine `*.test.*` oder `*.spec.*` Dateien, kein Test-Runner in `package.json:5-12`.
- **Problem:** Verschlüsselungs-Code (`server/storage/crypto.js`), Konsistenz-Logik (`server/routes/konsistenz.js`) und Berechnungen (`src/utils/berechnungen.js`) sind sicherheits- bzw. geschäftskritisch und haben keinerlei automatisierte Absicherung. Jede Änderung riskiert Silent-Regression.
- **Impact:** Refactorings kaum ohne Angst möglich; Regressionen werden erst in Produktion bemerkt – bei monatlicher Nutzung möglicherweise erst nach Monaten.
- **Fix-Ansatz:**
  - Vitest hinzufügen (`devDependencies`).
  - Priorisiert abdecken: `crypto.js` (roundtrip encrypt/decrypt, falsches Passwort wirft), `jsonStore.js` (Pointer-Logik, Datenpfad-Migration), `berechnungen.js` (Monatsumrechnung Q/3, J/12, 50/50-Splitting), `konsistenz.js` (`findeVerwaistKategorien/Konten`).

### M2 – Passwort-Minimum von 4 Zeichen ist kryptografisch unzureichend

- **Files:** `server/routes/auth.js:94` (`passwort.length < 4`), `src/components/PasswortSperre.jsx:35`
- **Problem:** 4-Zeichen-Passwörter sind trotz scrypt in Sekunden bis Minuten zu brute-forcen (<10^7 Kombinationen bei Ziffern + Kleinbuchstaben).
- **Impact:** Verschlüsselung nur so stark wie das schwächste erlaubte Passwort.
- **Fix-Ansatz:** Mindestens 8 Zeichen, besser Passphrase empfehlen (mit Stärke-Indikator zxcvbn-like). Zusätzlich in der UI auf Länge hinweisen.

### M3 – Kein Schema-Versioning / keine Migrationsstrategie für Datendateien

- **Files:** `server/storage/jsonStore.js:27-36` (einmalige config-Migration), aber keine Versions-Felder in `ausgaben.json` etc.
- **Problem:** Schema-Änderung (z. B. neuer Feldtyp an `ausgaben`) bedeutet manuelles Handling beim Laden. Kein `schemaVersion`-Feld → zukünftige Breaking-Changes werden schmerzhaft.
- **Impact:** Künftige Features (z. B. Tags, Notizen) erfordern Ad-hoc-Migrationen, die fehlschlagen können.
- **Fix-Ansatz:** Envelope `{ schemaVersion: 1, items: [...] }` für alle Datendateien. `readFile` ruft bei Bedarf Migrations-Chain auf (1→2→3).

### M4 – Bundle-Größe durch Recharts nicht quantifiziert, Code-Splitting rudimentär

- **Files:** `vite.config.js:27-34` (manualChunks nur für recharts)
- **Problem:** Recharts ist bekannt groß (~300–400 KB gzipped). Für eine lokale App vertretbar, aber beim Kaltstart über Remote-Datenpfad (NAS) spürbar. Dashboard ist die einzige Stelle, die Charts braucht – aktuell wird `DonutChart` aus dem Hauptbundle geladen.
- **Impact:** Langsamer erster Seitenaufbau, insbesondere wenn Dashboard nicht der Einstiegspunkt ist.
- **Fix-Ansatz:** `React.lazy` für `DonutChart.jsx` und `Dashboard.jsx`. `bundle-visualizer` einbinden, tatsächliche Chunk-Größen tracken.

### M5 – Fehler im Konsistenz-Check werden vom Frontend nicht sichtbar gemacht

- **Files:** `src/App.jsx:51-57` (`pruefeKonsistenz`)
- **Problem:** Wenn `konsistenzApi.pruefen()` einen Netzwerk-Fehler wirft, greift das silent Catch im Promise-Chain nicht (keine explizite Fehlerbehandlung). Der Nutzer merkt nie, dass die Prüfung fehlschlug.
- **Impact:** Stille Inkonsistenz – Nutzer glaubt alles sei in Ordnung.
- **Fix-Ansatz:** `try/catch` in `pruefeKonsistenz`, Fehlermeldung via Toast/Banner. Zusätzlich Hintergrund-Check beim App-Resume (Tab wieder fokussiert).

### M6 – Input-Validierung serverseitig inkonsistent (nur Namen geprüft, Beträge roh)

- **Files:** `server/routes/ausgaben.js:25-45` (`Number(req.body.betrag)` ohne NaN-Check, kein Min/Max), `server/routes/einnahmen.js:24-39`, `server/routes/budgets.js:23-39`
- **Problem:** `Number('foo') === NaN`, `Number(undefined) === NaN` – NaN wandert ungefiltert in JSON und zerstört später `toLocaleString`-Ausgaben. Kein Rhythmus-Check (erlaubt ist nur `M|Q|J`, aber der Server nimmt jede String-Eingabe an). `name` kann leer oder nur Whitespace sein. `geteilt` wird zu Boolean gecastet (ok), `faelligAm` ohne Typvalidierung.
- **Impact:** Korrupte Datensätze durch Bugs im Frontend oder direkte API-Calls.
- **Fix-Ansatz:** Ein Validator (z. B. `zod`) pro Route; serverseitige Weißliste für `rhythmus`, `Number.isFinite`-Check für Beträge, `name.trim().length > 0`.

### M7 – Frontend cached keine Daten, jeder Reload lädt alles neu

- **Files:** `src/hooks/useFinanzDaten.js:26-73`
- **Problem:** Beim Seitenwechsel / Reload werden 6 Endpoints sequentiell via `Promise.all` geladen. Kein ETag, kein Caching. Für den Einsatzfall (NAS-Backend) ergibt das spürbare Wartezeit.
- **Impact:** Wahrnehmungs-Performance, wenn Datenpfad auf Netzwerklaufwerk liegt.
- **Fix-Ansatz:** Entweder `If-Modified-Since`-Header in `readFile` unterstützen (Express `res.sendFile` tut das automatisch, aber hier wird `res.json` verwendet). Oder Service Worker für Offline-Cache. Pragmatischer: in-memory Cache im Hook mit `stale-while-revalidate`.

### M8 – Setup-Flow entschlüsselt/verschlüsselt nicht in einer Transaktion

- **Files:** `server/routes/auth.js:108-128`
- **Problem:** Die Schleife in Zeile 124-126 schreibt Datei für Datei. Stirbt der Prozess nach Datei 3 von 5, haben wir 3 verschlüsselte + 2 Klartext-Dateien, aber `salt` ist bereits in `config.json` (Zeile 117). Beim nächsten Start scheitert das Entsperren der Klartext-Dateien.
- **Impact:** Datenverlust-Risiko während Erst-Setup.
- **Fix-Ansatz:** Erst alle Envelopes erzeugen, dann `config.json` schreiben, dann erst die Dateien – alle mit `tmp + rename`-Pattern. Oder Transaktions-Log anlegen.

---

## Low

### L1 – `uuid@^13.0.0` ist ESM-only, `require()` in CJS-Routen technisch fragil

- **Files:** `server/routes/ausgaben.js:8` (`const { v4: uuidv4 } = require('uuid')`) – funktioniert aktuell nur weil uuid noch CJS-Compat bietet.
- **Problem:** Zukünftige uuid-Majors können CJS brechen.
- **Fix-Ansatz:** Entweder Server-Code auf ESM umstellen oder `crypto.randomUUID()` (Node ≥ 14.17) verwenden – spart eine Dependency komplett.

### L2 – React 19 + Vite 8 + Express 5 sind brandneu

- **Files:** `package.json:13-28`
- **Problem:** Alle drei auf neuesten Major-Versionen. Express 5 wurde frisch stabilisiert und hat Breaking Changes (z. B. kein `*` Wildcard mehr – der Code umgeht das via `app.use((req,res)=>...)` in `server/index.js:64`). React 19 hat subtile Änderungen bei `useEffect`-Timing.
- **Impact:** Seltene, aber mögliche Regression bei Patch-Updates.
- **Fix-Ansatz:** Peer-Deps pinnen (`~` statt `^`), Snapshot-Tests für kritische UI-Flows, CHANGELOGS beobachten.

### L3 – `console.log` beim Server-Start ist der einzige Log – keine strukturierten Logs

- **Files:** `server/index.js:71`
- **Problem:** Alle Fehler werden nur via `res.status(500).json({ error })` zurückgegeben, aber nicht geloggt. Beim Debugging (z. B. Crypto-Fehler) kein Logfile.
- **Impact:** Schwer zu diagnostizieren wenn ein Nutzer sich meldet.
- **Fix-Ansatz:** Minimaler Logger (z. B. `console.error` mit Timestamp) in allen `catch`-Blöcken. Kein externes Logging nötig – Privacy-konform bleibt lokale Log-Datei ok, aber nicht committen (`.gitignore`).

### L4 – Tote/unerreichte Logik in `jsonStore.readFile`

- **Files:** `server/storage/jsonStore.js:89` (`return Array.isArray(parsed) ? parsed : []`)
- **Problem:** Der Fallback suggeriert, dass auch Objekte vorkommen können – tatsächlich sind alle Payloads Arrays. Mildes Signal für unklares Schema.
- **Fix-Ansatz:** Bei Schema-Versionierung (siehe M3) eh weg; bis dahin ok.

### L5 – `setSetupDone(!!initConfig.salt)` wird nur beim Server-Start aufgerufen, nicht beim Datenpfad-Wechsel

- **Files:** `server/index.js:37`, `server/routes/einstellungen.js:74-108`
- **Problem:** Wechselt der Nutzer zur Laufzeit auf einen Datenpfad mit verschlüsselter `config.json`, wird `_setupDone` nicht neu gesetzt. In-Memory-Zustand divergiert vom Dateisystem.
- **Impact:** Eher theoretisch – praktisch muss der Nutzer nach Datenpfad-Wechsel ohnehin neu laden. Trotzdem fragil.
- **Fix-Ansatz:** Nach `migrateDatapfad` in `einstellungen.js` `setSetupDone(!!readConfig().salt)` aufrufen.

### L6 – `data/*.json` und `config.json` korrekt in `.gitignore`, aber kein Pre-Commit-Schutz

- **Files:** `.gitignore:13-14`
- **Problem:** Wenn ein Nutzer versehentlich `git add data/ausgaben.json -f` macht oder der Datenpfad versehentlich im Repo liegt, landen Finanzdaten in der Historie.
- **Fix-Ansatz:** Optional Husky + Pre-Commit-Hook der auf `_enc` oder Beträge in staged JSON prüft.

---

## Privacy

- **Keine Telemetrie / Analytics gefunden** – sauber.
- **Einziger `console.log`:** Server-Start-Banner (`server/index.js:71`), keine Datenleaks.
- **Kein externes CDN** eingebunden; alle Assets lokal.
- **localStorage/sessionStorage:** wird NICHT für sensitive Daten verwendet (`src/components/VerschluesselungsHinweis.jsx:5` enthält nur veralteten Kommentarhinweis – State liegt in `config.json`, nicht im Browser).
- **CORS:** offen (`cors()` ohne Whitelist) – Details in H2.

## Dependency Health (Snapshot)

- `npm audit --omit=dev` → **0 vulnerabilities** (Stand 2026-04-14).
- `express@^5.2.1`, `react@^19.2.5`, `vite@^8.0.8`, `cors@^2.8.6`, `uuid@^13.0.0`, `recharts@^3.8.1`, `@tailwindcss/vite@^4.2.2` – alle aktuell, alle wartungsaktiv.
- Keine offensichtlichen unmaintained oder veralteten Pakete.

---

*Concerns audit: 2026-04-14*
