/**
 * API-Routen für Budgets.
 * CRUD-Endpunkte: GET / POST / PUT /:id / DELETE /:id
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readFile, writeFile } = require('../storage/jsonStore');

const router = express.Router();
const FILE = 'budgets.json';

/** GET /api/budgets – Alle Budgets laden */
router.get('/', (req, res) => {
  try {
    const data = readFile(FILE);
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** POST /api/budgets – Neues Budget anlegen */
router.post('/', (req, res) => {
  try {
    const budgets = readFile(FILE);
    const neu = {
      id: uuidv4(),
      name: req.body.name,
      betrag: Number(req.body.betrag),
      farbe: req.body.farbe ?? '#0a84ff',
    };
    budgets.push(neu);
    writeFile(FILE, budgets);
    res.status(201).json({ data: neu, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** PUT /api/budgets/:id – Budget aktualisieren */
router.put('/:id', (req, res) => {
  try {
    const budgets = readFile(FILE);
    const idx = budgets.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ data: null, error: 'Budget nicht gefunden' });
    }
    budgets[idx] = { ...budgets[idx], ...req.body };
    writeFile(FILE, budgets);
    res.json({ data: budgets[idx], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** DELETE /api/budgets/:id – Budget löschen */
router.delete('/:id', (req, res) => {
  try {
    const budgets = readFile(FILE);
    const gefiltert = budgets.filter((b) => b.id !== req.params.id);
    if (gefiltert.length === budgets.length) {
      return res.status(404).json({ data: null, error: 'Budget nicht gefunden' });
    }
    writeFile(FILE, gefiltert);
    res.json({ data: { id: req.params.id }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
