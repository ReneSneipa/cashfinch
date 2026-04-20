/**
 * Budget-Karte mit Fortschrittsbalken.
 * Zeigt alle definierten Budgets und wie viel des verfügbaren Betrags sie ausmachen.
 */

import { formatBetrag } from '../utils/formatierung.js';
import {
  berechneGesamteinnahmen,
  berechneGesamtkosten,
  berechneEffektiveKosten,
  berechneGesamtbudget,
} from '../utils/berechnungen.js';

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  padding: '22px 24px',
  position: 'relative',
  overflow: 'hidden',
};

export default function BudgetCard({ einnahmen, ausgaben, budgets, konten = [] }) {
  const kosten = konten.length > 0 ? berechneEffektiveKosten(ausgaben, konten) : berechneGesamtkosten(ausgaben);
  const verfuegbar = berechneGesamteinnahmen(einnahmen) - kosten;
  const zugewiesen = berechneGesamtbudget(budgets);
  const nichtZugewiesen = verfuegbar - zugewiesen;

  return (
    <div style={cardStyle}>
      {/* Top Highlight */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Budgets</div>
        {verfuegbar > 0 && (
          <div style={{
            fontSize: 11, fontWeight: 600,
            background: nichtZugewiesen >= 0 ? 'rgba(10,132,255,0.1)' : 'rgba(255,69,58,0.1)',
            color: nichtZugewiesen >= 0 ? 'var(--blue)' : 'var(--red)',
            border: `1px solid ${nichtZugewiesen >= 0 ? 'rgba(10,132,255,0.2)' : 'rgba(255,69,58,0.2)'}`,
            borderRadius: 20,
            padding: '3px 10px',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {nichtZugewiesen >= 0 ? '+' : ''}{formatBetrag(nichtZugewiesen)} nicht zugewiesen
          </div>
        )}
      </div>

      {/* Budget-Einträge */}
      {budgets.length === 0 ? (
        <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          Noch keine Budgets angelegt.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {budgets.map((budget) => {
            const anteil = verfuegbar > 0 ? (budget.betrag / verfuegbar) * 100 : 0;
            return (
              <div key={budget.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{budget.name}</span>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                      {formatBetrag(budget.betrag)}
                    </span>
                    <span>/ {formatBetrag(verfuegbar)}</span>
                  </div>
                </div>
                {/* Fortschrittsbalken */}
                <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(anteil, 100)}%`,
                    background: budget.farbe ?? 'var(--blue)',
                    borderRadius: 2,
                    transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
