/**
 * Generisches JSON-Dateisystem für alle Datendateien.
 * Liest den konfigurierbaren Datenpfad aus config.json.
 * Fällt auf ./data zurück wenn kein Pfad gesetzt ist.
 *
 * Wenn ein Schlüssel im keyStore liegt, werden Datendateien
 * automatisch verschlüsselt gelesen und geschrieben (AES-256-GCM).
 */

const fs = require('fs');
const path = require('path');
const { getKey } = require('./keyStore');
const { encrypt, decrypt } = require('./crypto');

const CONFIG_PATH = path.join(__dirname, '../../config.json');
const DEFAULT_DATA_PATH = path.join(__dirname, '../../data');

/**
 * Gibt den aktuell konfigurierten Datenpfad zurück.
 * @returns {string} Absoluter Pfad zum Datenverzeichnis
 */
function getDataPath() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return config.datenpfad && config.datenpfad.trim() !== ''
      ? config.datenpfad
      : DEFAULT_DATA_PATH;
  } catch {
    return DEFAULT_DATA_PATH;
  }
}

/**
 * Liest eine JSON-Datei aus dem Datenverzeichnis.
 * Wenn die Datei verschlüsselt ist (_enc: true), wird sie mit dem
 * aktiven Schlüssel aus dem keyStore entschlüsselt.
 * @param {string} filename - Dateiname, z.B. "ausgaben.json"
 * @returns {Array} Gelesene Daten
 */
function readFile(filename) {
  const filePath = path.join(getDataPath(), filename);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (parsed && parsed._enc === true) {
    // Verschlüsselte Datei – entschlüsseln
    const key = getKey();
    if (!key) throw new Error('Datei ist verschlüsselt, aber kein Schlüssel im Speicher.');
    return JSON.parse(decrypt(key, parsed));
  }

  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Schreibt Daten als JSON-Datei in das Datenverzeichnis.
 * Wenn ein Schlüssel im keyStore liegt, wird verschlüsselt geschrieben.
 * @param {string} filename - Dateiname
 * @param {Array} data      - Zu schreibende Daten
 */
function writeFile(filename, data) {
  const dir = getDataPath();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, filename);
  const key = getKey();

  if (key) {
    // Verschlüsselt speichern
    const envelope = encrypt(key, JSON.stringify(data, null, 2));
    fs.writeFileSync(filePath, JSON.stringify({ _enc: true, ...envelope }, null, 2), 'utf8');
  } else {
    // Kein Passwort gesetzt – Klartext
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}

/**
 * Liest die gesamte config.json und gibt sie zurück.
 * config.json ist IMMER Klartext (enthält Salt aber keinen Schlüssel).
 * @returns {{ datenpfad: string, kontenReihenfolge: string[], kategorienReihenfolge: string[], salt: string|null, verifier: object|null }}
 */
function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const cfg = JSON.parse(raw);
    return {
      datenpfad:             cfg.datenpfad ?? '',
      kontenReihenfolge:     Array.isArray(cfg.kontenReihenfolge)     ? cfg.kontenReihenfolge     : [],
      kategorienReihenfolge: Array.isArray(cfg.kategorienReihenfolge) ? cfg.kategorienReihenfolge : [],
      salt:                  cfg.salt              ?? null,
      verifier:              cfg.verifier          ?? null,
      encHintGesehen:        cfg.encHintGesehen    ?? false,
      onboardingGesehen:     cfg.onboardingGesehen ?? false,
    };
  } catch {
    return {
      datenpfad: '', kontenReihenfolge: [], kategorienReihenfolge: [],
      salt: null, verifier: null, encHintGesehen: false, onboardingGesehen: false,
    };
  }
}

/**
 * Schreibt Felder in config.json (merge, kein Überschreiben nicht-gelisteter Keys).
 * @param {{ datenpfad?: string, kontenReihenfolge?: string[], kategorienReihenfolge?: string[] }} updates
 */
function writeConfig(updates) {
  let current = {};
  try { current = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { /* ok */ }
  const merged = { ...current, ...updates };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf8');
}

module.exports = { readFile, writeFile, getDataPath, readConfig, writeConfig };
