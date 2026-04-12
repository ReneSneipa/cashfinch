/**
 * Verwaltungsseite für wiederkehrende Ausgaben.
 *
 * Layout: Zwei-Spalten-Grid
 *   Links  → Ausgaben-Tabelle (interaktiv: Zeile anklicken = Edit)
 *   Rechts → AusgabenFormPanel (New / Edit / leer)
 */

import { useState, useCallback } from 'react';
import { ausgabenApi } from '../api/api.js';
import AusgabenFormPanel from '../components/AusgabenFormPanel.jsx';
import { formatBetrag } from '../utils/formatierung.js';
import { berechneMonatsbetrag } from '../utils/berechnungen.js';

// ── Kategorie-Badge mit dynamischen Farben ───────────────────────────────────

function KategorieBadge({ kategorie, kategorien }) {
  // Farbe aus der dynamischen Kategorien-Liste suchen
  const kat = kategorien.find((k) => k.name === kategorie);
  const farbe = kat?.farbe ?? '#636366';
  // Hintergrund: Farbe mit 8% Deckkraft
  const bg = farbe + '14'; // hex alpha ~8%

  return (
    <span style={{
      display: 'inline-flex', padding: '2px 7px',
      borderRadius: 5, fontSize: 11, fontWeight: 500,
      background: bg, color: farbe,
    }}>
      {kategorie}
    </span>
  );
}

// ── Tabellen-Styles ──────────────────────────────────────────────────────────
const thStyle = {
  padding: '9px 16px', textAlign: 'left',
  fontSize: 11, fontWeight: 600,
  color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  background: 'var(--bg)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};

export default function AusgabenSeite({ ausgaben, konten, kategorien, onReload }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState(null);          // 'new' | 'edit' | null
  const [laden, setLaden] = useState(false);
  const [filterKonto, setFilterKonto] = useState('');
  const [filterKategorie, setFilterKategorie] = useState('');

  // ── Abgeleitete Werte ──────────────────────────────────────────────────────
  const selectedAusgabe = ausgaben.find((a) => a.id === selectedId) ?? null;

  const gefilterteSortiert = [...ausgaben]
    .filter((a) => a.aktiv)
    .filter((a) => !filterKonto || a.konto === filterKonto)
    .filter((a) => !filterKategorie || a.kategorie === filterKategorie)
    .sort((a, b) => berechneMonatsbetrag(b) - berechneMonatsbetrag(a));

  // Konten- und Kategorien-Namen für Filter-Dropdowns
  const kontenNamen = konten.map((k) => k.name).sort();
  const kategorienNamen = kategorien.map((k) => k.name).sort();

  // ── Handler ────────────────────────────────────────────────────────────────
  const handleZeileKlick = (ausgabe) => {
    setSelectedId(ausgabe.id);
    setMode('edit');
  };

  const handleNeu = () => {
    setSelectedId(null);
    setMode('new');
  };

  const handleClose = () => {
    setMode(null);
    setSelectedId(null);
  };

  const handleSave = useCallback(async (formData) => {
    setLaden(true);
    try {
      if (formData.id) {
        const { id, ...daten } = formData;
        await ausgabenApi.update(id, daten);
      } else {
        await ausgabenApi.create(formData);
      }
      await onReload();
      handleClose();
    } finally {
      setLaden(false);
    }
  }, [onReload]);

  const handleDelete = useCallback(async (id) => {
    setLaden(true);
    try {
      await ausgabenApi.delete(id);
      await onReload();
      handleClose();
    } finally {
      setLaden(false);
    }
  }, [onReload]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 320px',
      gap: 20,
      alignItems: 'start',
    }}>

      {/* ── Linke Spalte: Tabelle ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Top Highlight */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Wiederkehrende Ausgaben</span>
            <span style={{
              fontSize: 11, fontWeight: 500,
              background: 'var(--surface-2)', color: 'var(--text-2)',
              borderRadius: 20, padding: '2px 8px',
            }}>
              {gefilterteSortiert.length} Einträge
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Konto-Filter */}
            <select
              value={filterKonto}
              onChange={(e) => setFilterKonto(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border)',
                background: filterKonto ? 'rgba(10,132,255,0.08)' : 'var(--surface-2)',
                color: filterKonto ? 'var(--blue)' : 'var(--text-2)',
                fontSize: 12, fontFamily: 'inherit',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">Konto ▾</option>
              {kontenNamen.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>

            {/* Kategorie-Filter */}
            <select
              value={filterKategorie}
              onChange={(e) => setFilterKategorie(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border)',
                background: filterKategorie ? 'rgba(10,132,255,0.08)' : 'var(--surface-2)',
                color: filterKategorie ? 'var(--blue)' : 'var(--text-2)',
                fontSize: 12, fontFamily: 'inherit',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">Kategorie ▾</option>
              {kategorienNamen.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>

            {/* Filter zurücksetzen */}
            {(filterKonto || filterKategorie) && (
              <button
                onClick={() => { setFilterKonto(''); setFilterKategorie(''); }}
                style={{
                  padding: '5px 10px', borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-3)', fontSize: 11, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >✕</button>
            )}

            {/* Neue Ausgabe */}
            <button
              onClick={handleNeu}
              style={{
                padding: '5px 14px', borderRadius: 'var(--r-sm)',
                border: 'none', background: 'var(--blue)',
                color: '#fff', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >+ Hinzufügen</button>
          </div>
        </div>

        {/* Tabelle */}
        {gefilterteSortiert.length === 0 ? (
          <div style={{
            color: 'var(--text-2)', fontSize: 13,
            textAlign: 'center', padding: '48px 24px',
          }}>
            {filterKonto || filterKategorie
              ? 'Keine Einträge für diesen Filter.'
              : 'Noch keine Ausgaben vorhanden. Klicke auf "+ Hinzufügen".'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Konto</th>
                <th style={thStyle}>Kategorie</th>
                <th style={thStyle}>Rhy.</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Betrag</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>/ Monat</th>
              </tr>
            </thead>
            <tbody>
              {gefilterteSortiert.map((a) => {
                const monatsbetrag = berechneMonatsbetrag(a);
                const istJQ = a.rhythmus !== 'M';
                const isSelected = a.id === selectedId;
                return (
                  <tr
                    key={a.id}
                    onClick={() => handleZeileKlick(a)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: isSelected ? 'rgba(10,132,255,0.06)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                      outline: isSelected ? '1px solid rgba(10,132,255,0.2)' : 'none',
                      outlineOffset: -1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      {a.name}
                      {a.geteilt && (
                        <span style={{
                          fontSize: 10, color: 'var(--text-3)',
                          border: '1px solid var(--border)',
                          borderRadius: 4, padding: '1px 5px', marginLeft: 5,
                        }}>½</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-2)' }}>
                      {a.konto}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <KategorieBadge kategorie={a.kategorie} kategorien={kategorien} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: 'var(--text-3)',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 4, padding: '1px 5px',
                      }}>{a.rhythmus}</span>
                    </td>
                    <td style={{
                      padding: '12px 16px', textAlign: 'right',
                      fontWeight: 500, fontVariantNumeric: 'tabular-nums', fontSize: 13,
                    }}>
                      {formatBetrag(a.betrag)}
                    </td>
                    <td style={{
                      padding: '12px 16px', textAlign: 'right',
                      fontWeight: 500, fontVariantNumeric: 'tabular-nums', fontSize: 13,
                      color: istJQ ? 'var(--text-2)' : 'var(--text)',
                    }}>
                      {formatBetrag(monatsbetrag)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Rechte Spalte: Formular-Panel ── */}
      <AusgabenFormPanel
        mode={mode}
        ausgabe={selectedAusgabe}
        konten={konten}
        kategorien={kategorien}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={handleClose}
        laden={laden}
      />
    </div>
  );
}
