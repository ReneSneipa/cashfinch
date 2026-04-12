<div align="center">

<img src="img/logo.svg" alt="cashfinch Logo" width="72" height="72" />

# cashfinch

**Persönlicher Finanz-Überblick · lokal · verschlüsselt · kostenlos**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/Lizenz-MIT-blue)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com)

</div>

---

cashfinch ist eine schlanke Web-App für den persönlichen Finanzüberblick – **komplett lokal auf deinem Rechner**, ohne Cloud, ohne Abo, ohne Datenweitergabe. Deine Finanzdaten können optional mit **AES-256-GCM** verschlüsselt werden und liegen nur auf deiner Festplatte.

> **Ideal für:** Fixkosten im Blick behalten, Budgets planen, monatliche Ausgaben analysieren.

---

## ✨ Features

- **Dashboard** – Übersicht über Einnahmen, Ausgaben und den verbleibenden Betrag auf einen Blick
- **Donut-Chart** – Visuelle Aufteilung der Ausgaben nach Kategorien
- **Wiederkehrende Ausgaben** – Monatlich, quartalsweise und jährlich (automatisch auf Monatsbetrag umgerechnet)
- **Budgets** – Frei definierbare Budgettöpfe mit Fortschrittsanzeige
- **Konten & Kategorien** – Vollständig anpassbar, per Drag & Drop sortierbar
- **Optionale AES-256-GCM Verschlüsselung** – Alle Daten passwortgeschützt, Key nur im RAM
- **Dark & Light Mode** – Minimalistisches Apple-inspiriertes Design
- **Konfigurierbarer Datenpfad** – Daten auf NAS, Dropbox oder einem anderen Ordner speichern
- **Kein Abo, keine Cloud** – Daten liegen als JSON-Dateien lokal auf deinem Rechner

---

## 📸 Screenshots

<!-- Screenshots einfügen, z.B.: -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

*Screenshots folgen – starte die App und mach selbst welche!*

---

## ⚙️ Voraussetzungen

Nur **Node.js** wird benötigt (Version 18 oder neuer):

- [Node.js herunterladen](https://nodejs.org) → LTS-Version wählen

Prüfen ob Node.js installiert ist:
```bash
node --version
# v20.x.x
```

---

## 🚀 Installation & Start

### Windows

1. [**Neueste Version herunterladen**](https://github.com/ReneSneipa/cashfinch/releases/latest) → ZIP entpacken
2. **`install.bat` doppelklicken** – installiert Abhängigkeiten, baut die App und legt eine Desktop-Verknüpfung an
3. Danach: **cashfinch auf dem Desktop doppelklicken** (oder `start.bat` im Ordner)

Der Browser öffnet sich automatisch unter `http://localhost:3000`.

> `install.bat` muss nur einmal ausgeführt werden. Danach reicht die Desktop-Verknüpfung oder `start.bat`.

---

### macOS

1. [**Neueste Version herunterladen**](https://github.com/ReneSneipa/cashfinch/releases/latest) → Archiv entpacken
2. Im Terminal:
```bash
cd cashfinch-*
chmod +x install.sh
./install.sh
```

Das Skript installiert alle Abhängigkeiten, baut die App und legt eine **cashfinch.app auf dem Desktop** sowie einen **Dock-Eintrag** an. Danach reicht ein Doppelklick im Dock oder auf dem Desktop.

> Beim ersten Öffnen der .app fragt macOS nach Erlaubnis. Per **Rechtsklick → Öffnen** lässt sich das einmalig bestätigen.

---

### Linux

```bash
cd cashfinch-*
chmod +x install.sh
./install.sh
```

Zum Starten danach: `./start.sh`

---

### Für Entwickler

```bash
git clone https://github.com/ReneSneipa/cashfinch.git
cd cashfinch
npm install
npm run dev
```

Frontend läuft dann auf `http://localhost:5173`, API-Server auf Port 3001.

---

## 🔑 Erste Schritte

1. **Onboarding** – Beim allerersten Start führt ein kurzer Assistent durch die Einrichtung:
   - Einnahmen eintragen
   - Konten & Kategorien anpassen
   - Ausgaben & Budgets anlegen
2. **Verschlüsselung einrichten (optional)** – cashfinch schlägt beim ersten Start vor, ein Passwort für die Datenverschlüsselung einzurichten. Du kannst das überspringen und später in den **Einstellungen** nachholen.
3. **Fertig!** – Das Dashboard zeigt sofort deinen monatlichen Überblick.

> ⚠️ Das Passwort kann nicht wiederhergestellt werden. Bei Verlust sind die verschlüsselten Daten nicht mehr lesbar.

---

## 🗂️ Datenspeicherung

Alle Daten werden lokal im Ordner `data/` als JSON-Dateien gespeichert – im Klartext oder verschlüsselt, je nach Einstellung.

```
data/
├── einnahmen.json    ← Einkommensquellen
├── ausgaben.json     ← Wiederkehrende Ausgaben
├── budgets.json      ← Budget-Definitionen
├── konten.json       ← Kontonamen
└── kategorien.json   ← Ausgabe-Kategorien
```

**Alternativer Datenpfad** (z.B. für Dropbox oder NAS): In den **Einstellungen** unter *Datenspeicherung* einen anderen Ordner auswählen. Die Daten werden automatisch dorthin verschoben.

> Die Datei `config.json` und alle Dateien in `data/` sind in `.gitignore` eingetragen und werden **nicht** mit Git eingecheckt.

---

## 🔐 Sicherheit & Verschlüsselung

Die Verschlüsselung ist optional und kann jederzeit in den **Einstellungen** aktiviert oder deaktiviert werden.

| Komponente | Details |
|------------|---------|
| Algorithmus | AES-256-GCM (authentifiziert) |
| Schlüsselableitung | scrypt (N=16384, r=8, p=1) |
| Key-Speicherung | Ausschließlich im RAM – nie auf der Festplatte |
| Salt & Verifier | In `config.json` gespeichert (kein Klartext-Passwort) |
| Passwort-Minimum | 4 Zeichen |

---

## 🛠️ Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Backend | Express.js 5 |
| Datenspeicherung | JSON-Dateien (lokal) |
| Verschlüsselung | Node.js `crypto` (AES-256-GCM) |

---

## 🗺️ NPM Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm run dev` | Entwicklungsmodus (Server + Frontend mit Hot Reload) |
| `npm run build` | Frontend für Produktion bauen |
| `npm start` | Produktionsmodus (nach `build`, Port 3000) |

---

## 📄 Lizenz

MIT – frei zu verwenden, modifizieren und weiterzugeben.
Siehe [LICENSE](LICENSE).

---

<div align="center">

**cashfinch** · lokal · verschlüsselt · Open Source

</div>
