/**
 * VerschluesselungsHinweis – Modal das beim allerersten Start erscheint
 * und vorschlägt die AES-256-Verschlüsselung einzurichten.
 *
 * Zeigt sich nur einmal (localStorage-Flag). Der Nutzer kann:
 *  - Passwort direkt hier einrichten → onEingerichtet() wird aufgerufen
 *  - "Später" wählen → Modal schließt, Einstellungen erklären es
 */

import { useState } from 'react';
import { authApi } from '../api/api.js';
import logoUrl from '/img/logo.svg';

export default function VerschluesselungsHinweis({ onEingerichtet, onSpaeter }) {
  const [schritt, setSchritt]         = useState('frage');   // 'frage' | 'formular'
  const [passwort, setPasswort]       = useState('');
  const [bestaetigung, setBestaetigung] = useState('');
  const [fehler, setFehler]           = useState('');
  const [laden, setLaden]             = useState(false);

  const handleSetup = async (e) => {
    e.preventDefault();
    setFehler('');
    if (passwort.length < 4) { setFehler('Mind. 4 Zeichen.'); return; }
    if (passwort !== bestaetigung) { setFehler('Passwörter stimmen nicht überein.'); return; }
    setLaden(true);
    const res = await authApi.setup(passwort);
    setLaden(false);
    if (res.error) { setFehler(res.error); return; }
    onEingerichtet();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 8000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '28px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Highlight-Linie oben */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)',
        }} />

        {schritt === 'frage' && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <img src={logoUrl} alt="" style={{ height: 32, width: 32, opacity: 0.9 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px' }}>Daten verschlüsseln?</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>Einmaliger Schritt beim ersten Start</div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 20 }}>
              cashfinch kann deine Finanzdaten mit <strong style={{ color: 'var(--text)' }}>AES-256-Verschlüsselung</strong> schützen.
              Du brauchst dann beim Start ein Passwort – ohne es sind die Daten nicht lesbar.
              <br /><br />
              Du kannst die Verschlüsselung jederzeit in den <strong style={{ color: 'var(--text)' }}>Einstellungen</strong> aktivieren oder deaktivieren.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => setSchritt('formular')}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  background: 'var(--blue)', color: '#fff',
                  border: 'none', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Jetzt einrichten
              </button>
              <button
                onClick={onSpaeter}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  background: 'var(--surface-2)', color: 'var(--text-2)',
                  border: '1px solid var(--border)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Später in Einstellungen
              </button>
            </div>
          </>
        )}

        {schritt === 'formular' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 4 }}>Passwort einrichten</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Dieses Passwort schützt deine Daten mit AES-256-GCM. Es gibt keine Wiederherstellung.
              </div>
            </div>

            <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="password"
                placeholder="Neues Passwort (mind. 4 Zeichen)"
                value={passwort}
                onChange={(e) => { setPasswort(e.target.value); setFehler(''); }}
                autoComplete="new-password"
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--surface-2)',
                  border: `1px solid ${fehler ? 'rgba(255,69,58,0.5)' : 'var(--border-strong)'}`,
                  borderRadius: 8, padding: '10px 12px',
                  fontSize: 14, color: 'var(--text)',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <input
                type="password"
                placeholder="Passwort bestätigen"
                value={bestaetigung}
                onChange={(e) => { setBestaetigung(e.target.value); setFehler(''); }}
                autoComplete="new-password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--surface-2)',
                  border: `1px solid ${fehler ? 'rgba(255,69,58,0.5)' : 'var(--border-strong)'}`,
                  borderRadius: 8, padding: '10px 12px',
                  fontSize: 14, color: 'var(--text)',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              {fehler && (
                <div style={{ fontSize: 11, color: 'var(--red)', background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: 6, padding: '6px 10px' }}>
                  {fehler}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="submit"
                  disabled={laden}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8,
                    background: laden ? 'rgba(10,132,255,0.5)' : 'var(--blue)',
                    color: '#fff', border: 'none',
                    fontSize: 13, fontWeight: 600,
                    cursor: laden ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {laden ? 'Verschlüssele…' : 'Einrichten & Starten'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSchritt('frage'); setFehler(''); setPasswort(''); setBestaetigung(''); }}
                  style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'var(--surface-2)', color: 'var(--text-2)',
                    border: '1px solid var(--border)',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Zurück
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
