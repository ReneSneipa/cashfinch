/**
 * API-Routen für Einnahmen.
 * CRUD-Endpunkte: GET / POST / PUT /:id / DELETE /:id
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readFile, writeFile } = require('../storage/jsonStore');

const router = express.Router();
const FILE = 'einnahmen.json';

/** GET /api/einnahmen – Alle Einnahmen laden */
router.get('/', (req, res) => {
  try {
    const data = readFile(FILE);
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** POST /api/einnahmen – Neue Einnahme anlegen */
router.post('/', (req, res) => {
  try {
    const einnahmen = readFile(FILE);
    const neu = {
      id: uuidv4(),
      name: req.body.name,
      betrag: Number(req.body.betrag),
      aktiv: true,
    };
    einnahmen.push(neu);
    writeFile(FILE, einnahmen);
    res.status(201).json({ data: neu, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** PUT /api/einnahmen/:id – Einnahme aktualisieren */
router.put('/:id', (req, res) => {
  try {
    const einnahmen = readFile(FILE);
    const idx = einnahmen.findIndex((e) => e.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ data: null, error: 'Einnahme nicht gefunden' });
    }
    einnahmen[idx] = { ...einnahmen[idx], ...req.body };
    writeFile(FILE, einnahmen);
    res.json({ data: einnahmen[idx], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** DELETE /api/einnahmen/:id – Einnahme löschen */
router.delete('/:id', (req, res) => {
  try {
    const einnahmen = readFile(FILE);
    const gefiltert = einnahmen.filter((e) => e.id !== req.params.id);
    if (gefiltert.length === einnahmen.length) {
      return res.status(404).json({ data: null, error: 'Einnahme nicht gefunden' });
    }
    writeFile(FILE, gefiltert);
    res.json({ data: { id: req.params.id }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
