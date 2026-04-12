/**
 * API-Routen für Konten.
 *
 * GET    /api/konten         → Liste aller Konten
 * POST   /api/konten         → Neues Konto anlegen { name }
 * PUT    /api/konten/:id     → Konto umbenennen { name }
 * DELETE /api/konten/:id     → Konto löschen (nur wenn keine Ausgaben verwenden)
 *
 * Beim ersten Aufruf wird konten.json mit Standard-Konten initialisiert,
 * wenn die Datei noch nicht existiert oder leer ist.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readFile, writeFile } = require('../storage/jsonStore');

const router = express.Router();
const FILE = 'konten.json';
const AUSGABEN_FILE = 'ausgaben.json';

const DEFAULT_KONTEN = [
  { id: uuidv4(), name: 'Girokonto' },
  { id: uuidv4(), name: 'Sparkonto' },
];

/** Gibt die Konten-Liste zurück, initialisiert bei Bedarf mit Defaults */
function ladeKonten() {
  const konten = readFile(FILE);
  if (konten.length === 0) {
    writeFile(FILE, DEFAULT_KONTEN);
    return DEFAULT_KONTEN;
  }
  return konten;
}

/** GET /api/konten */
router.get('/', (req, res) => {
  try {
    res.json({ data: ladeKonten(), error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** POST /api/konten */
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ data: null, error: 'Name darf nicht leer sein' });
    }
    const konten = ladeKonten();
    if (konten.some((k) => k.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(409).json({ data: null, error: `Konto "${name}" existiert bereits` });
    }
    const neu = { id: uuidv4(), name: name.trim() };
    konten.push(neu);
    writeFile(FILE, konten);
    res.status(201).json({ data: neu, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** PUT /api/konten/:id */
router.put('/:id', (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ data: null, error: 'Name darf nicht leer sein' });
    }
    const konten = ladeKonten();
    const idx = konten.findIndex((k) => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ data: null, error: 'Konto nicht gefunden' });
    konten[idx] = { ...konten[idx], name: name.trim() };
    writeFile(FILE, konten);
    res.json({ data: konten[idx], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** DELETE /api/konten/:id – blockiert wenn Ausgaben das Konto verwenden */
router.delete('/:id', (req, res) => {
  try {
    const konten = ladeKonten();
    const konto = konten.find((k) => k.id === req.params.id);
    if (!konto) return res.status(404).json({ data: null, error: 'Konto nicht gefunden' });

    // Prüfen ob Ausgaben dieses Konto verwenden
    const ausgaben = readFile(AUSGABEN_FILE);
    const betroffene = ausgaben.filter((a) => a.konto === konto.name);
    if (betroffene.length > 0) {
      return res.status(409).json({
        data: null,
        error: `${betroffene.length} Ausgabe${betroffene.length !== 1 ? 'n verwenden' : ' verwendet'} das Konto "${konto.name}". Bitte zuerst umbuchen.`,
      });
    }

    const gefiltert = konten.filter((k) => k.id !== req.params.id);
    writeFile(FILE, gefiltert);
    res.json({ data: { id: req.params.id }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
