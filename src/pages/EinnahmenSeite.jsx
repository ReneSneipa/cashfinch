/**
 * Verwaltungsseite für Einnahmen.
 *
 * Einfacheres Layout als AusgabenSeite:
 *   - Kompakte Karten-Liste statt Tabelle (wenige Einträge erwartet)
 *   - Inline-Formular zum Anlegen / Bearbeiten
 */

import { useState, useCallback } from 'react';
import { einnahmenApi } from '../api/api.js';
import { formatBetrag } from '../utils/formatierung.js';
import { berechneGesamteinnahmen } from '../utils/berechnungen.js';

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)',
    pointerEvents: 'none',
  },
  label: {
    display: 'block',
    fontSize: 11, fontWeight: 600,
    color: 'var(--text-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginBottom: 5,
  },
  input: {
    width: '100%', padding: '8px 10px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)',
    color: 'var(--text)', fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  },
};

function FocusInput({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...s.input, ...style,
        ...(focused ? { borderColor: 'var(--blue)', boxShadow: '0 0 0 2px rgba(10,132,255,0.12)' } : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ── Formular-Komponente ──────────────────────────────────────────────────────
function EinnahmeForm({ einnahme, onSave, onCancel, laden }) {
  const [name, setName] = useState(einnahme?.name ?? '');
  const [betrag, setBetrag] = useState(einnahme?.betrag ?? '');
  const [fehler, setFehler] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setFehler('Bitte einen Namen eingeben.'); return; }
    if (!betrag || Number(betrag) <= 0) { setFehler('Bitte einen gültigen Betrag eingeben.'); return; }
    setFehler('');
    try {
      await onSave({ name: name.trim(), betrag: Number(betrag), id: einnahme?.id });
    } catch (err) {
      setFehler(err.message);
    }
  };

  return (
    <div style={{ padding: 20, borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
        {einnahme ? 'Einnahme bearbeiten' : 'Neue Einnahme'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={s.label}>Name</label>
          <FocusInput
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Gehalt"
            autoFocus
          />
        </div>
        <div>
          <label style={s.label}>Betrag (€)</label>
          <FocusInput
            type="number"
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            placeholder="0,00"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      {fehler && (
        <div style={{
          marginBottom: 10, padding: '8px 12px',
          background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)',
          borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--red)',
        }}>
          {fehler}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-2)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Abbrechen</button>
        <button
          onClick={handleSave}
          disabled={laden}
          style={{
            flex: 2, padding: '8px 0', borderRadius: 'var(--r-sm)',
            border: 'none', background: 'var(--blue)', color: '#fff',
            fontSize: 13, fontWeight: 600,
            cursor: laden ? 'wait' : 'pointer',
            fontFamily: 'inherit', opacity: laden ? 0.7 : 1,
          }}
        >
          {laden ? 'Speichern…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function EinnahmenSeite({ einnahmen, onReload }) {
  const [editId, setEditId] = useState(null);    // ID der gerade bearbeiteten Einnahme
  const [neuFormular, setNeuFormular] = useState(false);
  const [laden, setLaden] = useState(false);
  const [loeschenId, setLoeschenId] = useState(null);  // Zwei-Schritt-Bestätigung

  const gesamtEinnahmen = berechneGesamteinnahmen(einnahmen);
  const aktiveEinnahmen = einnahmen.filter((e) => e.aktiv);

  const schliesseFormular = () => {
    setEditId(null);
    setNeuFormular(false);
  };

  const handleSave = useCallback(async (data) => {
    setLaden(true);
    try {
      let result;
      if (data.id) {
        const { id, ...daten } = data;
        result = await einnahmenApi.update(id, daten);
      } else {
        result = await einnahmenApi.create({ ...data, aktiv: true });
      }
      if (result.error) throw new Error(result.error);
      await onReload();
      schliesseFormular();
    } finally {
      setLaden(false);
    }
  }, [onReload]);

  const handleDelete = useCallback(async (id) => {
    if (loeschenId !== id) {
      setLoeschenId(id);
      return;
    }
    setLaden(true);
    try {
      await einnahmenApi.delete(id);
      await onReload();
      setLoeschenId(null);
    } finally {
      setLaden(false);
    }
  }, [loeschenId, onReload]);

  return (
    <div style={{ maxWidth: 640 }}>

      {/* ── Summary-Karte ── */}
      <div style={{
        ...s.card,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 22px',
        marginBottom: 16,
      }}>
        <div style={s.highlight} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
            Gesamteinnahmen
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#30d158', fontVariantNumeric: 'tabular-nums' }}>
            {formatBetrag(gesamtEinnahmen)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>/ Monat</div>
        </div>
        <button
          onClick={() => { setNeuFormular(true); setEditId(null); }}
          style={{
            padding: '7px 16px', borderRadius: 'var(--r-sm)',
            border: 'none', background: 'var(--blue)', color: '#fff',
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >+ Hinzufügen</button>
      </div>

      {/* ── Einnahmen-Liste ── */}
      <div style={s.card}>
        <div style={s.highlight} />

        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Einnahmen</span>
          <span style={{
            fontSize: 11, fontWeight: 500,
            background: 'var(--surface-2)', color: 'var(--text-2)',
            borderRadius: 20, padding: '2px 8px',
          }}>
            {aktiveEinnahmen.length} Einträge
          </span>
        </div>

        {/* Eintragszeilen */}
        {aktiveEinnahmen.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
            Noch keine Einnahmen vorhanden. Klicke auf "+ Hinzufügen".
          </div>
        ) : (
          aktiveEinnahmen.map((e) => (
            <div key={e.id}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  background: editId === e.id ? 'rgba(10,132,255,0.04)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(el) => { if (editId !== e.id) el.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={(el) => { if (editId !== e.id) el.currentTarget.style.background = 'transparent'; }}
              >
                {/* Name + Betrag */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>monatlich</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#30d158', fontVariantNumeric: 'tabular-nums' }}>
                    {formatBetrag(e.betrag)}
                  </span>

                  {/* Aktionen */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { setEditId(e.id); setNeuFormular(false); setLoeschenId(null); }}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-2)', fontSize: 11, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >Bearbeiten</button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={laden}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--r-sm)',
                        border: `1px solid ${loeschenId === e.id ? 'rgba(255,69,58,0.5)' : 'rgba(255,69,58,0.2)'}`,
                        background: loeschenId === e.id ? 'rgba(255,69,58,0.1)' : 'transparent',
                        color: 'var(--red)', fontSize: 11, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      {loeschenId === e.id ? '⚠ Sicher?' : 'Löschen'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Edit-Formular direkt unter dem Eintrag */}
              {editId === e.id && (
                <EinnahmeForm
                  einnahme={e}
                  onSave={handleSave}
                  onCancel={schliesseFormular}
                  laden={laden}
                />
              )}
            </div>
          ))
        )}

        {/* Neu-Formular am Ende der Liste */}
        {neuFormular && (
          <EinnahmeForm
            einnahme={null}
            onSave={handleSave}
            onCancel={schliesseFormular}
            laden={laden}
          />
        )}
      </div>
    </div>
  );
}
