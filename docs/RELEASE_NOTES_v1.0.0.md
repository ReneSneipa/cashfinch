# cashfinch v1.0.0 – Initial Release

Erster öffentlicher Release von cashfinch – einem persönlichen Finanz-Überblick, der komplett lokal auf deinem Rechner läuft.

## Was ist cashfinch?

cashfinch hilft dir, deine monatlichen Fixkosten im Blick zu behalten: Einnahmen, wiederkehrende Ausgaben (monatlich/quartalsweise/jährlich), Budgets und eine visuelle Auswertung per Donut-Chart.

Alle Daten bleiben **lokal auf deinem Rechner** und werden mit **AES-256-GCM** verschlüsselt.

## ✨ Features in v1.0.0

- **Dashboard** mit Einnahmen/Ausgaben-Übersicht, Donut-Chart und Konto-Aufschlüsselung
- **Wiederkehrende Ausgaben** – monatlich, quartalsweise, jährlich (automatische Umrechnung)
- **Einnahmen** – beliebig viele Einkommensquellen
- **Budgets** – frei definierbare Töpfe mit Fortschrittsbalken
- **Konten & Kategorien** – vollständig anpassbar, per Drag & Drop sortierbar
- **AES-256-GCM Verschlüsselung** – passwortgeschützt, Key nur im RAM
- **Onboarding-Wizard** – geführte Ersteinrichtung nach der Passwort-Einrichtung
- **Dark & Light Mode**
- **Konfigurierbarer Datenpfad** – Daten auf NAS, Dropbox o.ä. speichern

## ⚙️ Systemvoraussetzungen

- **Node.js 18 oder neuer** – [nodejs.org](https://nodejs.org)
- Windows, macOS oder Linux

## 🚀 Installation

**Windows:** `install.bat` doppelklicken
**macOS/Linux:** `./install.sh` ausführen

Danach `start.bat` (Windows) oder `./start.sh` (macOS/Linux) zum Starten.

## ⚠️ Hinweis zur Verschlüsselung

Das Passwort kann **nicht wiederhergestellt** werden. Bei Verlust sind die Daten nicht mehr lesbar. Bitte an einem sicheren Ort notieren.
