/**
 * Konto-Aufschlüsselung – Dashboard-Karte mit dynamischem Grid.
 * Zeigt alle vorhandenen Konten als Kacheln (3 pro Zeile, auto-wrap).
 * Farbpalette wird zyklisch zugewiesen, Fortschrittsbalken zeigt Anteil an Fixkosten.
 */

import { formatBetrag } from '../utils/formatierung.js';
import { gruppiereNachKonto } from '../utils/berechnungen.js';

/** Farbpalette – zyklisch vergeben wenn mehr Konten als Farben */
const KONTO_FARBEN = [
  '#5ac8fa', // Blau
  '#30d158', // Grün
  '#ff9f0a', // Orange
  '#bf5af2', // Lila
  '#0a84ff', // Dunkelblau
  '#ff453a', // Rot
  '#ffd60a', // Gelb
  '#64d2ff', // Hellblau
];

function getFarbe(index) {
  return KONTO_FARBEN[index % KONTO_FARBEN.length];
}

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  position: 'relative',
  overflow: 'hidden',
};

export default function KontoAufschlüsselung({ ausgaben }) {
  const konten = gruppiereNachKonto(ausgaben);
  const spalten = 3;

  if (konten.length === 0) {
    return (
      <div style={{ ...cardStyle, padding: '22px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Nach Konto</div>
        <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          Noch keine Ausgaben vorhanden.
        </div>
      </div>
    );
  }

  const letzteZeileStart = konten.length - ((konten.length % spalten) || spalten);

  return (
    <div style={cardStyle}>
      {/* Top Highlight */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ padding: '18px 24px 0', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
        Nach Konto
      </div>

      {/* Konto-Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${spalten}, 1fr)`,
      }}>
        {konten.map((k, i) => {
          const farbe = getFarbe(i);
          const istLetzteZeile = i >= letzteZeileStart;
          const istLetzteSpalte = (i + 1) % spalten === 0 || i === konten.length - 1;

          return (
            <div
              key={k.konto}
              style={{
                padding: '20px 24px',
                borderRight: istLetzteSpalte ? 'none' : '1px solid var(--border)',
                borderBottom: istLetzteZeile ? 'none' : '1px solid var(--border)',
              }}
            >
              {/* Label-Zeile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: farbe, flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.7px',
                  color: 'var(--text-2)',
                }}>
                  {k.konto}
                </span>
              </div>

              {/* Betrag */}
              <div style={{
                fontSize: 22, fontWeight: 700,
                letterSpacing: '-0.8px', lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                marginBottom: 6,
              }}>
                {formatBetrag(k.summe)}
              </div>

              {/* Meta */}
              <div style={{
                fontSize: 11, color: 'var(--text-2)',
                marginBottom: 12,
              }}>
                {k.anzahl} Position{k.anzahl !== 1 ? 'en' : ''} · {k.anteil.toFixed(1)} % der Fixkosten
              </div>

              {/* Fortschrittsbalken */}
              <div style={{
                height: 3, background: 'var(--surface-2)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(k.anteil, 100)}%`,
                  background: farbe,
                  borderRadius: 2,
                  transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
