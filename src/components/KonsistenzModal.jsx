/**
 * KonsistenzModal – Modal-Overlay für inkonsistente Daten.
 *
 * Erscheint beim App-Start (und nach dem Entsperren) wenn Ausgaben auf
 * Kategorien oder Konten verweisen, die nicht mehr in den JSON-Dateien existieren.
 *
 * Flow:
 *   1. Übersicht: Kurzinfo + "Jetzt beheben" / "Später erinnern"
 *   2. Beheben: Pro Gruppe (Kategorien / Konten) Aktions-Buttons
 *   3. Alle Probleme behoben → onBehoben() aufrufen (Daten neu laden)
 */

import { useState } from 'react';
import { konsistenzApi } from '../api/api.js';

export default function KonsistenzModal({ daten: initialDaten, onBehoben, onSpaeter }) {
  const [ansicht, setAnsicht]   = useState('uebersicht'); // 'uebersicht' | 'beheben'
  const [daten, setDaten]       = useState(initialDaten);
  const [laden, setLaden]       = useState(false);
  const [erledigt, setErledigt] = useState(false);

  /** Nach jeder Aktion: Konsistenz neu prüfen und Modal-State aktualisieren. */
  const aktualisieren = async () => {
    const res = await konsistenzApi.pruefen();
    const neu = res.data ?? null;
    setDaten(neu);
    if (!neu?.hatProbleme) {
      // Alle Probleme behoben – kurz Erfolgsmeldung zeigen, dann Daten neu laden
      setErledigt(true);
      setTimeout(() => onBehoben(), 900);
    }
  };

  const handleKategorienAnlegen = async () => {
    setLaden(true);
    await konsistenzApi.kategorienAnlegen();
    await aktualisieren();
    setLaden(false);
  };

  const handleKategorienLoeschen = async () => {
    setLaden(true);
    await konsistenzApi.kategorienAusgabenLoeschen();
    await aktualisieren();
    setLaden(false);
  };

  const handleKontenAnlegen = async () => {
    setLaden(true);
    await konsistenzApi.kontenAnlegen();
    await aktualisieren();
    setLaden(false);
  };

  const handleKontenLoeschen = async () => {
    setLaden(true);
    await konsistenzApi.kontenAusgabenLoeschen();
    await aktualisieren();
    setLaden(false);
  };

  // Gesamtanzahl betroffener Ausgaben für die Übersicht
  const gesamtAusgaben = daten
    ? [
        ...Object.values(daten.anzahlProKategorie ?? {}),
        ...Object.values(daten.anzahlProKonto ?? {}),
      ].reduce((s, n) => s + n, 0)
    : 0;

  const kategorienAnzahl = daten?.verwaistKategorien?.length ?? 0;
  const kontenAnzahl     = daten?.verwaistKonten?.length ?? 0;
  const gesamtGruppen    = kategorienAnzahl + kontenAnzahl;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 8000,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '28px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Highlight-Linie oben */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg,transparent,rgba(255,159,10,0.25),transparent)',
        }} />

        {/* ── Erfolgsmeldung ─────────────────────────────────────────── */}
        {erledigt && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
              Alle Probleme behoben
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>
              Daten werden neu geladen…
            </div>
          </div>
        )}

        {/* ── Übersicht ──────────────────────────────────────────────── */}
        {!erledigt && ansicht === 'uebersicht' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>⚠</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px' }}>
                  Inkonsistente Daten
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                  Bitte beheben um Datenverluste zu vermeiden
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 16 }}>
              Einige Ausgaben verweisen auf{' '}
              <strong style={{ color: 'var(--text)' }}>
                {gesamtGruppen === 1
                  ? kategorienAnzahl > 0 ? '1 fehlende Kategorie' : '1 fehlendes Konto'
                  : `${gesamtGruppen} fehlende Einträge`}
              </strong>
              {' '}({gesamtAusgaben} betroffene Ausgabe{gesamtAusgaben !== 1 ? 'n' : ''}).
              Diese Ausgaben können in der App nicht korrekt angezeigt werden.
            </div>

            {/* Kurzübersicht der Probleme */}
            <div style={{
              background: 'rgba(255,159,10,0.06)', border: '1px solid rgba(255,159,10,0.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 12,
            }}>
              {kategorienAnzahl > 0 && (
                <div style={{ color: 'var(--text-2)', marginBottom: kontenAnzahl > 0 ? 4 : 0 }}>
                  <span style={{ color: 'var(--orange, #ff9f0a)', fontWeight: 600 }}>
                    {kategorienAnzahl} fehlende Kategorie{kategorienAnzahl !== 1 ? 'n' : ''}:
                  </span>
                  {' '}{daten?.verwaistKategorien?.join(', ')}
                </div>
              )}
              {kontenAnzahl > 0 && (
                <div style={{ color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--orange, #ff9f0a)', fontWeight: 600 }}>
                    {kontenAnzahl} fehlendes Konto{kontenAnzahl !== 1 ? 'n' : ''}:
                  </span>
                  {' '}{daten?.verwaistKonten?.join(', ')}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => setAnsicht('beheben')}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  background: 'var(--orange, #ff9f0a)', color: '#fff',
                  border: 'none', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Jetzt beheben
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
                Später erinnern
              </button>
            </div>
          </>
        )}

        {/* ── Detail-Ansicht: Beheben ────────────────────────────────── */}
        {!erledigt && ansicht === 'beheben' && (
          <>
            {/* Header mit Zurück-Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <button
                onClick={() => setAnsicht('uebersicht')}
                style={{
                  background: 'var(--surface-2)', color: 'var(--text-2)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                ← Zurück
              </button>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Probleme beheben</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  Wähle für jede Gruppe eine Aktion
                </div>
              </div>
            </div>

            {/* Fehlende Kategorien */}
            {daten?.verwaistKategorien?.length > 0 && (
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '14px 16px', marginBottom: 10,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                  Fehlende Kategorien
                </div>
                {daten.verwaistKategorien.map((name) => (
                  <div key={name} style={{
                    fontSize: 11, color: 'var(--text-2)', marginBottom: 4,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{
                      fontFamily: 'monospace', background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      padding: '1px 6px', borderRadius: 4,
                    }}>{name}</span>
                    <span style={{ color: 'var(--text-3)' }}>
                      · {daten.anzahlProKategorie[name]} Ausgabe{daten.anzahlProKategorie[name] !== 1 ? 'n' : ''}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={handleKategorienAnlegen}
                    disabled={laden}
                    style={{
                      flex: 1, background: 'var(--blue)', color: '#fff', border: 'none',
                      borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600,
                      cursor: laden ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      opacity: laden ? 0.6 : 1,
                    }}
                  >
                    Fehlende Kategorien anlegen
                  </button>
                  <button
                    onClick={handleKategorienLoeschen}
                    disabled={laden}
                    style={{
                      flex: 1, background: 'var(--surface)', color: 'var(--red)',
                      border: '1px solid rgba(255,69,58,0.3)',
                      borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600,
                      cursor: laden ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      opacity: laden ? 0.6 : 1,
                    }}
                  >
                    Betroffene Ausgaben löschen
                  </button>
                </div>
              </div>
            )}

            {/* Fehlende Konten */}
            {daten?.verwaistKonten?.length > 0 && (
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '14px 16px', marginBottom: 10,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                  Fehlende Konten
                </div>
                {daten.verwaistKonten.map((name) => (
                  <div key={name} style={{
                    fontSize: 11, color: 'var(--text-2)', marginBottom: 4,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{
                      fontFamily: 'monospace', background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      padding: '1px 6px', borderRadius: 4,
                    }}>{name}</span>
                    <span style={{ color: 'var(--text-3)' }}>
                      · {daten.anzahlProKonto[name]} Ausgabe{daten.anzahlProKonto[name] !== 1 ? 'n' : ''}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={handleKontenAnlegen}
                    disabled={laden}
                    style={{
                      flex: 1, background: 'var(--blue)', color: '#fff', border: 'none',
                      borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600,
                      cursor: laden ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      opacity: laden ? 0.6 : 1,
                    }}
                  >
                    Fehlende Konten anlegen
                  </button>
                  <button
                    onClick={handleKontenLoeschen}
                    disabled={laden}
                    style={{
                      flex: 1, background: 'var(--surface)', color: 'var(--red)',
                      border: '1px solid rgba(255,69,58,0.3)',
                      borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600,
                      cursor: laden ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      opacity: laden ? 0.6 : 1,
                    }}
                  >
                    Betroffene Ausgaben löschen
                  </button>
                </div>
              </div>
            )}

            {/* Schließen-Button */}
            <button
              onClick={onSpaeter}
              style={{
                width: '100%', padding: '9px', borderRadius: 8, marginTop: 6,
                background: 'transparent', color: 'var(--text-3)',
                border: '1px solid var(--border)', fontSize: 12,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Schließen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
