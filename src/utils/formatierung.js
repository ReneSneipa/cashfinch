/**
 * Hilfsfunktionen für die Formatierung von Zahlen und Text.
 */

/**
 * Formatiert einen Geldbetrag nach deutschem Standard.
 * Beispiel: 1234.5 → "1.234,50 €"
 * @param {number} betrag
 * @returns {string}
 */
export function formatBetrag(betrag) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(betrag);
}

/**
 * Gibt die lesbare Bezeichnung für einen Rhythmus-Code zurück.
 * @param {"M"|"Q"|"J"} rhythmus
 * @returns {string}
 */
export function formatRhythmus(rhythmus) {
  const map = { M: 'Monatlich', Q: 'Quartalsweise', J: 'Jährlich' };
  return map[rhythmus] ?? rhythmus;
}
