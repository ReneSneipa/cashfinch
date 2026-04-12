/**
 * Statische Optionen die nicht konfigurierbar sind.
 * Konten und Kategorien werden dynamisch über die API geladen (server/routes/).
 */

export const RHYTHMUS_OPTIONEN = [
  { wert: 'M', label: 'M', beschreibung: 'monatlich' },
  { wert: 'Q', label: 'Q', beschreibung: 'quartalsweise' },
  { wert: 'J', label: 'J', beschreibung: 'jährlich' },
];
