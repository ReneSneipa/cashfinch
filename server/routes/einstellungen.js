/**
 * API-Routen für Einstellungen (config.json).
 *
 * GET  /api/einstellungen          → aktuellen Config-Stand liefern
 * POST /api/einstellungen          → Datenpfad, Konto- und/oder Kategorie-Reihenfolge speichern
 * GET  /api/einstellungen/datenpfad-pruefen?pfad=... → prüfen ob Pfad existiert
 */

const express = require('express');
const fs = require('fs');
const { readConfig, writeConfig, migrateDatapfad } = require('../storage/jsonStore');

const router = express.Router();

/** GET /api/einstellungen */
router.get('/', (req, res) => {
  try {
    const config = readConfig();
    res.json({ data: config, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** POST /api/einstellungen */
router.post('/', (req, res) => {
  try {
    const { datenpfad, kontenReihenfolge, kategorienReihenfolge } = req.body;
    const updates = {};

    // Datenpfad: leer ist ok (= Standard ./data), sonst Pfad prüfen + config.json migrieren
    if (datenpfad !== undefined) {
      if (datenpfad.trim() !== '' && !fs.existsSync(datenpfad.trim())) {
        return res.status(400).json({ data: null, error: `Pfad existiert nicht: ${datenpfad}` });
      }
      // config.json wandert mit in den neuen Ordner (Pointer-Prinzip)
      migrateDatapfad(datenpfad);
    }

    if (kontenReihenfolge !== undefined) {
      if (!Array.isArray(kontenReihenfolge)) {
        return res.status(400).json({ data: null, error: 'kontenReihenfolge muss ein Array sein' });
      }
      updates.kontenReihenfolge = kontenReihenfolge;
    }

    if (kategorienReihenfolge !== undefined) {
      if (!Array.isArray(kategorienReihenfolge)) {
        return res.status(400).json({ data: null, error: 'kategorienReihenfolge muss ein Array sein' });
      }
      updates.kategorienReihenfolge = kategorienReihenfolge;
    }

    writeConfig(updates);
    res.json({ data: readConfig(), error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** GET /api/einstellungen/datenpfad-pruefen?pfad=... */
router.get('/datenpfad-pruefen', (req, res) => {
  const pfad = req.query.pfad ?? '';
  if (pfad.trim() === '') {
    return res.json({ data: { existiert: true, istStandard: true }, error: null });
  }
  const existiert = fs.existsSync(pfad.trim());
  res.json({ data: { existiert, istStandard: false }, error: null });
});

module.exports = router;
