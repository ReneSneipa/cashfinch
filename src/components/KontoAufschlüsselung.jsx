/**
 * Konto-Aufschlüsselung – Dashboard-Karte mit dynamischem Grid.
 * Zeigt alle vorhandenen Konten als Kacheln (3 pro Zeile, auto-wrap).
 * Farbpalette wird zyklisch zugewiesen, Fortschrittsbalken zeigt Anteil an Fixkosten.
 * Unterstützt Daueraufträge: Doppelklick auf Betrag zum Setzen eines festen Monatswerts.
 */

import { useState } from 'react';
import { formatBetrag } from '../utils/formatierung.js';
import { gruppiereNachKonto, berechneEffektiveKosten } from '../utils/berechnungen.js';
import { kontenApi } from '../api/api.js';

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

export default function KontoAufschlüsselung({ ausgaben, konten = [], onUpdate }) {
  const [editKonto, setEditKonto] = useState(null);
  const [editWert, setEditWert] = useState('');

  const gruppiert = gruppiereNachKonto(ausgaben);

  // Alle Konten anzeigen – auch solche ohne Ausgaben (fuer Dauerauftrag-Einrichtung)
  const ohneAusgaben = konten.filter(
    (k) => !gruppiert.some((g) => g.konto === k.name)
  );
  const alleKonten = [
    ...gruppiert,
    ...ohneAusgaben.map((k) => ({ konto: k.name, summe: 0, anzahl: 0, anteil: 0 })),
  ];

  // Effektive Gesamtkosten fuer Anteil-Berechnung
  const effektivGesamt = berechneEffektiveKosten(ausgaben, konten);

  const spalten = 3;

  const handleSave = async (kontoName) => {
    const konto = konten.find((k) => k.name === kontoName);
    if (!konto) { setEditKonto(null); return; }
    const wert = editWert.trim() === '' ? 0 : parseFloat(editWert.replace(',', '.'));
    if (isNaN(wert)) { setEditKonto(null); return; }
    await kontenApi.update(konto.id, { dauerauftrag: wert });
    setEditKonto(null);
    onUpdate?.();
  };

  if (alleKonten.length === 0) {
    return (
      <div style={{ ...cardStyle, padding: '22px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Nach Konto</div>
        <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          Noch keine Ausgaben vorhanden.
        </div>
      </div>
    );
  }

  const letzteZeileStart = alleKonten.length - ((alleKonten.length % spalten) || spalten);

  return (
    <div style={cardStyle}>
      {/* Top Highlight */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ padding: '18px 24px 0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Nach Konto</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Doppelklick auf Betrag = Dauerauftrag setzen/entfernen</span>
      </div>

      {/* Konto-Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${spalten}, 1fr)`,
      }}>
        {alleKonten.map((k, i) => {
          const farbe = getFarbe(i);
          const istLetzteZeile = i >= letzteZeileStart;
          const istLetzteSpalte = (i + 1) % spalten === 0 || i === alleKonten.length - 1;

          const kontoObj = konten.find((ko) => ko.name === k.konto);
          const da = kontoObj?.dauerauftrag;
          const hatDa = da && da > 0;
          const anzeigeBetrag = hatDa ? da : k.summe;
          const anteil = effektivGesamt > 0 ? (anzeigeBetrag / effektivGesamt) * 100 : 0;
          const puffer = hatDa ? da - k.summe : 0;
          const isEditing = editKonto === k.konto;

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
                {hatDa && !isEditing && (
                  <span style={{
                    fontSize: 9, fontWeight: 600,
                    color: 'var(--blue)', background: 'rgba(10,132,255,0.1)',
                    border: '1px solid rgba(10,132,255,0.2)',
                    borderRadius: 4, padding: '1px 5px',
                    marginLeft: 'auto',
                  }}>
                    Dauerauftrag
                  </span>
                )}
              </div>

              {/* Betrag / Edit */}
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <input
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    value={editWert}
                    onChange={(e) => setEditWert(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(k.konto);
                      if (e.key === 'Escape') setEditKonto(null);
                    }}
                    onBlur={() => handleSave(k.konto)}
                    placeholder="Leer = entfernen"
                    style={{
                      fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                      width: 120, padding: '2px 8px',
                      background: 'var(--surface-2)', color: 'var(--text)',
                      border: '1px solid var(--blue)', borderRadius: 6,
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-2)' }}>EUR</span>
                </div>
              ) : (
                <div
                  onDoubleClick={() => {
                    setEditKonto(k.konto);
                    setEditWert(hatDa ? da.toFixed(2).replace('.', ',') : k.summe.toFixed(2).replace('.', ','));
                  }}
                  title="Doppelklick: Dauerauftrag setzen"
                  style={{
                    fontSize: 22, fontWeight: 700,
                    letterSpacing: '-0.8px', lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    marginBottom: 6, cursor: 'text',
                  }}
                >
                  {formatBetrag(anzeigeBetrag)}
                </div>
              )}

              {/* Meta */}
              <div style={{
                fontSize: 11, color: 'var(--text-2)',
                marginBottom: 12,
              }}>
                {hatDa ? (
                  <>
                    {k.anzahl > 0 && <>{k.anzahl} Position{k.anzahl !== 1 ? 'en' : ''} · </>}
                    {formatBetrag(k.summe)} berechnet
                    {puffer !== 0 && (
                      <span style={{ color: puffer > 0 ? 'var(--green)' : 'var(--red)' }}>
                        {' '}{puffer > 0 ? '+' : ''}{formatBetrag(puffer)} Puffer
                      </span>
                    )}
                  </>
                ) : k.anzahl === 0 ? (
                  <>Keine Ausgaben · Doppelklick fuer Dauerauftrag</>
                ) : (
                  <>{k.anzahl} Position{k.anzahl !== 1 ? 'en' : ''} · {anteil.toFixed(1)} % der Fixkosten</>
                )}
              </div>

              {/* Fortschrittsbalken */}
              <div style={{
                height: 3, background: 'var(--surface-2)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(anteil, 100)}%`,
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
