/**
 * Onboarding-Wizard – erscheint nach der Ersteinrichtung des Passworts.
 *
 * Zeigt einen schrittweisen Einrichtungsguide als fixe Karte (unten rechts),
 * damit der Nutzer gleichzeitig mit der App interagieren kann.
 *
 * Schritte:
 *  1. Einnahmen – zur Einnahmen-Seite navigieren
 *  2. Konten & Kategorien – zur Einstellungen-Seite navigieren
 *  3. Ausgaben & Budgets – zur Ausgaben-Seite navigieren
 */

import { useState } from 'react';

const SCHRITTE = [
  {
    nr:       1,
    titel:    'Einnahmen einrichten',
    text:     'Trage deine monatlichen Einnahmen ein – zum Beispiel Gehalt oder andere regelmäßige Einkünfte.',
    seite:    'einnahmen',
    seiteTxt: 'Zu Einnahmen →',
    icon:     '💰',
  },
  {
    nr:       2,
    titel:    'Konten & Kategorien',
    text:     'Passe deine Konten (z.B. Girokonto) und die Ausgaben-Kategorien an deine Bedürfnisse an.',
    seite:    'einstellungen',
    seiteTxt: 'Zu Einstellungen →',
    icon:     '🗂️',
  },
  {
    nr:       3,
    titel:    'Ausgaben & Budgets',
    text:     'Erfasse jetzt deine wiederkehrenden Ausgaben und lege Budgets für bestimmte Bereiche fest.',
    seite:    'ausgaben',
    seiteTxt: 'Zu Ausgaben →',
    icon:     '📋',
  },
];

export default function Onboarding({ onSeitenwechsel, onFertig }) {
  const [schritt, setSchritt] = useState(0);

  const aktuell   = SCHRITTE[schritt];
  const istLetzter = schritt === SCHRITTE.length - 1;

  const weiter = () => {
    if (istLetzter) {
      onFertig();
    } else {
      setSchritt((s) => s + 1);
    }
  };

  const zurSeite = () => {
    onSeitenwechsel(aktuell.seite);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 500,
      width: 300,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      overflow: 'hidden',
    }}>
      {/* Highlight-Linie oben */}
      <div style={{
        height: 2,
        background: 'var(--blue)',
      }} />

      <div style={{ padding: '16px 18px 18px' }}>
        {/* Header: Icon + Schritt-Anzeige + Überspringen */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{aktuell.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)' }}>
              Einrichtung {aktuell.nr}/{SCHRITTE.length}
            </span>
          </div>
          <button
            onClick={onFertig}
            title="Onboarding überspringen"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-3)',
              fontSize: 16,
              cursor: 'pointer',
              padding: '2px 4px',
              fontFamily: 'inherit',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Schritt-Punkte */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {SCHRITTE.map((s) => (
            <div
              key={s.nr}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: s.nr <= aktuell.nr ? 'var(--blue)' : 'var(--border)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Titel */}
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.2px' }}>
          {aktuell.titel}
        </div>

        {/* Beschreibung */}
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 }}>
          {aktuell.text}
        </div>

        {/* Aktions-Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={zurSeite}
            style={{
              flex: 1,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 7,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {aktuell.seiteTxt}
          </button>
          <button
            onClick={weiter}
            style={{
              flex: 1,
              background: 'var(--blue)',
              border: 'none',
              borderRadius: 7,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
          >
            {istLetzter ? 'Fertig!' : 'Weiter →'}
          </button>
        </div>
      </div>
    </div>
  );
}
