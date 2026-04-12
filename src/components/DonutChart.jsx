/**
 * Tortendiagramm (Donut) – Ausgaben nach Kategorie.
 * Beträge < 3% Anteil werden als "Sonstige" zusammengefasst.
 * Verwendet Recharts PieChart.
 */

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatBetrag } from '../utils/formatierung.js';
import { gruppiereNachKategorie, berechneGesamtkosten } from '../utils/berechnungen.js';

/** Farbe einer Kategorie dynamisch aus der Kategorien-Liste ermitteln */
function getFarbe(name, kategorien) {
  if (name === 'Sonstige') return '#48484a';
  return kategorien.find((k) => k.name === name)?.farbe ?? '#636366';
}

/** Eigenes Tooltip für Recharts */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border-strong)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{name}</div>
      <div style={{ color: 'var(--text-2)' }}>{formatBetrag(value)} / Monat</div>
    </div>
  );
}

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  padding: '22px 24px',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
};

export default function DonutChart({ ausgaben, kategorien = [], kategorienReihenfolge = [] }) {
  const gesamt = berechneGesamtkosten(ausgaben);
  const rohSegmente = gruppiereNachKategorie(ausgaben).map((s) => ({
    ...s,
    farbe: getFarbe(s.name, kategorien),
  }));

  // Segmente nach konfigurierter Reihenfolge sortieren; "Sonstige" kommt immer ans Ende
  const segmente = kategorienReihenfolge.length > 0
    ? [
        ...kategorienReihenfolge
          .map((name) => rohSegmente.find((s) => s.name === name))
          .filter(Boolean),
        ...rohSegmente.filter((s) => s.name === 'Sonstige'),
        ...rohSegmente.filter((s) => s.name !== 'Sonstige' && !kategorienReihenfolge.includes(s.name)),
      ]
    : rohSegmente;

  return (
    <div style={cardStyle}>
      {/* Top Highlight */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        pointerEvents: 'none',
      }} />

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Nach Kategorie</div>

      {segmente.length === 0 ? (
        <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          Noch keine Ausgaben vorhanden.
        </div>
      ) : (
        <>
          {/* Donut */}
          <div style={{ position: 'relative', height: 160, marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={segmente}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={68}
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                >
                  {segmente.map((seg, i) => (
                    <Cell key={i} fill={seg.farbe} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Mittig: Gesamtbetrag */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center', pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(gesamt)} €
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 1 }}>/ Monat</div>
            </div>
          </div>

          {/* Legende */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {segmente.map((seg, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.farbe, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-2)' }}>{seg.name}</span>
                </div>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatBetrag(seg.value)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
