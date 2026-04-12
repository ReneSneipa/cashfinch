/**
 * API-Routen für wiederkehrende Ausgaben.
 * CRUD-Endpunkte: GET / POST / PUT /:id / DELETE /:id
 * Alle Responses haben die Form { data, error }.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readFile, writeFile } = require('../storage/jsonStore');

const router = express.Router();
const FILE = 'ausgaben.json';

/** GET /api/ausgaben – Alle Ausgaben laden */
router.get('/', (req, res) => {
  try {
    const data = readFile(FILE);
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** POST /api/ausgaben – Neue Ausgabe anlegen */
router.post('/', (req, res) => {
  try {
    const ausgaben = readFile(FILE);
    const neu = {
      id: uuidv4(),
      name: req.body.name,
      betrag: Number(req.body.betrag),
      rhythmus: req.body.rhythmus,         // "M" | "Q" | "J"
      faelligAm: req.body.faelligAm ?? '',
      konto: req.body.konto ?? '',
      kategorie: req.body.kategorie ?? '',
      geteilt: Boolean(req.body.geteilt),
      aktiv: true,
    };
    ausgaben.push(neu);
    writeFile(FILE, ausgaben);
    res.status(201).json({ data: neu, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** PUT /api/ausgaben/:id – Ausgabe aktualisieren */
router.put('/:id', (req, res) => {
  try {
    const ausgaben = readFile(FILE);
    const idx = ausgaben.findIndex((a) => a.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ data: null, error: 'Ausgabe nicht gefunden' });
    }
    ausgaben[idx] = { ...ausgaben[idx], ...req.body };
    writeFile(FILE, ausgaben);
    res.json({ data: ausgaben[idx], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** DELETE /api/ausgaben/:id – Ausgabe löschen */
router.delete('/:id', (req, res) => {
  try {
    const ausgaben = readFile(FILE);
    const gefiltert = ausgaben.filter((a) => a.id !== req.params.id);
    if (gefiltert.length === ausgaben.length) {
      return res.status(404).json({ data: null, error: 'Ausgabe nicht gefunden' });
    }
    writeFile(FILE, gefiltert);
    res.json({ data: { id: req.params.id }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
