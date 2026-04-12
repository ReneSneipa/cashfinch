/**
 * Formular-Panel für Ausgaben (rechte Seite der Ausgaben-Verwaltung).
 *
 * Props:
 * - mode:      'new' | 'edit' | null
 * - ausgabe:   Das aktuell zu bearbeitende Objekt (bei mode='edit')
 * - onSave:    async (formData) => void
 * - onDelete:  async (id) => void
 * - onClose:   () => void
 * - laden:     boolean – Speichern-Button wird deaktiviert
 */

import { useState, useEffect } from 'react';
import { RHYTHMUS_OPTIONEN } from '../constants.js';
import { berechneMonatsbetrag } from '../utils/berechnungen.js';
import { formatBetrag } from '../utils/formatierung.js';

/** Leeres Formular – Defaults aus den übergebenen Listen */
function erstelleLeer(konten, kategorien) {
  return {
    name: '',
    betrag: '',
    faelligAm: '',
    rhythmus: 'M',
    konto: konten[0]?.name ?? '',
    kategorie: kategorien[0]?.name ?? '',
    geteilt: false,
  };
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
  panel: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    padding: 24,
    position: 'sticky',
    top: 68,
  },
  highlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)',
    pointerEvents: 'none',
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)',
    color: 'var(--text)',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  inputFocus: {
    borderColor: 'var(--blue)',
    boxShadow: '0 0 0 2px rgba(10,132,255,0.12)',
  },
};

function Field({ label, children, row }) {
  return (
    <div style={{ marginBottom: row ? 0 : 14 }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

function FocusInput({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...s.input, ...style, ...(focused ? s.inputFocus : {}) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function FocusSelect({ children, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        ...s.input,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238e8e93' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: 28,
        WebkitAppearance: 'none',
        appearance: 'none',
        ...(focused ? s.inputFocus : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}

export default function AusgabenFormPanel({ mode, ausgabe, konten = [], kategorien = [], onSave, onDelete, onClose, laden }) {
  const [form, setForm] = useState(() => erstelleLeer(konten, kategorien));
  const [fehler, setFehler] = useState('');
  const [loeschenBestaetigung, setLoeschenBestaetigung] = useState(false);

  // Formular befüllen wenn eine Ausgabe ausgewählt wird
  useEffect(() => {
    if (mode === 'edit' && ausgabe) {
      setForm({
        name: ausgabe.name,
        betrag: ausgabe.betrag,
        faelligAm: ausgabe.faelligAm ?? '',
        rhythmus: ausgabe.rhythmus,
        konto: ausgabe.konto,
        kategorie: ausgabe.kategorie,
        geteilt: ausgabe.geteilt,
      });
    } else if (mode === 'new') {
      setForm(erstelleLeer(konten, kategorien));
    }
    setFehler('');
    setLoeschenBestaetigung(false);
  }, [mode, ausgabe]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // Live-Vorschau des Monatsbetrags
  const vorschau = berechneMonatsbetrag({
    betrag: Number(form.betrag) || 0,
    rhythmus: form.rhythmus,
    geteilt: form.geteilt,
  });

  const handleSave = async () => {
    if (!form.name.trim()) { setFehler('Bitte einen Namen eingeben.'); return; }
    if (!form.betrag || Number(form.betrag) <= 0) { setFehler('Bitte einen gültigen Betrag eingeben.'); return; }
    setFehler('');
    try {
      await onSave({
        ...form,
        betrag: Number(form.betrag),
        id: ausgabe?.id,
      });
    } catch (err) {
      setFehler(err.message);
    }
  };

  const handleDelete = async () => {
    if (!loeschenBestaetigung) { setLoeschenBestaetigung(true); return; }
    try {
      await onDelete(ausgabe.id);
    } catch (err) {
      setFehler(err.message);
    }
  };

  if (!mode) {
    return (
      <div style={{
        ...s.panel,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: 320, color: 'var(--text-2)', textAlign: 'center', gap: 12,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
          <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <div style={{ fontSize: 13 }}>
          Zeile anklicken zum Bearbeiten<br />oder neue Ausgabe anlegen
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...s.panel }}>
      <div style={s.highlight} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {mode === 'new' ? 'Neue Ausgabe' : 'Ausgabe bearbeiten'}
        </span>
        <button
          onClick={onClose}
          style={{
            width: 24, height: 24, borderRadius: 6,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
      </div>

      {/* Name */}
      <Field label="Name">
        <FocusInput
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="z.B. Netflix"
          autoFocus={mode === 'new'}
        />
      </Field>

      {/* Betrag + Fällig am */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Field label="Betrag (€)" row>
          <FocusInput
            type="number"
            value={form.betrag}
            onChange={(e) => set('betrag', e.target.value)}
            placeholder="0,00"
            step="0.01"
            min="0"
          />
        </Field>
        <Field label="Fällig am" row>
          <FocusInput
            type="text"
            value={form.faelligAm}
            onChange={(e) => set('faelligAm', e.target.value)}
            placeholder="1. / März / …"
          />
        </Field>
      </div>

      {/* Rhythmus */}
      <Field label="Rhythmus">
        <div style={{ display: 'flex', gap: 6 }}>
          {RHYTHMUS_OPTIONEN.map(({ wert, label, beschreibung }) => (
            <button
              key={wert}
              onClick={() => set('rhythmus', wert)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 'var(--r-sm)',
                border: `1px solid ${form.rhythmus === wert ? 'var(--blue)' : 'var(--border)'}`,
                background: form.rhythmus === wert ? 'rgba(10,132,255,0.08)' : 'transparent',
                color: form.rhythmus === wert ? 'var(--blue)' : 'var(--text-2)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'center',
                lineHeight: 1.3,
                transition: 'all 0.15s',
              }}
            >
              {label}
              <span style={{ display: 'block', fontSize: 10, fontWeight: 400, marginTop: 1 }}>
                {beschreibung}
              </span>
            </button>
          ))}
        </div>
      </Field>

      {/* Konto + Kategorie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Field label="Konto" row>
          <FocusSelect value={form.konto} onChange={(e) => set('konto', e.target.value)}>
            {konten.map((k) => <option key={k.id} value={k.name}>{k.name}</option>)}
          </FocusSelect>
        </Field>
        <Field label="Kategorie" row>
          <FocusSelect value={form.kategorie} onChange={(e) => set('kategorie', e.target.value)}>
            {kategorien.map((k) => <option key={k.id} value={k.name}>{k.name}</option>)}
          </FocusSelect>
        </Field>
      </div>

      {/* Geteilt-Toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 0 4px', borderTop: '1px solid var(--border)', marginTop: 4,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Geteilt</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1 }}>Nur 50 % dieser Ausgabe anrechnen</div>
        </div>
        <div
          onClick={() => set('geteilt', !form.geteilt)}
          style={{
            width: 36, height: 20,
            background: form.geteilt ? 'var(--blue)' : 'var(--surface-2)',
            border: `1px solid ${form.geteilt ? 'var(--blue)' : 'var(--border)'}`,
            borderRadius: 20, cursor: 'pointer', position: 'relative',
            transition: 'background 0.2s, border-color 0.2s', flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', top: 2,
            left: form.geteilt ? 18 : 2,
            width: 14, height: 14,
            borderRadius: '50%', background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'left 0.18s',
          }} />
        </div>
      </div>

      {/* Monatsbetrag-Vorschau */}
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)', padding: '10px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 14,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>→ Monatsbetrag (netto)</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)', fontVariantNumeric: 'tabular-nums' }}>
          {formatBetrag(vorschau)}
        </span>
      </div>

      {/* Fehler */}
      {fehler && (
        <div style={{
          marginTop: 10, padding: '8px 12px',
          background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)',
          borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--red)',
        }}>
          {fehler}
        </div>
      )}

      {/* Aktionen */}
      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: 8, borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-2)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Abbrechen</button>
        <button
          onClick={handleSave}
          disabled={laden}
          style={{
            flex: 2, padding: 8, borderRadius: 'var(--r-sm)',
            border: 'none', background: 'var(--blue)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: laden ? 'wait' : 'pointer',
            fontFamily: 'inherit', opacity: laden ? 0.7 : 1,
          }}
        >
          {laden ? 'Speichern…' : 'Speichern'}
        </button>
      </div>

      {/* Löschen – nur im Edit-Modus */}
      {mode === 'edit' && (
        <button
          onClick={handleDelete}
          disabled={laden}
          style={{
            width: '100%', padding: 7, marginTop: 10,
            borderRadius: 'var(--r-sm)',
            border: `1px solid ${loeschenBestaetigung ? 'rgba(255,69,58,0.5)' : 'rgba(255,69,58,0.2)'}`,
            background: loeschenBestaetigung ? 'rgba(255,69,58,0.12)' : 'rgba(255,69,58,0.05)',
            color: 'var(--red)', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
          }}
        >
          {loeschenBestaetigung ? '⚠ Wirklich löschen? Nochmals klicken.' : 'Ausgabe löschen'}
        </button>
      )}
    </div>
  );
}
