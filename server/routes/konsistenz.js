/**
 * API-Routen für Datenintegrität.
 *
 * GET  /api/konsistenz                          → prüft auf verwaiste Referenzen
 * POST /api/konsistenz/kategorien/anlegen       → legt fehlende Kategorien aus Ausgaben an
 * POST /api/konsistenz/kategorien/loeschen      → löscht Ausgaben mit fehlenden Kategorien
 * POST /api/konsistenz/konten/anlegen           → legt fehlende Konten aus Ausgaben an
 * POST /api/konsistenz/konten/loeschen          → löscht Ausgaben mit fehlenden Konten
 *
 * "Verwaist" = in ausgaben.json referenziert, aber nicht in kategorien.json / konten.json vorhanden.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readFile, writeFile } = require('../storage/jsonStore');

const router = express.Router();

/**
 * Sammelt alle eindeutigen Kategorienamen aus ausgaben.json
 * die nicht in der übergebenen Kategorien-Liste vorhanden sind.
 */
function findeVerwaistKategorien(ausgaben, kategorien) {
  const bekannt = new Set(kategorien.map((k) => k.name));
  const verwaist = new Set();
  for (const a of ausgaben) {
    if (a.kategorie && a.kategorie.trim() !== '' && !bekannt.has(a.kategorie)) {
      verwaist.add(a.kategorie);
    }
  }
  return [...verwaist];
}

/**
 * Sammelt alle eindeutigen Kontonamen aus ausgaben.json
 * die nicht in der übergebenen Konten-Liste vorhanden sind.
 */
function findeVerwaistKonten(ausgaben, konten) {
  const bekannt = new Set(konten.map((k) => k.name));
  const verwaist = new Set();
  for (const a of ausgaben) {
    if (a.konto && a.konto.trim() !== '' && !bekannt.has(a.konto)) {
      verwaist.add(a.konto);
    }
  }
  return [...verwaist];
}

/** GET /api/konsistenz – Datenintegrität prüfen */
router.get('/', (req, res) => {
  try {
    const ausgaben   = readFile('ausgaben.json');
    const kategorien = readFile('kategorien.json');
    const konten     = readFile('konten.json');

    const verwaistKategorien = findeVerwaistKategorien(ausgaben, kategorien);
    const verwaistKonten     = findeVerwaistKonten(ausgaben, konten);

    // Anzahl betroffener Ausgaben pro verwaister Kategorie / Konto
    const anzahlProKategorie = {};
    for (const name of verwaistKategorien) {
      anzahlProKategorie[name] = ausgaben.filter((a) => a.kategorie === name).length;
    }
    const anzahlProKonto = {};
    for (const name of verwaistKonten) {
      anzahlProKonto[name] = ausgaben.filter((a) => a.konto === name).length;
    }

    res.json({
      data: {
        verwaistKategorien,    // string[]
        verwaistKonten,        // string[]
        anzahlProKategorie,    // { [name]: number }
        anzahlProKonto,        // { [name]: number }
        hatProbleme: verwaistKategorien.length > 0 || verwaistKonten.length > 0,
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/**
 * POST /api/konsistenz/kategorien/anlegen
 * Legt alle verwaisten Kategorienamen als neue Kategorien an (neutrale Farbe).
 */
router.post('/kategorien/anlegen', (req, res) => {
  try {
    const ausgaben   = readFile('ausgaben.json');
    const kategorien = readFile('kategorien.json');
    const verwaist   = findeVerwaistKategorien(ausgaben, kategorien);

    const neu = verwaist.map((name) => ({ id: uuidv4(), name, farbe: '#636366' }));
    writeFile('kategorien.json', [...kategorien, ...neu]);

    res.json({ data: { angelegt: neu.length, kategorien: neu }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/**
 * POST /api/konsistenz/kategorien/loeschen
 * Löscht alle Ausgaben die eine nicht mehr vorhandene Kategorie verwenden.
 */
router.post('/kategorien/loeschen', (req, res) => {
  try {
    const ausgaben   = readFile('ausgaben.json');
    const kategorien = readFile('kategorien.json');
    const verwaist   = new Set(findeVerwaistKategorien(ausgaben, kategorien));

    const gefiltert = ausgaben.filter((a) => !verwaist.has(a.kategorie));
    const anzahl    = ausgaben.length - gefiltert.length;
    writeFile('ausgaben.json', gefiltert);

    res.json({ data: { geloescht: anzahl }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/**
 * POST /api/konsistenz/konten/anlegen
 * Legt alle verwaisten Kontonamen als neue Konten an.
 */
router.post('/konten/anlegen', (req, res) => {
  try {
    const ausgaben = readFile('ausgaben.json');
    const konten   = readFile('konten.json');
    const verwaist = findeVerwaistKonten(ausgaben, konten);

    const neu = verwaist.map((name) => ({ id: uuidv4(), name }));
    writeFile('konten.json', [...konten, ...neu]);

    res.json({ data: { angelegt: neu.length, konten: neu }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/**
 * POST /api/konsistenz/konten/loeschen
 * Löscht alle Ausgaben die ein nicht mehr vorhandenes Konto verwenden.
 */
router.post('/konten/loeschen', (req, res) => {
  try {
    const ausgaben = readFile('ausgaben.json');
    const konten   = readFile('konten.json');
    const verwaist = new Set(findeVerwaistKonten(ausgaben, konten));

    const gefiltert = ausgaben.filter((a) => !verwaist.has(a.konto));
    const anzahl    = ausgaben.length - gefiltert.length;
    writeFile('ausgaben.json', gefiltert);

    res.json({ data: { geloescht: anzahl }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
module.exports.findeVerwaistKategorien = findeVerwaistKategorien;
module.exports.findeVerwaistKonten     = findeVerwaistKonten;
