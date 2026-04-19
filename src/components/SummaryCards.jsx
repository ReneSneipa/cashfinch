/**
 * Die drei oberen Übersichtskarten:
 * Einnahmen | Fixkosten gesamt | Verbleibend
 */

import { formatBetrag } from '../utils/formatierung.js';
import {
  berechneGesamteinnahmen,
  berechneGesamtkosten,
  berechneEffektiveKosten,
} from '../utils/berechnungen.js';

const cardBase = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  padding: '22px 24px',
  position: 'relative',
  overflow: 'hidden',
};

// Dezente Top-Highlight-Linie wie im Mockup
const CardHighlight = () => (
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
    pointerEvents: 'none',
  }} />
);

export default function SummaryCards({ einnahmen, ausgaben, konten = [] }) {
  const gesamtEinnahmen = berechneGesamteinnahmen(einnahmen);
  const berechnet = berechneGesamtkosten(ausgaben);
  const gesamtKosten = konten.length > 0 ? berechneEffektiveKosten(ausgaben, konten) : berechnet;
  const verbleibend = gesamtEinnahmen - gesamtKosten;
  const anteilKosten = gesamtEinnahmen > 0
    ? ((gesamtKosten / gesamtEinnahmen) * 100).toFixed(1)
    : 0;
  const anteilVerbleibend = gesamtEinnahmen > 0
    ? ((verbleibend / gesamtEinnahmen) * 100).toFixed(1)
    : 0;
  const anzahlAktiv = ausgaben.filter((a) => a.aktiv).length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
      {/* Einnahmen */}
      <div style={cardBase}>
        <CardHighlight />
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-2)', marginBottom: 14 }}>
          Einnahmen
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-1.2px', lineHeight: 1, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
          {formatBetrag(gesamtEinnahmen)}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 8 }}>
          {einnahmen.filter((e) => e.aktiv).length} Quelle{einnahmen.filter((e) => e.aktiv).length !== 1 ? 'n' : ''}
        </div>
      </div>

      {/* Fixkosten */}
      <div style={cardBase}>
        <CardHighlight />
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-2)', marginBottom: 14 }}>
          Fixkosten / Monat
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-1.2px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {formatBetrag(gesamtKosten)}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 8 }}>
          {anzahlAktiv} Positionen · {anteilKosten} % vom Einkommen
        </div>
      </div>

      {/* Verbleibend */}
      <div style={cardBase}>
        <CardHighlight />
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-2)', marginBottom: 14 }}>
          Verbleibend
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-1.2px', lineHeight: 1, color: 'var(--blue)', fontVariantNumeric: 'tabular-nums' }}>
          {formatBetrag(verbleibend)}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            background: 'var(--green-glow)', color: 'var(--green)',
            border: '1px solid rgba(48,209,88,0.2)',
            borderRadius: 20, padding: '1px 7px',
            fontSize: 11, fontWeight: 600,
          }}>
            ↑ {anteilVerbleibend} %
          </span>
          für Budgets verfügbar
        </div>
      </div>
    </div>
  );
}
