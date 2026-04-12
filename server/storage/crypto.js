/**
 * AES-256-GCM Verschlüsselungs-Helpers für cashfinch.
 *
 * Schlüsselableitung: scrypt (N=32768, r=8, p=1) – resistent gegen Brute-Force.
 * Verschlüsselung: AES-256-GCM – authentifizierte Verschlüsselung (Manipulation erkennbar).
 *
 * Alle Hex-Strings sind sicher für JSON-Serialisierung.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LEN    = 32;  // 256 bit
const IV_LEN     = 12;  // 96 bit (GCM-Standard)
const SALT_LEN   = 32;  // 256 bit

// scrypt-Parameter: N=16384 (2^14) – sicher und speicherschonend (~16 MB)
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };

/**
 * Erzeugt ein kryptografisch zufälliges Salt als Hex-String.
 * @returns {string}
 */
function generateSalt() {
  return crypto.randomBytes(SALT_LEN).toString('hex');
}

/**
 * Leitet einen AES-256-Schlüssel aus Passwort + Salt ab (scrypt).
 * @param {string} password - Klartextpasswort
 * @param {string} saltHex  - Hex-kodiertes Salt (aus generateSalt)
 * @returns {Promise<Buffer>} 32-Byte-Schlüssel
 */
function deriveKey(password, saltHex) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      Buffer.from(saltHex, 'hex'),
      KEY_LEN,
      SCRYPT_OPTS,
      (err, key) => (err ? reject(err) : resolve(key))
    );
  });
}

/**
 * Verschlüsselt einen Klartext-String mit AES-256-GCM.
 * @param {Buffer} key       - 32-Byte-Schlüssel
 * @param {string} plaintext - Zu verschlüsselnder Text
 * @returns {{ iv: string, tag: string, data: string }} Alle Felder Hex-kodiert
 */
function encrypt(key, plaintext) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final(),
  ]);
  return {
    iv:   iv.toString('hex'),
    tag:  cipher.getAuthTag().toString('hex'),
    data: encrypted.toString('hex'),
  };
}

/**
 * Entschlüsselt ein { iv, tag, data }-Objekt mit AES-256-GCM.
 * Wirft einen Fehler wenn Tag-Prüfung fehlschlägt (falsches Passwort / Manipulation).
 * @param {Buffer} key                          - 32-Byte-Schlüssel
 * @param {{ iv: string, tag: string, data: string }} envelope
 * @returns {string} Klartext
 */
function decrypt(key, { iv, tag, data }) {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { generateSalt, deriveKey, encrypt, decrypt };
