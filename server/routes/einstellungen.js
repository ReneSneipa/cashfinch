/**
 * API-Routen für Einstellungen (config.json).
 *
 * GET  /api/einstellungen                    → aktuellen Config-Stand liefern
 * POST /api/einstellungen                    → Datenpfad, Konto- und/oder Kategorie-Reihenfolge speichern
 * POST /api/einstellungen/datenpfad-wechsel  → Datenpfad wechseln, optional Datendateien mitkopieren
 * GET  /api/einstellungen/datenpfad-pruefen?pfad=... → prüfen ob Pfad existiert
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { readConfig, writeConfig, migrateDatapfad, getDataPath, getDefaultDataPath } = require('../storage/jsonStore');

// Datendateien die beim Datenpfad-Wechsel kopiert werden können
const DATEN_DATEIEN = ['einnahmen.json', 'ausgaben.json', 'budgets.json', 'konten.json', 'kategorien.json'];

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

/**
 * POST /api/einstellungen/datenpfad-wechsel
 * Wechselt den Datenpfad und kopiert optional alle Datendateien mit.
 * Body: { datenpfad: string, dateienUmziehen: boolean, vorhandeneDatenVerwenden: boolean }
 *
 * dateienUmziehen:        true  → Datendateien aus aktuellem Pfad in neuen Pfad kopieren
 * vorhandeneDatenVerwenden: true → Nur Pointer setzen, vorhandene Daten + config.json im Ziel behalten
 */
router.post('/datenpfad-wechsel', (req, res) => {
  try {
    const { datenpfad, dateienUmziehen, vorhandeneDatenVerwenden } = req.body;
    const neuerPfad = datenpfad ? datenpfad.trim() : '';

    // Neuen Pfad prüfen (wenn nicht Standard)
    if (neuerPfad !== '' && !fs.existsSync(neuerPfad)) {
      return res.status(400).json({ data: null, error: `Pfad existiert nicht: ${neuerPfad}` });
    }

    // Datendateien kopieren wenn gewünscht (und nicht "vorhandene Daten verwenden")
    if (dateienUmziehen && !vorhandeneDatenVerwenden) {
      const quellPfad = getDataPath();
      const zielPfad  = neuerPfad !== '' ? neuerPfad : getDefaultDataPath();

      if (quellPfad !== zielPfad) {
        for (const datei of DATEN_DATEIEN) {
          const quelle = path.join(quellPfad, datei);
          const ziel   = path.join(zielPfad, datei);
          if (fs.existsSync(quelle)) {
            fs.copyFileSync(quelle, ziel);
          }
        }
      }
    }

    // config.json in den neuen Ordner verschieben (Pointer-Prinzip).
    // Bei vorhandeneDatenVerwenden: bestehende config.json im Ziel nicht überschreiben,
    // damit Salt und andere Einstellungen der Sicherung erhalten bleiben.
    migrateDatapfad(neuerPfad, !!vorhandeneDatenVerwenden);

    res.json({ data: readConfig(), error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** GET /api/einstellungen/datenpfad-pruefen?pfad=... */
router.get('/datenpfad-pruefen', (req, res) => {
  const pfad = req.query.pfad ?? '';
  if (pfad.trim() === '') {
    return res.json({ data: { existiert: true, istStandard: true, hatDaten: false, hatConfig: false }, error: null });
  }
  const trimmed = pfad.trim();
  const existiert = fs.existsSync(trimmed);
  // Prüfen ob bereits cashfinch-Datendateien im Zielordner liegen (mind. eine Datei)
  const hatDaten = existiert && DATEN_DATEIEN.some(
    (datei) => fs.existsSync(path.join(trimmed, datei))
  );
  // Prüfen ob eine config.json (mit Salt) im Zielordner liegt
  // Fehlt sie bei verschlüsselten Daten, kann cashfinch die Dateien nicht öffnen
  const hatConfig = existiert && fs.existsSync(path.join(trimmed, 'config.json'));
  res.json({ data: { existiert, istStandard: false, hatDaten, hatConfig }, error: null });
});

module.exports = router;
