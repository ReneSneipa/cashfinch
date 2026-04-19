/**
 * Generisches JSON-Dateisystem für alle Datendateien.
 * Liest den konfigurierbaren Datenpfad aus config.json.
 * Fällt auf ./data zurück wenn kein Pfad gesetzt ist.
 *
 * Wenn ein Schlüssel im keyStore liegt, werden Datendateien
 * automatisch verschlüsselt gelesen und geschrieben (AES-256-GCM).
 *
 * config.json Pointer-Logik:
 *   ./data/config.json ist immer der Einstiegspunkt (Boot-Datei).
 *   Ist kein datenpfad gesetzt, enthält sie die vollständige Konfiguration.
 *   Ist ein datenpfad gesetzt, enthält sie nur { datenpfad } als Pointer –
 *   die vollständige config liegt dann unter datenpfad/config.json.
 *   Damit wandert die config immer zusammen mit den Datendateien.
 */

const fs = require('fs');
const path = require('path');
const { getKey } = require('./keyStore');
const { encrypt, decrypt } = require('./crypto');

const DEFAULT_DATA_PATH = path.join(__dirname, '../../data');
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_DATA_PATH, 'config.json');

// Einmal-Migration: config.json von altem Speicherort (./config.json) in den data-Ordner verschieben.
// Läuft nur wenn die neue Datei noch nicht existiert aber die alte noch vorhanden ist.
(function migrateConfigOnce() {
  const legacyPath = path.join(__dirname, '../../config.json');
  if (!fs.existsSync(DEFAULT_CONFIG_PATH) && fs.existsSync(legacyPath)) {
    try {
      if (!fs.existsSync(DEFAULT_DATA_PATH)) fs.mkdirSync(DEFAULT_DATA_PATH, { recursive: true });
      fs.copyFileSync(legacyPath, DEFAULT_CONFIG_PATH);
      fs.unlinkSync(legacyPath);
    } catch { /* Fehler ignorieren – App startet auch ohne Migration */ }
  }
}());

/**
 * Gibt den Pfad zur aktiven config.json zurück.
 * Liest DEFAULT_CONFIG_PATH als Pointer: ist dort ein datenpfad gesetzt,
 * liegt die vollständige config in datenpfad/config.json.
 * @returns {string} Absoluter Pfad zur aktiven config.json
 */
function getConfigPath() {
  try {
    const pointer = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8'));
    if (pointer.datenpfad && pointer.datenpfad.trim() !== '') {
      return path.join(pointer.datenpfad.trim(), 'config.json');
    }
  } catch { /* ok */ }
  return DEFAULT_CONFIG_PATH;
}

/**
 * Gibt den aktuell konfigurierten Datenpfad zurück.
 * @returns {string} Absoluter Pfad zum Datenverzeichnis
 */
function getDataPath() {
  try {
    // Immer den lokalen Pointer lesen – nicht die synced config.
    // Der Pointer ist OS-spezifisch und enthält den korrekten Pfad für diese Maschine.
    // So funktioniert Cross-OS-Sync (z.B. OneDrive) ohne Pfad-Konflikte.
    const pointer = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8'));
    if (pointer.datenpfad && pointer.datenpfad.trim() !== '') {
      return pointer.datenpfad.trim();
    }
  } catch { /* ok */ }
  return DEFAULT_DATA_PATH;
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
    const raw = fs.readFileSync(getConfigPath(), 'utf8');
    const cfg = JSON.parse(raw);
    // datenpfad immer aus dem lokalen Pointer lesen (OS-spezifisch),
    // nicht aus der ggf. synchronisierten config im Datenordner.
    let datenpfad = '';
    try {
      const pointer = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8'));
      datenpfad = pointer.datenpfad ?? '';
    } catch { /* ok */ }
    return {
      datenpfad,
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
 * Schreibt Felder in die aktive config.json (merge, kein Überschreiben nicht-gelisteter Keys).
 * Für Datenpfad-Wechsel stattdessen migrateDatapfad() verwenden.
 * @param {object} updates
 */
function writeConfig(updates) {
  const configPath = getConfigPath();
  let current = {};
  try { current = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch { /* ok */ }
  const merged = { ...current, ...updates };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
}

/**
 * Verschiebt die vollständige config.json wenn der Datenpfad geändert wird.
 * Setzt das Pointer-Prinzip um: DEFAULT_CONFIG_PATH enthält nur { datenpfad }
 * wenn ein custom Pfad aktiv ist; die vollständige config liegt beim Datenordner.
 * @param {string} neuerPfad - Neuer Datenpfad (leer = Standard ./data zurücksetzen)
 * @param {boolean} [behalteZielConfig=false] - Wenn true und eine config.json im Ziel
 *   bereits existiert, wird diese nicht überschrieben (Szenario: vorhandene Daten verwenden)
 */
function migrateDatapfad(neuerPfad, behalteZielConfig = false) {
  const normalizedPfad = neuerPfad ? neuerPfad.trim() : '';

  // Vollständige aktuelle config lesen (aus aktuellem Speicherort)
  let fullConfig = {};
  try { fullConfig = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8')); } catch { /* ok */ }

  if (normalizedPfad !== '') {
    // Wechsel zu custom Datenpfad:
    const newConfigPath = path.join(normalizedPfad, 'config.json');
    // config.json im Ziel nur schreiben wenn nicht bereits vorhanden (oder Überschreiben erlaubt)
    if (!behalteZielConfig || !fs.existsSync(newConfigPath)) {
      // datenpfad NICHT in die synced config schreiben – er ist OS-spezifisch
      // und gehört nur in den lokalen Pointer (DEFAULT_CONFIG_PATH).
      const { datenpfad: _dp, ...sharedConfig } = fullConfig;
      fs.writeFileSync(newConfigPath, JSON.stringify({ ...sharedConfig, datenpfad: '' }, null, 2), 'utf8');
    }
    // DEFAULT_CONFIG_PATH nur noch als Pointer behalten
    if (!fs.existsSync(DEFAULT_DATA_PATH)) fs.mkdirSync(DEFAULT_DATA_PATH, { recursive: true });
    fs.writeFileSync(DEFAULT_CONFIG_PATH, JSON.stringify({ datenpfad: normalizedPfad }, null, 2), 'utf8');
  } else {
    // Zurück zu Standard (./data):
    // Vollständige config ohne datenpfad in DEFAULT_CONFIG_PATH schreiben
    const { datenpfad: _removed, ...rest } = fullConfig;
    fs.writeFileSync(DEFAULT_CONFIG_PATH, JSON.stringify({ ...rest, datenpfad: '' }, null, 2), 'utf8');
  }
}

module.exports = { readFile, writeFile, getDataPath, getDefaultDataPath: () => DEFAULT_DATA_PATH, getConfigPath, readConfig, writeConfig, migrateDatapfad };
