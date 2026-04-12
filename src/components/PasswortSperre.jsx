/**
 * PasswortSperre – Vollbild-Overlay für Passwortschutz.
 *
 * Zwei Modi:
 *  - "einrichten": Ersteinrichtung – Passwort wählen + bestätigen
 *  - "entsperren": normaler Start – Passwort eingeben
 *
 * Nach erfolgreichem Entsperren/Einrichten ruft onErfolg() auf.
 */

import { useState, useEffect, useRef } from 'react';
import { authApi } from '../api/api.js';
import logoUrl from '/img/logo.svg';

export default function PasswortSperre({ modus, onErfolg }) {
  const [passwort, setPasswort]           = useState('');
  const [bestaetigung, setBestaetigung]   = useState('');
  const [fehler, setFehler]               = useState('');
  const [laden, setLaden]                 = useState(false);
  const inputRef                          = useRef(null);

  // Fokus auf Eingabe setzen
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFehler('');

    if (!passwort.trim()) {
      setFehler('Bitte Passwort eingeben.');
      return;
    }

    if (modus === 'einrichten') {
      if (passwort.length < 4) {
        setFehler('Passwort muss mindestens 4 Zeichen haben.');
        return;
      }
      if (passwort !== bestaetigung) {
        setFehler('Passwörter stimmen nicht überein.');
        return;
      }
    }

    setLaden(true);
    try {
      const res = modus === 'einrichten'
        ? await authApi.setup(passwort)
        : await authApi.unlock(passwort);

      if (res.error) {
        setFehler(res.error);
      } else {
        onErfolg();
      }
    } catch {
      setFehler('Verbindungsfehler. Ist der Server gestartet?');
    } finally {
      setLaden(false);
    }
  };

  const istEinrichten = modus === 'einrichten';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Karte */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '32px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Highlight-Linie oben */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        }} />

        {/* Logo + Titel */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <img src={logoUrl} alt="" style={{ height: 40, width: 40, marginBottom: 10, opacity: 0.9 }} />
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>
            cashfinch
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {istEinrichten ? 'Passwort einrichten' : 'Entsperren'}
          </div>
        </div>

        {/* Ersteinrichtungs-Hinweis */}
        {istEinrichten && (
          <div style={{
            fontSize: 11, color: 'var(--text-3)',
            background: 'rgba(255,159,10,0.08)',
            border: '1px solid rgba(255,159,10,0.2)',
            borderRadius: 8, padding: '10px 12px',
            marginBottom: 20, lineHeight: 1.6,
          }}>
            ⚠ Dieses Passwort schützt deine Finanzdaten mit AES-256-Verschlüsselung.
            Es gibt keine Wiederherstellungsfunktion – bei Verlust sind die Daten nicht mehr lesbar.
          </div>
        )}

        {/* Formular */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              {istEinrichten ? 'Neues Passwort' : 'Passwort'}
            </label>
            <input
              ref={inputRef}
              type="password"
              value={passwort}
              onChange={(e) => { setPasswort(e.target.value); setFehler(''); }}
              placeholder={istEinrichten ? 'Mind. 4 Zeichen' : ''}
              autoComplete={istEinrichten ? 'new-password' : 'current-password'}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--surface-2)',
                border: `1px solid ${fehler ? 'rgba(255,69,58,0.5)' : 'var(--border-strong)'}`,
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 14,
                color: 'var(--text)',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
            />
          </div>

          {istEinrichten && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                Passwort bestätigen
              </label>
              <input
                type="password"
                value={bestaetigung}
                onChange={(e) => { setBestaetigung(e.target.value); setFehler(''); }}
                placeholder=""
                autoComplete="new-password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--surface-2)',
                  border: `1px solid ${fehler ? 'rgba(255,69,58,0.5)' : 'var(--border-strong)'}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 14,
                  color: 'var(--text)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>
          )}

          {/* Fehlermeldung */}
          {fehler && (
            <div style={{
              fontSize: 12, color: 'var(--red)',
              background: 'rgba(255,69,58,0.08)',
              border: '1px solid rgba(255,69,58,0.2)',
              borderRadius: 7, padding: '8px 12px',
              marginBottom: 12,
            }}>
              {fehler}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={laden}
            style={{
              width: '100%',
              background: laden ? 'rgba(10,132,255,0.5)' : 'var(--blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '11px',
              fontSize: 14,
              fontWeight: 600,
              cursor: laden ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
              marginTop: 4,
            }}
          >
            {laden
              ? (istEinrichten ? 'Verschlüssele Daten…' : 'Prüfe Passwort…')
              : (istEinrichten ? 'Einrichten & Entsperren' : 'Entsperren')}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 20, textAlign: 'center' }}>
        cashfinch · lokal · verschlüsselt
      </div>
    </div>
  );
}
