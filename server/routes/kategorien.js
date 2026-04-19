/**
 * API-Routen für Kategorien.
 *
 * GET    /api/kategorien         → Liste aller Kategorien
 * POST   /api/kategorien         → Neue Kategorie anlegen { name, farbe }
 * PUT    /api/kategorien/:id     → Kategorie bearbeiten { name?, farbe? }
 * DELETE /api/kategorien/:id     → Kategorie löschen (nur wenn keine Ausgaben verwenden)
 *
 * Beim ersten Aufruf wird kategorien.json mit Standard-Kategorien initialisiert.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readFile, writeFile } = require('../storage/jsonStore');

const router = express.Router();
const FILE = 'kategorien.json';
const AUSGABEN_FILE = 'ausgaben.json';

const DEFAULT_KATEGORIEN = [
  { id: uuidv4(), name: 'Haushalt',     farbe: '#5ac8fa' },
  { id: uuidv4(), name: 'Abo',          farbe: '#bf5af2' },
  { id: uuidv4(), name: 'Versicherung', farbe: '#ff9f0a' },
  { id: uuidv4(), name: 'Dienste',      farbe: '#30d158' },
  { id: uuidv4(), name: 'Investments',  farbe: '#0a84ff' },
  { id: uuidv4(), name: 'Spenden',      farbe: '#ff453a' },
  { id: uuidv4(), name: 'Finanzen',     farbe: '#ffd60a' },
];

/** Gibt die Kategorien-Liste zurück, initialisiert bei Bedarf mit Defaults */
function ladeKategorien() {
  const kategorien = readFile(FILE);
  if (kategorien.length === 0) {
    writeFile(FILE, DEFAULT_KATEGORIEN);
    return DEFAULT_KATEGORIEN;
  }
  return kategorien;
}

/** GET /api/kategorien */
router.get('/', (req, res) => {
  try {
    res.json({ data: ladeKategorien(), error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** POST /api/kategorien */
router.post('/', (req, res) => {
  try {
    const { name, farbe } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ data: null, error: 'Name darf nicht leer sein' });
    }
    const kategorien = ladeKategorien();
    if (kategorien.some((k) => k.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(409).json({ data: null, error: `Kategorie "${name}" existiert bereits` });
    }
    const neu = { id: uuidv4(), name: name.trim(), farbe: farbe ?? '#636366' };
    kategorien.push(neu);
    writeFile(FILE, kategorien);
    res.status(201).json({ data: neu, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** PUT /api/kategorien/:id – Kategorie bearbeiten (Name/Farbe). Kaskadiert Namensaenderungen in alle Ausgaben. */
router.put('/:id', (req, res) => {
  try {
    const kategorien = ladeKategorien();
    const idx = kategorien.findIndex((k) => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ data: null, error: 'Kategorie nicht gefunden' });

    const alterName = kategorien[idx].name;
    const neuerName = req.body.name ? req.body.name.trim() : alterName;

    // Duplikat-Check bei Namensaenderung (case-insensitive, nicht gegen sich selbst)
    if (req.body.name && alterName.toLowerCase() !== neuerName.toLowerCase() &&
        kategorien.some((k) => k.name.toLowerCase() === neuerName.toLowerCase())) {
      return res.status(409).json({ data: null, error: `Kategorie "${neuerName}" existiert bereits` });
    }

    kategorien[idx] = {
      ...kategorien[idx],
      ...(req.body.name ? { name: neuerName } : {}),
      ...(req.body.farbe ? { farbe: req.body.farbe } : {}),
    };
    writeFile(FILE, kategorien);

    // Kaskade: alten Namen in allen Ausgaben durch den neuen ersetzen
    let ausgabenAktualisiert = 0;
    if (alterName !== neuerName) {
      const ausgaben = readFile(AUSGABEN_FILE);
      const aktualisiert = ausgaben.map((a) => {
        if (a.kategorie === alterName) { ausgabenAktualisiert++; return { ...a, kategorie: neuerName }; }
        return a;
      });
      if (ausgabenAktualisiert > 0) writeFile(AUSGABEN_FILE, aktualisiert);
    }

    res.json({ data: { ...kategorien[idx], ausgabenAktualisiert }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/**
 * DELETE /api/kategorien/:id – Kategorie löschen.
 * Query-Parameter ?mitAusgaben=true löscht zusätzlich alle Ausgaben die diese Kategorie verwenden.
 * Ohne den Parameter wird bei vorhandenen Ausgaben ein 409 mit Anzahl zurückgegeben.
 */
router.delete('/:id', (req, res) => {
  try {
    const kategorien = ladeKategorien();
    const kategorie = kategorien.find((k) => k.id === req.params.id);
    if (!kategorie) return res.status(404).json({ data: null, error: 'Kategorie nicht gefunden' });

    const ausgaben   = readFile(AUSGABEN_FILE);
    const betroffene = ausgaben.filter((a) => a.kategorie === kategorie.name);
    const mitAusgaben = req.query.mitAusgaben === 'true';

    if (betroffene.length > 0 && !mitAusgaben) {
      // Blockieren und Anzahl zurückgeben damit das Frontend einen gezielten Hinweis zeigen kann
      return res.status(409).json({
        data: { anzahl: betroffene.length, name: kategorie.name },
        error: `${betroffene.length} Ausgabe${betroffene.length !== 1 ? 'n verwenden' : ' verwendet'} die Kategorie "${kategorie.name}".`,
      });
    }

    if (mitAusgaben && betroffene.length > 0) {
      // Ausgaben die diese Kategorie verwenden mitlöschen
      const ohneBetroffene = ausgaben.filter((a) => a.kategorie !== kategorie.name);
      writeFile(AUSGABEN_FILE, ohneBetroffene);
    }

    const gefiltert = kategorien.filter((k) => k.id !== req.params.id);
    writeFile(FILE, gefiltert);
    res.json({ data: { id: req.params.id, ausgabenGeloescht: mitAusgaben ? betroffene.length : 0 }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
