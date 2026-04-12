/**
 * Express-Middleware: blockiert alle geschützten Routen mit HTTP 423
 * wenn Verschlüsselung eingerichtet ist, aber noch kein Schlüssel im RAM liegt.
 *
 * Wenn Verschlüsselung NICHT eingerichtet ist (kein Salt), wird die
 * Anfrage ohne Prüfung durchgelassen (Plaintext-Modus).
 */

const { isUnlocked, isSetupDone } = require('../storage/keyStore');

module.exports = function requireUnlocked(req, res, next) {
  // Verschlüsselung nicht eingerichtet → App läuft im Plaintext-Modus
  if (!isSetupDone()) return next();

  // Eingerichtet aber gesperrt → ablehnen
  if (!isUnlocked()) {
    return res.status(423).json({ data: null, error: 'Gesperrt. Bitte Passwort eingeben.' });
  }

  next();
};
