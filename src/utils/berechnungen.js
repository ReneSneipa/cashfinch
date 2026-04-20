/**
 * Fachliche Berechnungslogik für cashfinch.
 *
 * Regeln:
 * - Rhythmus M: × 1  | Q: × 1/3  | J: × 1/12
 * - geteilt: true → × 0.5 (50/50 WG-Splitting)
 * - Nur aktive Einträge werden berücksichtigt
 */

/** Umrechnungsfaktoren: Originalbetrag → Monatsbetrag */
const RHYTHMUS_FAKTOR = {
  M: 1,
  Q: 1 / 3,
  J: 1 / 12,
};

/**
 * Berechnet den monatlichen Nettobetrag einer Ausgabe.
 * Berücksichtigt Rhythmus und Geteilt-Flag.
 * @param {Object} ausgabe
 * @returns {number} Monatsbetrag
 */
export function berechneMonatsbetrag(ausgabe) {
  const faktor = RHYTHMUS_FAKTOR[ausgabe.rhythmus] ?? 1;
  const brutto = ausgabe.betrag * faktor;
  return ausgabe.geteilt ? brutto * 0.5 : brutto;
}

/**
 * Summiert alle monatlichen Nettobeträge der aktiven Ausgaben.
 * @param {Array} ausgaben
 * @returns {number}
 */
export function berechneGesamtkosten(ausgaben) {
  return ausgaben
    .filter((a) => a.aktiv)
    .reduce((sum, a) => sum + berechneMonatsbetrag(a), 0);
}

/**
 * Summiert alle aktiven Einnahmen.
 * @param {Array} einnahmen
 * @returns {number}
 */
export function berechneGesamteinnahmen(einnahmen) {
  return einnahmen
    .filter((e) => e.aktiv)
    .reduce((sum, e) => sum + e.betrag, 0);
}

/**
 * Gruppiert Ausgaben nach Kategorie und berechnet die monatliche Summe je Gruppe.
 * Kategorien mit einem Anteil unter dem Schwellwert werden als "Sonstige" zusammengefasst.
 *
 * @param {Array} ausgaben
 * @param {number} schwellwert - Mindestanteil (0–1), Default: 0.03 (3%)
 * @returns {Array<{name: string, value: number}>}
 */
export function gruppiereNachKategorie(ausgaben, schwellwert = 0.03) {
  // Monatssummen pro Kategorie berechnen
  const gruppen = {};
  ausgaben
    .filter((a) => a.aktiv)
    .forEach((a) => {
      const mb = berechneMonatsbetrag(a);
      gruppen[a.kategorie] = (gruppen[a.kategorie] ?? 0) + mb;
    });

  const total = Object.values(gruppen).reduce((s, v) => s + v, 0);
  if (total === 0) return [];

  // Kleine Kategorien in "Sonstige" zusammenfassen
  const ergebnis = [];
  let sonstige = 0;

  Object.entries(gruppen).forEach(([name, value]) => {
    if (value / total < schwellwert) {
      sonstige += value;
    } else {
      ergebnis.push({ name, value });
    }
  });

  if (sonstige > 0) {
    ergebnis.push({ name: 'Sonstige', value: sonstige });
  }

  // Absteigend sortieren
  return ergebnis.sort((a, b) => b.value - a.value);
}

/**
 * Gruppiert aktive Ausgaben nach Konto und berechnet Monatssumme + Anzahl je Konto.
 * Ergebnis absteigend nach Summe sortiert.
 *
 * @param {Array} ausgaben
 * @returns {Array<{konto: string, summe: number, anzahl: number, anteil: number}>}
 */
export function gruppiereNachKonto(ausgaben) {
  const aktive = ausgaben.filter((a) => a.aktiv);

  // Monatssummen und Anzahl pro Konto akkumulieren
  const gruppen = {};
  aktive.forEach((a) => {
    const konto = a.konto ?? 'Ohne Konto';
    if (!gruppen[konto]) gruppen[konto] = { summe: 0, anzahl: 0 };
    gruppen[konto].summe += berechneMonatsbetrag(a);
    gruppen[konto].anzahl += 1;
  });

  const gesamt = Object.values(gruppen).reduce((s, g) => s + g.summe, 0);

  return Object.entries(gruppen)
    .map(([konto, { summe, anzahl }]) => ({
      konto,
      summe,
      anzahl,
      anteil: gesamt > 0 ? (summe / gesamt) * 100 : 0,
    }))
    .sort((a, b) => b.summe - a.summe);
}

/**
 * Berechnet die effektiven monatlichen Fixkosten unter Beruecksichtigung von Dauerauftraegen.
 * Fuer Konten MIT Dauerauftrag: Dauerauftrag-Betrag statt berechneter Summe.
 * Konten MIT Dauerauftrag aber OHNE Ausgaben zaehlen ebenfalls (z.B. Sparkonto).
 * @param {Array} ausgaben
 * @param {Array} konten - Konten-Liste mit optionalem dauerauftrag-Feld
 * @returns {number}
 */
export function berechneEffektiveKosten(ausgaben, konten) {
  const nachKonto = gruppiereNachKonto(ausgaben);
  let gesamt = 0;
  nachKonto.forEach((g) => {
    const konto = konten.find((k) => k.name === g.konto);
    const da = konto?.dauerauftrag;
    gesamt += (da && da > 0) ? da : g.summe;
  });
  // Konten mit Dauerauftrag aber ohne Ausgaben (z.B. Sparkonto-Ruecklage)
  konten.forEach((k) => {
    if (k.dauerauftrag > 0 && !nachKonto.some((g) => g.konto === k.name)) {
      gesamt += k.dauerauftrag;
    }
  });
  return gesamt;
}

/**
 * Summiert alle Budget-Beträge.
 * @param {Array} budgets
 * @returns {number}
 */
export function berechneGesamtbudget(budgets) {
  return budgets.reduce((sum, b) => sum + b.betrag, 0);
}
