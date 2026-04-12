/**
 * Budget-Verwaltungsseite (M4).
 *
 * Layout:
 *   Oben  → 3 Summary-Kacheln: Verfügbar / Zugewiesen / Nicht zugewiesen
 *   Mitte → Liste aller Budgets mit Inline-Formular zum Bearbeiten
 *   Unten → "+ Neues Budget" Button (öffnet Formular am Ende der Liste)
 *
 * CRUD:
 *   - Erstellen via budgetsApi.create
 *   - Bearbeiten: Klick auf Zeile → Inline-Form erscheint darunter
 *   - Löschen: zwei-Schritt-Bestätigung per Klick
 */

import { useState, useCallback } from 'react';
import { budgetsApi } from '../api/api.js';
import { formatBetrag } from '../utils/formatierung.js';
import {
  berechneGesamteinnahmen,
  berechneGesamtkosten,
  berechneGesamtbudget,
} from '../utils/berechnungen.js';

// ── Inline-Formular ───────────────────────────────────────────────────────────

const STANDARD_FARBE = '#0a84ff';

function BudgetFormular({ initialDaten, onSpeichern, onAbbrechen }) {
  const [name, setName] = useState(initialDaten?.name ?? '');
  const [betrag, setBetrag] = useState(initialDaten?.betrag ?? '');
  const [farbe, setFarbe] = useState(initialDaten?.farbe ?? STANDARD_FARBE);
  const [fehler, setFehler] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setFehler('Bitte einen Namen eingeben.'); return; }
    if (!betrag || Number(betrag) <= 0) { setFehler('Bitte einen gültigen Betrag eingeben.'); return; }
    setFehler('');
    onSpeichern({ name: name.trim(), betrag: Number(betrag), farbe });
  };

  const inputStyle = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    color: 'var(--text)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--surface-2)',
      border: `1px solid ${fehler ? 'rgba(255,69,58,0.3)' : 'var(--border-strong)'}`,
      borderRadius: 10,
      padding: '16px 18px',
      display: 'grid',
      gridTemplateColumns: '1fr 140px 44px auto auto',
      gap: 10,
      alignItems: 'end',
    }}>
      {/* Name */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
          Name
        </label>
        <input
          style={inputStyle}
          placeholder="z.B. WG-Together"
          value={name}
          onChange={(e) => { setName(e.target.value); setFehler(''); }}
          autoFocus
        />
      </div>

      {/* Betrag */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
          Betrag (€)
        </label>
        <input
          style={inputStyle}
          type="number"
          min="0"
          step="0.01"
          placeholder="0,00"
          value={betrag}
          onChange={(e) => { setBetrag(e.target.value); setFehler(''); }}
        />
      </div>

      {/* Farbe */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
          Farbe
        </label>
        <input
          type="color"
          value={farbe}
          onChange={(e) => setFarbe(e.target.value)}
          style={{
            width: 44, height: 38,
            border: '1px solid var(--border-strong)',
            borderRadius: 8, cursor: 'pointer',
            background: 'none', padding: 2,
          }}
        />
      </div>

      {/* Speichern */}
      <button type="submit" style={{
        background: 'var(--blue)', color: '#fff',
        border: 'none', borderRadius: 8,
        padding: '9px 16px', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'end',
      }}>
        {initialDaten ? 'Speichern' : 'Anlegen'}
      </button>

      {/* Abbrechen */}
      <button type="button" onClick={onAbbrechen} style={{
        background: 'var(--surface-3)',
        color: 'var(--text-2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '9px 14px', fontSize: 13,
        cursor: 'pointer', alignSelf: 'end',
      }}>
        ✕
      </button>

      {/* Fehlerhinweis – überspannt alle Spalten */}
      {fehler && (
        <div style={{
          gridColumn: '1 / -1',
          fontSize: 12, color: 'var(--red)',
          background: 'rgba(255,69,58,0.06)',
          border: '1px solid rgba(255,69,58,0.15)',
          borderRadius: 6, padding: '6px 10px',
        }}>
          {fehler}
        </div>
      )}
    </form>
  );
}

// ── Hilfsstyle ────────────────────────────────────────────────────────────────

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  padding: '22px 24px',
  position: 'relative',
  overflow: 'hidden',
};

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function BudgetSeite({ einnahmen, ausgaben, budgets, onReload }) {
  const [editId, setEditId] = useState(null);      // ID des aktuell bearbeiteten Budgets
  const [neuOffen, setNeuOffen] = useState(false); // Formular für neues Budget
  const [loeschenId, setLoeschenId] = useState(null); // erste Stufe Löschen-Bestätigung

  // Berechnungen
  const verfuegbar = berechneGesamteinnahmen(einnahmen) - berechneGesamtkosten(ausgaben);
  const zugewiesen = berechneGesamtbudget(budgets);
  const nichtZugewiesen = verfuegbar - zugewiesen;

  // ── Handler ────────────────────────────────────────────────────────────────

  const handleAnlegen = useCallback(async (formDaten) => {
    await budgetsApi.create(formDaten);
    setNeuOffen(false);
    await onReload();
  }, [onReload]);

  const handleSpeichern = useCallback(async (id, formDaten) => {
    await budgetsApi.update(id, formDaten);
    setEditId(null);
    await onReload();
  }, [onReload]);

  const handleLoeschen = useCallback(async (id) => {
    if (loeschenId !== id) {
      // Erste Stufe: nur markieren
      setLoeschenId(id);
      return;
    }
    // Zweite Stufe: wirklich löschen
    await budgetsApi.delete(id);
    setLoeschenId(null);
    await onReload();
  }, [loeschenId, onReload]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Zeile 1: Summary-Kacheln */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>

        {/* Verfügbar */}
        <div style={cardStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', pointerEvents: 'none' }} />
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-2)', marginBottom: 14 }}>Verfügbar</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
            {formatBetrag(verfuegbar)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 8 }}>
            Einnahmen – Fixkosten
          </div>
        </div>

        {/* Zugewiesen */}
        <div style={cardStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', pointerEvents: 'none' }} />
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-2)', marginBottom: 14 }}>Zugewiesen</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {formatBetrag(zugewiesen)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 8 }}>
            {budgets.length} Budget{budgets.length !== 1 ? 's' : ''} definiert
          </div>
        </div>

        {/* Nicht zugewiesen */}
        <div style={cardStyle}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', pointerEvents: 'none' }} />
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-2)', marginBottom: 14 }}>Nicht zugewiesen</div>
          <div style={{
            fontSize: 28, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1,
            color: nichtZugewiesen >= 0 ? 'var(--blue)' : 'var(--red)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatBetrag(nichtZugewiesen)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 8 }}>
            {verfuegbar > 0 ? ((zugewiesen / verfuegbar) * 100).toFixed(1) : 0} % vergeben
          </div>
        </div>
      </div>

      {/* Zeile 2: Budget-Liste */}
      <div style={cardStyle}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Meine Budgets</div>
          <button
            onClick={() => { setNeuOffen(true); setEditId(null); }}
            style={{
              background: 'var(--blue)', color: '#fff',
              border: 'none', borderRadius: 8,
              padding: '7px 14px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            + Neues Budget
          </button>
        </div>

        {/* Formular für neues Budget */}
        {neuOffen && (
          <div style={{ marginBottom: 16 }}>
            <BudgetFormular
              onSpeichern={handleAnlegen}
              onAbbrechen={() => setNeuOffen(false)}
            />
          </div>
        )}

        {/* Leer-Zustand */}
        {budgets.length === 0 && !neuOffen && (
          <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
            Noch keine Budgets angelegt. Klicke auf "+ Neues Budget".
          </div>
        )}

        {/* Budget-Einträge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {budgets.map((budget) => {
            const anteil = verfuegbar > 0 ? (budget.betrag / verfuegbar) * 100 : 0;
            const istEdit = editId === budget.id;
            const istLoeschen = loeschenId === budget.id;

            return (
              <div key={budget.id}>
                {/* Budget-Zeile */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '14px 1fr auto auto auto',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {/* Farbpunkt */}
                  <div style={{
                    width: 10, height: 10, borderRadius: 3,
                    background: budget.farbe ?? STANDARD_FARBE, flexShrink: 0,
                  }} />

                  {/* Name + Balken */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      {budget.name}
                    </div>
                    <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(anteil, 100)}%`,
                        background: budget.farbe ?? STANDARD_FARBE,
                        borderRadius: 2,
                        transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                      }} />
                    </div>
                  </div>

                  {/* Betrag */}
                  <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: 80 }}>
                    {formatBetrag(budget.betrag)}
                    <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 400 }}>
                      {anteil.toFixed(1)} % von {formatBetrag(verfuegbar)}
                    </div>
                  </div>

                  {/* Bearbeiten */}
                  <button
                    onClick={() => { setEditId(istEdit ? null : budget.id); setLoeschenId(null); setNeuOffen(false); }}
                    style={{
                      background: istEdit ? 'rgba(10,132,255,0.1)' : 'var(--surface-2)',
                      color: istEdit ? 'var(--blue)' : 'var(--text-2)',
                      border: `1px solid ${istEdit ? 'rgba(10,132,255,0.2)' : 'var(--border)'}`,
                      borderRadius: 7, padding: '5px 10px',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    {istEdit ? 'Schließen' : 'Bearbeiten'}
                  </button>

                  {/* Löschen */}
                  <button
                    onClick={() => handleLoeschen(budget.id)}
                    onBlur={() => { if (loeschenId === budget.id) setLoeschenId(null); }}
                    style={{
                      background: istLoeschen ? 'rgba(255,69,58,0.1)' : 'var(--surface-2)',
                      color: istLoeschen ? 'var(--red)' : 'var(--text-2)',
                      border: `1px solid ${istLoeschen ? 'rgba(255,69,58,0.2)' : 'var(--border)'}`,
                      borderRadius: 7, padding: '5px 10px',
                      fontSize: 12, cursor: 'pointer',
                      minWidth: 60,
                    }}
                  >
                    {istLoeschen ? 'Sicher?' : 'Löschen'}
                  </button>
                </div>

                {/* Inline-Bearbeiten-Formular */}
                {istEdit && (
                  <div style={{ paddingBottom: 12 }}>
                    <BudgetFormular
                      initialDaten={budget}
                      onSpeichern={(daten) => handleSpeichern(budget.id, daten)}
                      onAbbrechen={() => setEditId(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
