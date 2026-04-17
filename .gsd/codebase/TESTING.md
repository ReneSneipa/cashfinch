# Testing Patterns

**Analysis Date:** 2026-04-14

## Aktueller Zustand: Keine Tests vorhanden

**Es existieren keine automatisierten Tests im Projekt.** Die Analyse hat folgendes ergeben:

- Keine Test-Dateien: `find` nach `*.test.*` und `*.spec.*` liefert **0 Treffer** (ausgenommen `node_modules/`).
- Keine Test-Verzeichnisse: kein `tests/`, `__tests__/`, `spec/` auf Projektebene.
- Keine Test-Dependencies in `package.json`: weder `vitest`, `jest`, `mocha`, `@testing-library/*`, `supertest`, `cypress` noch `playwright`.
- Keine Test-Konfiguration: keine `vitest.config.*`, `jest.config.*`, `.mocharc.*`.
- Keine Test-Scripts in `package.json`: nur `dev`, `dev:server`, `dev:client`, `build`, `start`, `preview`.
- Keine Coverage-Ausgabe, kein `/coverage`-Ordner, keine Badges.
- Keine CI-Pipeline (`.github/workflows/`, `.gitlab-ci.yml` o. ä.) für Test-Automatisierung.

## Test Framework

**Runner:** Nicht eingerichtet.

**Assertion Library:** Nicht eingerichtet.

**Run Commands:**
```bash
# Aktuell keine Testbefehle verfügbar
```

## Testabdeckung

**Aktuell: 0 %.** Alle Änderungen werden manuell geprüft; Regressionen können nur durch händische Nutzung entdeckt werden.

## Risikobewertung — Was fehlt zuerst

cashfinch ist zwar ein lokales Tool mit einem Nutzer, enthält aber mehrere Bereiche mit hohem Regressionsrisiko und sicherheitsrelevantem Code. **Ohne Tests sind folgende Bereiche besonders anfällig:**

### Priorität 1 — Kritisch (Daten-/Sicherheits-Integrität)

**1. Verschlüsselungslogik** — `server/storage/crypto.js`
- AES-256-GCM Encrypt/Decrypt Round-Trip
- scrypt-Key-Ableitung mit korrekten Parametern (`N=16384, r=8, p=1`)
- Hex-Kodierung von IV/Salt/Tag fehlerfrei
- Manipulations-Erkennung (GCM-Tag) — Test: manipuliertes Ciphertext muss Fehler werfen
- **Warum kritisch:** Ein Bug hier = dauerhafter Datenverlust für den Nutzer

**2. Storage- und Pointer-Logik** — `server/storage/jsonStore.js`
- `getConfigPath()`: Pointer-Auflösung (config.json ohne/mit `datenpfad`)
- `readFile` / `writeFile`: verschlüsselter vs. Klartext-Modus je nach `keyStore`-Status
- Einmal-Migration von alter `config.json` aus Projekt-Root
- Verhalten bei fehlenden Dateien (`[]` statt Fehler)
- **Warum kritisch:** Datenpfad-Wechsel und Verschlüsselungs-Migration sind fehleranfällig und schwer manuell zu testen

**3. Fachliche Berechnung** — `src/utils/berechnungen.js`
- `berechneMonatsbetrag`: M → ×1, Q → ×1/3, J → ×1/12
- Geteilt-Flag: Betrag wird halbiert
- Fallback bei unbekanntem Rhythmus (`?? 1`)
- `berechneGesamtkosten`: nur `aktiv: true` Einträge
- `gruppiereNachKategorie`: 3 %-Schwellwert → "Sonstige", leere Liste bei total=0, Sortierung desc
- `gruppiereNachKonto`: `anteil`-Berechnung, Fallback `'Ohne Konto'`
- **Warum kritisch:** Falsche Zahlen untergraben den gesamten Zweck der App

### Priorität 2 — Hoch (User-sichtbare Korrektheit)

**4. Währungs-Formatierung** — `src/utils/formatierung.js`
- `formatBetrag(1234.5)` → `"1.234,50 €"` (de-DE Locale)
- `formatBetrag(0)` → `"0,00 €"`
- `formatBetrag(-50)` Vorzeichen-Darstellung
- `formatRhythmus('M'|'Q'|'J')` → korrekte deutsche Labels
- **Warum wichtig:** Nicht-DE-Locale auf fremden Systemen könnte Ausgabe verändern

**5. Konsistenz-Prüfer** — `server/routes/konsistenz.js`
- Verwaiste Referenzen (Ausgabe verweist auf nicht-existierende Kategorie/Konto)
- Auto-Repair-Endpunkte (`kategorienAnlegen`, `kontenAusgabenLoeschen`)
- **Warum wichtig:** Modifiziert Nutzerdaten; falsche Logik kann zu Datenverlust führen

### Priorität 3 — Mittel (Routine-CRUD)

**6. Route-Smoke-Tests** — `server/routes/*.js`
- CRUD für Ausgaben, Einnahmen, Budgets, Konten, Kategorien
- 404 bei unbekannter ID
- `{ data, error }` Response-Kontrakt
- UUID-Generierung bei `POST`
- **Warum mittel:** Simple CRUD, niedriges Bug-Potential, aber gut als Integrations-Basis

**7. Auth-Flow** — `server/routes/auth.js`
- `setup` → `lock` → `unlock` Zyklus
- Falsches Passwort bei `unlock` muss scheitern
- `remove` entschlüsselt alle Dateien zurück

## Empfohlenes Setup

**Vorschlag — Vitest + Supertest** (passt zum Vite-Stack, minimaler Konfigurationsaufwand):

```bash
npm install -D vitest @vitest/ui supertest
```

`package.json` ergänzen:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Empfohlene Teststruktur

Parallel zum Quellcode, gleiche Ordnerhierarchie:

```
src/
  utils/
    berechnungen.js
    berechnungen.test.js       ← Einheitstests pur (keine Mocks nötig)
    formatierung.js
    formatierung.test.js
server/
  storage/
    crypto.js
    crypto.test.js             ← Round-Trip, Manipulations-Erkennung
    jsonStore.js
    jsonStore.test.js          ← mit tmp-Verzeichnis via os.tmpdir()
  routes/
    ausgaben.js
    ausgaben.test.js           ← Supertest gegen Express-App
```

**Begründung:** Projekt verwendet gemischt ESM (Frontend) und CommonJS (Backend) — Tests sollten pro Bereich dem jeweiligen Modul-System folgen. Vitest unterstützt beides.

## Beispiel-Testmuster

**Unit-Test (reine Funktion):**
```js
// src/utils/berechnungen.test.js
import { describe, it, expect } from 'vitest';
import { berechneMonatsbetrag } from './berechnungen.js';

describe('berechneMonatsbetrag', () => {
  it('rechnet Q durch 3', () => {
    const a = { betrag: 30, rhythmus: 'Q', geteilt: false };
    expect(berechneMonatsbetrag(a)).toBe(10);
  });

  it('halbiert bei geteilt=true', () => {
    const a = { betrag: 100, rhythmus: 'M', geteilt: true };
    expect(berechneMonatsbetrag(a)).toBe(50);
  });
});
```

**Crypto-Round-Trip:**
```js
// server/storage/crypto.test.js
const { generateSalt, deriveKey, encrypt, decrypt } = require('./crypto');

describe('AES-256-GCM', () => {
  it('entschlüsselt was es verschlüsselt hat', async () => {
    const salt = generateSalt();
    const key = await deriveKey('geheim', salt);
    const payload = encrypt(key, JSON.stringify([{ name: 'Test' }]));
    const back = decrypt(key, payload);
    expect(JSON.parse(back)).toEqual([{ name: 'Test' }]);
  });
});
```

**Route-Integrationstest:**
```js
// server/routes/ausgaben.test.js
const request = require('supertest');
// ... Express-App mit tmp-Datenverzeichnis bootstrappen ...

it('POST /api/ausgaben legt neue Ausgabe an', async () => {
  const res = await request(app)
    .post('/api/ausgaben')
    .send({ name: 'Miete', betrag: 900, rhythmus: 'M' });
  expect(res.status).toBe(201);
  expect(res.body.data.id).toBeDefined();
});
```

## Mocking

**Aktuell irrelevant** — nichts zum Mocken, weil nichts getestet wird.

**Bei Einführung:**
- **Zu mocken:** Dateisystem (`fs`) für `jsonStore`-Tests, oder einfacher: tmp-Verzeichnis via `os.tmpdir()` + Cleanup in `afterEach`
- **Nicht zu mocken:** `crypto`-Modul (nativ, deterministisch genug), reine Utility-Funktionen
- Vitest-internes Mocking via `vi.mock()` bevorzugen; separates Mock-Framework nicht nötig

## Fixtures

Empfohlen: `server/__fixtures__/ausgaben.json` mit einem kleinen, repräsentativen Datensatz (je ein Eintrag pro Rhythmus M/Q/J, ein geteilter Eintrag, einer inaktiv). Wiederverwendbar für Berechnungs- und Route-Tests.

## E2E-Tests

**Aktuell: nicht vorhanden und nicht dringend.** App ist lokal, Single-User. Falls später gewünscht: **Playwright** wäre ein sinnvoller Kandidat (läuft gegen `npm run preview`). Prioritär sollten aber erst die Kernlogik und Verschlüsselung getestet werden.

---

*Testing analysis: 2026-04-14*
