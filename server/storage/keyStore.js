/**
 * In-Memory Singleton für den aktiven Verschlüsselungs-Key.
 *
 * Der Schlüssel lebt ausschließlich im RAM – er wird nie auf die Festplatte
 * geschrieben und geht bei jedem Server-Neustart verloren. Der Nutzer muss
 * das Passwort dann erneut eingeben.
 */

let _key = null;         // aktiver AES-256-Schlüssel (Buffer) oder null
let _setupDone = false;  // wurde Verschlüsselung überhaupt eingerichtet?

/** Setzt den aktiven Schlüssel nach erfolgreichem Entsperren. */
function setKey(key)          { _key = key; }

/** Gibt den aktiven Schlüssel zurück (null wenn gesperrt). */
function getKey()             { return _key; }

/** Löscht den Schlüssel aus dem RAM (App sperren). */
function clearKey()           { _key = null; }

/** true wenn ein Schlüssel im RAM liegt (App entsperrt). */
function isUnlocked()         { return _key !== null; }

/** Merkt, ob Verschlüsselung eingerichtet wurde (Salt in config.json vorhanden). */
function setSetupDone(done)   { _setupDone = done; }

/** true wenn Verschlüsselung eingerichtet ist. */
function isSetupDone()        { return _setupDone; }

module.exports = { setKey, getKey, clearKey, isUnlocked, setSetupDone, isSetupDone };
