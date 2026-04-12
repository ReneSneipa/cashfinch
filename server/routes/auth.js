/**
 * Auth-Routen – Passwortschutz für cashfinch.
 *
 * GET  /api/auth/status  → Verschlüsselung eingerichtet? Gesperrt?
 * POST /api/auth/setup   → Ersteinrichtung: Passwort setzen + Daten verschlüsseln
 * POST /api/auth/unlock  → Entsperren (Passwort prüfen, Schlüssel in RAM laden)
 * POST /api/auth/lock    → Sperren (Schlüssel aus RAM löschen)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { generateSalt, deriveKey, encrypt, decrypt } = require('../storage/crypto');
const { setKey, clearKey, isUnlocked, setSetupDone } = require('../storage/keyStore');
const { readConfig, writeConfig, readFile, writeFile, getDataPath, getConfigPath } = require('../storage/jsonStore');

const router = express.Router();

// Bekannter Klartext der verschlüsselt gespeichert wird, um das Passwort zu prüfen
const VERIFIER_PLAIN = 'cashfinch-auth-v1';

// Datendateien die beim Setup verschlüsselt werden
const DATEN_DATEIEN = [
  'einnahmen.json',
  'ausgaben.json',
  'budgets.json',
  'konten.json',
  'kategorien.json',
];

/** GET /api/auth/status */
router.get('/status', (req, res) => {
  try {
    const config = readConfig();

    // Prüfen ob verschlüsselte Datendateien vorhanden sind, aber kein Salt (= config.json fehlt/wurde nicht mitkopiert)
    let verschluesseltOhneKonfig = false;
    if (!config.salt) {
      const dataPath = getDataPath();
      for (const datei of DATEN_DATEIEN) {
        try {
          const raw = fs.readFileSync(path.join(dataPath, datei), 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed && parsed._enc === true) {
            verschluesseltOhneKonfig = true;
            break;
          }
        } catch { /* Datei nicht vorhanden oder kein valides JSON – ok */ }
      }
    }

    res.json({
      data: {
        eingerichtet:            !!config.salt,
        gesperrt:                !isUnlocked(),
        encHintGesehen:          !!config.encHintGesehen,
        onboardingGesehen:       !!config.onboardingGesehen,
        verschluesseltOhneKonfig,
        // Pfad zur config.json damit das Frontend eine hilfreiche Meldung anzeigen kann
        ...(verschluesseltOhneKonfig && { configPfad: getConfigPath() }),
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** POST /api/auth/enc-hint-gesehen – Verschlüsselungs-Hinweis als gesehen markieren */
router.post('/enc-hint-gesehen', (req, res) => {
  try {
    writeConfig({ encHintGesehen: true });
    res.json({ data: { ok: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** POST /api/auth/onboarding-gesehen – Onboarding-Wizard als gesehen markieren */
router.post('/onboarding-gesehen', (req, res) => {
  try {
    writeConfig({ onboardingGesehen: true });
    res.json({ data: { ok: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** POST /api/auth/setup – Ersteinrichtung: Passwort wählen + alle Daten verschlüsseln */
router.post('/setup', async (req, res) => {
  try {
    const { passwort } = req.body;

    if (!passwort || passwort.length < 4) {
      return res.status(400).json({ data: null, error: 'Passwort muss mindestens 4 Zeichen haben.' });
    }

    const config = readConfig();
    if (config.salt) {
      return res.status(409).json({ data: null, error: 'Passwort bereits eingerichtet.' });
    }

    // Salt erzeugen + Schlüssel ableiten
    const salt = generateSalt();
    const key  = await deriveKey(passwort, salt);

    // Bestehende Klartextdateien einlesen (Schlüssel noch nicht gesetzt!)
    const allesDaten = {};
    for (const datei of DATEN_DATEIEN) {
      try { allesDaten[datei] = readFile(datei); } catch { allesDaten[datei] = []; }
    }

    // Verifier erstellen (verschlüsselter Bekanntwert zum späteren Passwort-Check)
    const verifier = encrypt(key, VERIFIER_PLAIN);

    // Salt + Verifier in config.json speichern (nie den Schlüssel selbst!)
    writeConfig({ salt, verifier });

    // Schlüssel aktivieren + Setup als erledigt markieren
    setKey(key);
    setSetupDone(true);

    // Alle Datendateien verschlüsselt neu schreiben
    for (const datei of DATEN_DATEIEN) {
      writeFile(datei, allesDaten[datei]);
    }

    res.json({ data: { entsperrt: true }, error: null });
  } catch (err) {
    clearKey();
    res.status(500).json({ data: null, error: err.message });
  }
});

/** POST /api/auth/unlock – Passwort prüfen und Schlüssel in RAM laden */
router.post('/unlock', async (req, res) => {
  try {
    const { passwort } = req.body;

    if (!passwort) {
      return res.status(400).json({ data: null, error: 'Passwort fehlt.' });
    }

    const config = readConfig();
    if (!config.salt || !config.verifier) {
      return res.status(400).json({ data: null, error: 'Kein Passwort eingerichtet.' });
    }

    // Schlüssel aus Passwort + gespeichertem Salt ableiten
    const key = await deriveKey(passwort, config.salt);

    // Verifier entschlüsseln – schlägt bei falschem Passwort fehl (Auth-Tag-Fehler)
    let plain;
    try {
      plain = decrypt(key, config.verifier);
    } catch {
      return res.status(401).json({ data: null, error: 'Falsches Passwort.' });
    }

    if (plain !== VERIFIER_PLAIN) {
      return res.status(401).json({ data: null, error: 'Falsches Passwort.' });
    }

    setKey(key);
    res.json({ data: { entsperrt: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

/** POST /api/auth/lock – Schlüssel aus RAM löschen (App sperren) */
router.post('/lock', (req, res) => {
  clearKey();
  res.json({ data: { gesperrt: true }, error: null });
});

/** POST /api/auth/remove – Passwortschutz entfernen (Daten entschlüsseln, Salt löschen) */
router.post('/remove', async (req, res) => {
  try {
    const { passwort } = req.body;
    const config = readConfig();

    if (!config.salt || !config.verifier) {
      return res.status(400).json({ data: null, error: 'Kein Passwort eingerichtet.' });
    }

    // Aktuelles Passwort prüfen
    const key = await deriveKey(passwort, config.salt);
    let plain;
    try { plain = decrypt(key, config.verifier); } catch {
      return res.status(401).json({ data: null, error: 'Falsches Passwort.' });
    }
    if (plain !== VERIFIER_PLAIN) {
      return res.status(401).json({ data: null, error: 'Falsches Passwort.' });
    }

    // Alle Datendateien entschlüsseln und als Klartext zurückschreiben
    for (const datei of DATEN_DATEIEN) {
      try {
        const daten = readFile(datei);   // liest verschlüsselt (Schlüssel noch aktiv)
        clearKey();                       // Schlüssel vorübergehend entfernen
        writeFile(datei, daten);          // schreibt Klartext
        setKey(key);                      // Schlüssel zurücksetzen für nächste Datei
      } catch { /* Datei nicht vorhanden – überspringen */ }
    }

    clearKey();
    setSetupDone(false);

    // Salt + Verifier aus config.json entfernen
    writeConfig({ salt: null, verifier: null });

    res.json({ data: { entfernt: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
