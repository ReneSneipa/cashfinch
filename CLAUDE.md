# CLAUDE.md – cashfinch

Projektspezifische Regeln. Ergänzt die globale `~/.claude/CLAUDE.md`.

---

## Projektkontext

Persönliche Web-App zur Budgetplanung. Nur für René, lokal auf dem Rechner.
Keine Authentifizierung, kein Multi-User, kein Hosting.

Detaillierte Roadmap: `docs/ROADMAP.md`

---

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Storage | JSON-Dateien (konfigurierbarer Pfad) |
| Backend | Express.js (mini API-Server) |
| Start | npm-Script + `.bat` (Windows) / `.sh` (macOS) |

---

## Projektstruktur

```
/
├── server/               ← Express-Backend
│   ├── index.js          ← Server-Einstiegspunkt
│   ├── routes/           ← API-Routen
│   └── storage/          ← JSON Lese-/Schreiblogik
├── src/                  ← React-Frontend (Vite)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── utils/
├── data/                 ← Standard-Datenpfad (überschreibbar via config.json)
│   ├── einnahmen.json
│   ├── ausgaben.json
│   └── budgets.json
├── docs/
│   └── ROADMAP.md
├── config.json           ← Datenpfad-Konfiguration
├── CLAUDE.md
└── package.json
```

---

## Datenmodell

### Einnahme
```json
{
  "id": "uuid",
  "name": "Gehalt",
  "betrag": 3000,
  "aktiv": true
}
```

### Ausgabe (wiederkehrend)
```json
{
  "id": "uuid",
  "name": "Netflix",
  "betrag": 13.99,
  "rhythmus": "M",
  "faelligAm": "30",
  "konto": "Fixkosten",
  "kategorie": "Abo",
  "geteilt": false,
  "aktiv": true
}
```
Rhythmus: `M` = monatlich, `Q` = quartalsweise, `J` = jährlich
Umrechnung auf Monat: M × 1 | Q / 3 | J / 12

### Budget
```json
{
  "id": "uuid",
  "name": "WG-Together",
  "betrag": 400,
  "farbe": "#3b82f6"
}
```

---

## Fachliche Regeln

- **Geteilt-Flag:** Ausgabe mit `geteilt: true` wird mit Faktor 0.5 in die Monatsrechnung einbezogen
- **Rhythmus-Umrechnung** immer auf Monatsbetrag normieren vor jeder Berechnung
- **Budgets** sind unabhängig von Konten/Kategorien – frei definierbar
- **Verbleibender Betrag** = Summe Einnahmen − Summe aller Fixkosten (monatlich normiert)
- **Keine einmaligen Ausgaben** – Out of Scope

---

## UI/UX-Regeln

- Dark Mode ist Standard, Light Mode als Toggle verfügbar
- Stil: minimalistisch, Apple-inspired (klare Typografie, großzügiger Whitespace)
- Primärfarbe: anpassbar, Default Blau/Indigo
- Zahlen immer in `de-DE` Locale formatieren (`1.234,56 €`)
- Kleine Beträge im Tortendiagramm (< 3% Anteil) unter "Sonstige" gruppieren

---

## Entwicklungsregeln

- Kein Code ohne begleitende Erklärung was sich ändert und warum
- Mockup/Wireframe vor jeder neuen Seite oder größeren UI-Änderung
- Testdaten in `data/beispiel/` – nie die echten Daten überschreiben
- API-Endpunkte sind RESTful, JSON-Response immer mit `{ data, error }` Struktur
- Keine externen Datenbank-Abhängigkeiten einführen
