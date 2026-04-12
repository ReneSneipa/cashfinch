# Roadmap – cashfinch

Iterative Entwicklung in klar abgegrenzten Meilensteinen.
Kein Big-Bang-Release – jeder Meilenstein ist eigenständig nutzbar.

---

## ✅ M1 – Grundgerüst & Datenmodell (abgeschlossen)
- [x] Projektstruktur anlegen (Frontend + Backend)
- [x] Express-Server mit Basis-Routen
- [x] JSON-Datenschema definieren (Einnahmen, Ausgaben, Budgets)
- [x] Konfigurierbarer Datenpfad via `config.json`
- [x] Start-Script (`.bat` für Windows, `.sh` für macOS)
- [x] Browser öffnet automatisch bei Start
- [x] Dashboard-UI (Mockup implementiert): SummaryCards, BudgetCard, DonutChart, AusgabenTabelle
- [x] Beispieldaten aus Excel übernommen (20 Ausgaben)

## ✅ M2 – Einnahmen & Ausgaben verwalten (abgeschlossen)
- [x] Einnahmen erfassen (mehrere Quellen möglich)
- [x] Wiederkehrende Ausgaben erfassen
  - Rhythmus: monatlich / quartalsweise / jährlich
  - Automatische Umrechnung auf Monatsbetrag
  - Kontozuordnung (WG, Vermögen, Fixkosten, ...)
  - Kategorie (Haushalt, Abo, Versicherung, Dienste, ...)
  - Geteilt-Flag (50/50 WG-Splitting)
- [x] Ausgaben bearbeiten & löschen (zwei-Schritt-Bestätigung)
- [x] Konto- und Kategorie-Filter auf der Ausgaben-Seite
- [x] Seitenrouting aktiviert (Ausgaben, Einnahmen, Platzhalter für M4/M6)
- [x] Testdaten mit 20 Beispielausgaben aus Excel

## ✅ M3 – Dashboard & Übersicht (abgeschlossen)
- [x] Monatliche Gesamtbilanz (Einnahmen - alle Fixkosten) → SummaryCards
- [x] Aufschlüsselung nach Konto → KontoAufschlüsselung (dynamisches Grid, auto-wrap)
- [x] Aufschlüsselung nach Kategorie → DonutChart
- [x] Verbleibender Betrag nach Fixkosten gut sichtbar → SummaryCards

## ✅ M4 – Budgets (abgeschlossen)
- [x] Frei definierbare Budgets anlegen (Name + fixer Betrag + Farbe)
- [x] Verbleibende Mittel auf Budgets verteilen
- [x] Anzeige: zugewiesen vs. noch frei (3 Summary-Kacheln)
- [x] Beispiel-Budgets: WG-Together, Tagesgeld, Freizeit (als Testdaten)

## ✅ M5 – Charts & Diagramme (abgeschlossen)
- [x] Tortendiagramm: Ausgaben nach Kategorie → DonutChart (bereits in M3)
  - Kleine Beträge unter Schwellwert als "Sonstige" zusammenfassen
- [x] Übersichtstabellen mit sortierbaren Spalten → AusgabenTabelle (Klick auf Spalte)

## ✅ M6 – Polish & Start-Komfort (abgeschlossen)
- [x] Dark Mode (Standard) + Light Mode Umschalter → bereits in M1 implementiert
- [x] Desktop-Shortcut Anleitung → in Einstellungen-Seite als geführte Anleitung
- [x] Config-UI: Datenpfad direkt in der App ändern → mit Live-Pfad-Prüfung
- [x] Konten verwalten: Reihenfolge per Drag & Drop → EinstellungenSeite, gespeichert in config.json
  - AusgabenTabelle Standard-Sortierung liest die gespeicherte Reihenfolge
- [ ] Exportfunktion (optional, zurückgestellt)

---

## Tech-Stack

| Bereich | Technologie | Begründung |
|---------|-------------|------------|
| Frontend | React + Vite | Komponentenbasiert, ideal für Dashboards |
| Styling | Tailwind CSS | Apple-like Minimalismus, Dark Mode einfach |
| Charts | Recharts | React-nativ, SVG, kein Overhead |
| Storage | JSON-Dateien | Kein DB-Setup, Cloud-Sync-freundlich |
| Backend | Express.js | Winziger Server nur für Datei-I/O |
| Start | npm-Script + .bat/.sh | Öffnet Browser automatisch |

## Entscheidungen & Abgrenzungen

- **Kein Multi-User, kein Login** – nur für René
- **Keine einmaligen Ausgaben** – nur wiederkehrende Fixkosten
- **Keine Monatstracking** – statische Planung, kein tägliches Eintragen
- **Kein Electron** – zu schwer; einfacher lokaler Webserver reicht
- **InterTrans Spedition** – weggefallen (ehemaliges Community-Projekt)
