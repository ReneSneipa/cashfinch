# Coding Conventions

**Analysis Date:** 2026-04-14

## Naming Patterns

**Sprache der Bezeichner:** Deutsch dominiert durchgehend. Englisch nur bei Framework-Primitiven (`useState`, `useEffect`, `fetch`, `async/await`).

**Dateien:**
- React-Komponenten: `PascalCase.jsx` — z. B. `SummaryCards.jsx`, `AusgabenTabelle.jsx`, `KontoAufschlüsselung.jsx` (Umlaute im Dateinamen werden verwendet)
- Seiten: `PascalCase.jsx` mit Suffix `Seite` — `AusgabenSeite.jsx`, `BudgetSeite.jsx`, `EinnahmenSeite.jsx`
- Hooks: `camelCase.js` mit `use`-Präfix — `useFinanzDaten.js`
- Utilities: `camelCase.js` (deutsch) — `berechnungen.js`, `formatierung.js`
- Server-Routen: `camelCase.js` (deutsch, Singular-Endpunkt-Name) — `ausgaben.js`, `konten.js`, `konsistenz.js`
- Server-Module: `camelCase.js` — `jsonStore.js`, `keyStore.js`

**Funktionen:**
- `camelCase` mit deutschem Fachvokabular: `berechneMonatsbetrag`, `formatBetrag`, `gruppiereNachKategorie`, `pruefeKonsistenz`
- Handler-Präfix `handle`: `handleErfolg`, `handleLock`, `handleEncEingerichtet`
- Async-Operationen ohne Suffix, aber mit `async`-Schlüsselwort

**Variablen:**
- `camelCase` deutsch: `gesamtEinnahmen`, `anteilKosten`, `zeigeSperre`, `konsistenzDaten`
- Konstanten in Scope-Oberfläche: `UPPER_SNAKE_CASE` — `SEITEN_TITEL`, `RHYTHMUS_FAKTOR`, `ALGORITHM`, `DEFAULT_DATA_PATH`, `FILE`

**React-Komponenten-Props:** camelCase deutsch — `aktiveSeite`, `onSeitenwechsel`, `onReload`, `kontenReihenfolge`

**Enum-artige Werte:** Einbuchstabig + Label-Map — `"M" | "Q" | "J"` für Rhythmus (`src/utils/berechnungen.js:11`, `src/constants.js:6`)

## Code Style

**Formatierung:**
- **Kein ESLint, kein Prettier, kein Biome konfiguriert** — Style ist rein konventionell, nicht durchgesetzt
- Einrückung: 2 Leerzeichen
- Semikolons: ja, konsequent
- Quotes: Single Quotes (`'...'`) für Strings, Doppelanführungszeichen nur in JSX-Attributen
- Trailing Commas in mehrzeiligen Objekten/Arrays: ja
- Arrow Functions mit impliziten Returns für kurze Ausdrücke
- Leerzeilen vor Block-Kommentaren zur Abschnittstrennung

**Abschnittstrennung innerhalb Dateien:**
```js
// ── Kategorie-Badges ──────────────────────────────────────────────────────────
// ── Ausgaben ─────────────────────────────────────────────────────────────
```
Box-Drawing-Unicode (`──`) zur visuellen Gliederung. Siehe `src/api/api.js:26`, `src/components/AusgabenTabelle.jsx:17`.

**Kein Linting-Setup:** Es gibt keine `.eslintrc`, keine `.prettierrc`, keine `eslint.config.*`. Konsistenz beruht auf Gewohnheit.

## Modul-System — gemischt

**Frontend (`src/`):** ES Modules — `import`/`export` mit `.js`/`.jsx` Dateiendungen im Pfad
```js
import { formatBetrag } from '../utils/formatierung.js';
import Navbar from './components/Navbar.jsx';
```

**Backend (`server/`):** CommonJS — `require`/`module.exports`
```js
const express = require('express');
const { readFile, writeFile } = require('../storage/jsonStore');
```

Diese Trennung ist bewusst; Vite handhabt ESM, Node-Server läuft CJS ohne Transpilation.

## Import Organization

**Reihenfolge (beobachtet, nicht erzwungen):**
1. React / externe Libraries (`react`, `recharts`)
2. Eigene Hooks
3. Eigene API-Module
4. Komponenten
5. Seiten / Pages
6. Utilities

**Keine Pfad-Aliase** — ausschließlich relative Pfade (`./`, `../`). Keine Barrel-Files (`index.js` als Reexport) im Einsatz.

## JSDoc-Kommentare

**Pflicht bei allen exportierten Funktionen** in `utils/`, `storage/`, `routes/`, `api/`:
```js
/**
 * Berechnet den monatlichen Nettobetrag einer Ausgabe.
 * Berücksichtigt Rhythmus und Geteilt-Flag.
 * @param {Object} ausgabe
 * @returns {number} Monatsbetrag
 */
export function berechneMonatsbetrag(ausgabe) { ... }
```

**Datei-Header-Kommentar:** Jede nicht-triviale Datei beginnt mit einem Block-Kommentar, der Zweck und Regeln erklärt (siehe `src/utils/berechnungen.js:1-8`, `server/storage/crypto.js:1-8`, `server/routes/ausgaben.js:1-5`).

**Inline-Kommentare:** Häufig zur Erklärung von Sonderfällen, Magic-Werten und Geschäftslogik. Beispiele:
```js
// Kleine Kategorien in "Sonstige" zusammenfassen
// 423 Gesperrt → PasswortSperre-Overlay übernimmt, hier still beenden
// Einmal-Migration: config.json von altem Speicherort ...
```

## Styling-Konvention — Inline-Styles, nicht Tailwind

**Wichtig:** Tailwind ist via `@tailwindcss/vite` installiert und `@import "tailwindcss"` in `src/index.css:1` aktiv, **wird aber in Komponenten nicht verwendet**. Es gibt **0 Verwendungen von `className=`** in `src/`.

Stattdessen:
- Inline `style={{ ... }}` auf jedem DOM-Element (422 Vorkommen über 17 Dateien)
- CSS-Variablen als Design-Tokens in `src/index.css:3-24`:
  - Farben: `var(--bg)`, `var(--surface)`, `var(--text)`, `var(--text-2)`, `var(--blue)`, `var(--green)`, `var(--red)`
  - Radien: `var(--r-sm)` (10px), `var(--r-md)` (14px), `var(--r-lg)` (18px)
  - Glow-Farben: `var(--green-glow)`, `var(--blue-glow)`
- Light-Mode-Override via `[data-theme="light"]` Selektor, Toggle in `src/App.jsx:130-134`

**Konsequenz für neue Komponenten:** Bestehendem Stil folgen — Inline-Styles + CSS-Variablen. Kein Tailwind einführen, bis das gesamte Projekt migriert wird.

**Wiederkehrende Style-Patterns:**
```js
// Karten
{ background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)', padding: '22px 24px' }
// Betrags-Typografie
{ fontSize: 30, fontWeight: 700, letterSpacing: '-1.2px',
  fontVariantNumeric: 'tabular-nums' }
// Sekundär-Text
{ fontSize: 13, color: 'var(--text-2)' }
```

## Error Handling

**Backend (`server/routes/*.js`):** Einheitliches `try/catch` pro Route, immer JSON-Response in der Form `{ data, error }`:
```js
router.get('/', (req, res) => {
  try {
    const data = readFile(FILE);
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});
```
45 `try`-Blöcke über 9 Route-/Storage-Dateien. HTTP-Status: 200/201 bei Erfolg, 404 bei Not-Found, 423 bei Gesperrt, 500 bei Server-Fehler.

**Frontend:** `{ data, error }`-Struktur wird 1:1 vom Client konsumiert:
```js
const res = await konsistenzApi.pruefen();
if (res.data?.hatProbleme) { ... }
```
Fehler werden via State (`fehler`-Variable im Hook) gesammelt und als Banner gerendert (`src/App.jsx:146-155`).

**Stille Fehler:** Bei nicht-kritischen Operationen (Config-Migration, Pointer-Lesen) wird `catch {}` leer verwendet mit Kommentar `/* Fehler ignorieren ... */` (`server/storage/jsonStore.js:34,50`).

## Logging

- Praktisch **kein Logging** — nur 1 `console.*` Aufruf in `server/index.js`.
- Kein zentraler Logger (kein winston/pino).
- Beim Ausbau: einfache `console.error` für Server-Fehler wäre minimal-invasiv und passt zum Stil.

## Funktions-Design

- Reine Funktionen in `utils/berechnungen.js` — keine Seiteneffekte, gut testbar
- Express-Routen bleiben dünn: Parse Body → JSON lesen → Mutation → Schreiben → Response
- Handler-Funktionen in React-Komponenten als inline-arrow-Konstanten (`const handleX = () => { ... }`)
- Optional Chaining (`?.`) und Nullish Coalescing (`??`) werden konsequent statt `||` und `&&` genutzt

## Modul-Design

**Exports:**
- Frontend: Named Exports für Utilities, Default Exports für Komponenten/Hooks
- API-Module als einzelne Objekte: `export const ausgabenApi = { getAll, create, update, delete }` (`src/api/api.js:27`)
- Backend: `module.exports = router` für Routen, Named Exports für Helfer-Module

**Konstanten:** Getrennte Datei `src/constants.js` für statische Enums (sehr minimal, 10 Zeilen). Daten-Defaults wie Konten/Kategorien werden dynamisch über API geladen.

## Weiteres

- **UUIDs** über `uuid` v4 auf Server-Seite für alle neuen Einträge (`server/routes/ausgaben.js:29`)
- **Zahlenformat:** Konsequent `Intl.NumberFormat('de-DE', { currency: 'EUR' })` via Utility `formatBetrag` — nie manuell zusammengebaute Euro-Strings
- **Datumsanzeige:** `toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })` (`src/App.jsx:273`)
- **React-Version:** 19 — funktionale Komponenten, keine Class Components, keine Legacy-Patterns
- **Keine TypeScript** — reines JS mit JSDoc-Typen als Dokumentation

---

*Convention analysis: 2026-04-14*
