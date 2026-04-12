/**
 * Einstellungen-Seite (M6+).
 *
 * Abschnitte:
 *   1. Datenpfad      – Pfad zum Datenordner (config.json)
 *   2. Konten         – Anlegen, Löschen, Reihenfolge per Drag & Drop
 *   3. Kategorien     – Anlegen, Löschen mit Farbpicker
 *   4. Shortcut       – Hinweis wie man cashfinch zum Desktop-Shortcut macht
 */

import { useState, useEffect, useRef } from 'react';
import { einstellungenApi, kontenApi, kategorienApi, authApi } from '../api/api.js';

// ── Hilfsstile ────────────────────────────────────────────────────────────────

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  padding: '22px 24px',
  position: 'relative',
  overflow: 'hidden',
  marginBottom: 12,
};

const highlight = (
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
    pointerEvents: 'none',
  }} />
);

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
  fontFamily: 'inherit',
};

const btnPrimary = {
  background: 'var(--blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '9px 18px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontFamily: 'inherit',
};

const btnSecondary = {
  background: 'var(--surface-2)',
  color: 'var(--text-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

// ── Datenpfad-Abschnitt ───────────────────────────────────────────────────────

function DatenpfadKarte({ initialPfad, onSaved }) {
  const [pfad, setPfad] = useState(initialPfad);
  const [pruefStatus, setPruefStatus] = useState(null); // null | 'ok' | 'fehler' | 'pruefen'
  const [gespeichert, setGespeichert] = useState(false);
  const pruefTimer = useRef(null);

  useEffect(() => {
    setPruefStatus(null);
    setGespeichert(false);
    if (pfad.trim() === '') return;
    clearTimeout(pruefTimer.current);
    pruefTimer.current = setTimeout(async () => {
      setPruefStatus('pruefen');
      const res = await einstellungenApi.pruefePfad(pfad);
      setPruefStatus(res.data?.existiert ? 'ok' : 'fehler');
    }, 500);
    return () => clearTimeout(pruefTimer.current);
  }, [pfad]);

  const handleSave = async () => {
    if (pruefStatus === 'fehler') return;
    await einstellungenApi.save({ datenpfad: pfad });
    setGespeichert(true);
    onSaved();
  };

  const statusFarbe = pruefStatus === 'ok' ? 'var(--green)' : pruefStatus === 'fehler' ? 'var(--red)' : 'var(--text-3)';
  const statusText = pruefStatus === 'ok'
    ? '✓ Pfad gefunden'
    : pruefStatus === 'fehler'
      ? '✗ Pfad nicht gefunden'
      : pruefStatus === 'pruefen'
        ? '… prüfe'
        : pfad.trim() === ''
          ? 'Standard: ./data'
          : '';

  return (
    <div style={cardStyle}>
      {highlight}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Datenpfad</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
        Wo liegen deine JSON-Dateien? Leer lassen für den Standard-Ordner{' '}
        <code style={{ fontFamily: 'monospace', background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>./data</code>.
        Alternativer Pfad z.B. für Dropbox oder NAS.
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <input
            style={inputStyle}
            placeholder="Leer = Standard  |  z.B. C:\Dropbox\cashfinch"
            value={pfad}
            onChange={(e) => setPfad(e.target.value)}
          />
          {statusText && (
            <div style={{ fontSize: 11, marginTop: 5, color: statusFarbe }}>
              {statusText}
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={pruefStatus === 'fehler'}
          style={{
            ...btnPrimary,
            background: gespeichert ? 'rgba(48,209,88,0.1)' : 'var(--blue)',
            color: gespeichert ? 'var(--green)' : '#fff',
            border: gespeichert ? '1px solid rgba(48,209,88,0.2)' : 'none',
            cursor: pruefStatus === 'fehler' ? 'not-allowed' : 'pointer',
            opacity: pruefStatus === 'fehler' ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          {gespeichert ? '✓ Gespeichert' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

// ── Konten-Verwaltung + Reihenfolge ──────────────────────────────────────────

function KontenVerwaltungKarte({ konten: initialKonten, initialReihenfolge, onSaved }) {
  const [konten, setKonten] = useState(initialKonten);
  const [neuerName, setNeuerName] = useState('');
  const [fehler, setFehler] = useState(null);
  const [loeschenId, setLoeschenId] = useState(null);
  const [loeschFehler, setLoeschFehler] = useState({});

  // D&D Reihenfolge
  const reihenfolge = konten.map((k) => k.name);
  const initialListe = [
    ...initialReihenfolge.filter((n) => reihenfolge.includes(n)),
    ...reihenfolge.filter((n) => !initialReihenfolge.includes(n)),
  ];
  const [liste, setListe] = useState(initialListe);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [reihenfolgeGespeichert, setReihenfolgeGespeichert] = useState(false);

  // Liste synchronisieren wenn Konten sich ändern
  useEffect(() => {
    const namen = konten.map((k) => k.name);
    setListe((prev) => [
      ...prev.filter((n) => namen.includes(n)),
      ...namen.filter((n) => !prev.includes(n)),
    ]);
  }, [konten]);

  const handleAdd = async () => {
    if (!neuerName.trim()) return;
    setFehler(null);
    const res = await kontenApi.create({ name: neuerName.trim() });
    if (res.error) { setFehler(res.error); return; }
    setKonten((prev) => [...prev, res.data]);
    setNeuerName('');
    onSaved();
  };

  const handleLoeschen = async (id) => {
    if (loeschenId !== id) { setLoeschenId(id); return; }
    setLoeschFehler((prev) => ({ ...prev, [id]: null }));
    const res = await kontenApi.delete(id);
    if (res.error) {
      setLoeschFehler((prev) => ({ ...prev, [id]: res.error }));
      setLoeschenId(null);
      return;
    }
    setKonten((prev) => prev.filter((k) => k.id !== id));
    setLoeschenId(null);
    onSaved();
  };

  const handleDragStart = (i) => setDragIndex(i);
  const handleDragOver = (e, i) => { e.preventDefault(); setDropIndex(i); };
  const handleDragLeave = () => setDropIndex(null);
  const handleDrop = (e, ziel) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === ziel) {
      setDragIndex(null); setDropIndex(null); return;
    }
    const neu = [...liste];
    const [verschoben] = neu.splice(dragIndex, 1);
    neu.splice(ziel, 0, verschoben);
    setListe(neu);
    setDragIndex(null);
    setDropIndex(null);
    setReihenfolgeGespeichert(false);
  };

  const handleSaveReihenfolge = async () => {
    await einstellungenApi.save({ kontenReihenfolge: liste });
    setReihenfolgeGespeichert(true);
    onSaved();
  };

  return (
    <div style={cardStyle}>
      {highlight}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Konten</div>
        <button
          onClick={handleSaveReihenfolge}
          style={{
            ...btnSecondary,
            background: reihenfolgeGespeichert ? 'rgba(48,209,88,0.1)' : 'var(--surface-2)',
            color: reihenfolgeGespeichert ? 'var(--green)' : 'var(--text-2)',
            border: reihenfolgeGespeichert ? '1px solid rgba(48,209,88,0.2)' : '1px solid var(--border)',
            transition: 'all 0.2s',
          }}
        >
          {reihenfolgeGespeichert ? '✓ Gespeichert' : 'Reihenfolge speichern'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
        Konten anlegen, löschen und per Drag & Drop sortieren. Die Reihenfolge steuert die Standard-Sortierung in der Dashboard-Tabelle.
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {liste.map((name, i) => {
          const konto = konten.find((k) => k.name === name);
          if (!konto) return null;
          const bestaetigen = loeschenId === konto.id;
          return (
            <div key={konto.id}>
              <div
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px',
                  background: dropIndex === i ? 'rgba(10,132,255,0.08)' : 'var(--surface-2)',
                  border: `1px solid ${dropIndex === i ? 'rgba(10,132,255,0.3)' : 'var(--border)'}`,
                  borderRadius: 8,
                  cursor: 'grab',
                  transition: 'background 0.1s, border-color 0.1s',
                  opacity: dragIndex === i ? 0.4 : 1,
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-3)', flexShrink: 0 }}>⠿</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 4, padding: '1px 6px', minWidth: 20, textAlign: 'center', flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{name}</span>
                <button
                  onClick={() => { setLoeschenId(bestaetigen ? null : konto.id); setLoeschFehler({}); }}
                  title={bestaetigen ? 'Abbrechen' : 'Konto löschen'}
                  style={{
                    background: bestaetigen ? 'rgba(255,69,58,0.1)' : 'transparent',
                    color: bestaetigen ? 'var(--red)' : 'var(--text-3)',
                    border: bestaetigen ? '1px solid rgba(255,69,58,0.2)' : '1px solid transparent',
                    borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                    fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  {bestaetigen ? 'Abbrechen' : '✕'}
                </button>
                {bestaetigen && (
                  <button
                    onClick={() => handleLoeschen(konto.id)}
                    style={{
                      background: 'var(--red)', color: '#fff', border: 'none',
                      borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                    }}
                  >Löschen</button>
                )}
              </div>
              {loeschFehler[konto.id] && (
                <div style={{
                  fontSize: 11, color: 'var(--red)', marginTop: 4, padding: '6px 12px',
                  background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.15)',
                  borderRadius: 6,
                }}>
                  {loeschFehler[konto.id]}
                </div>
              )}
            </div>
          );
        })}
        {konten.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>
            Noch keine Konten vorhanden.
          </div>
        )}
      </div>

      {/* Neues Konto */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <input
            style={inputStyle}
            placeholder="Neues Konto, z.B. Fixkosten"
            value={neuerName}
            onChange={(e) => { setNeuerName(e.target.value); setFehler(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          {fehler && (
            <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{fehler}</div>
          )}
        </div>
        <button onClick={handleAdd} style={btnPrimary}>+ Hinzufügen</button>
      </div>
    </div>
  );
}

// ── Kategorien-Verwaltung + Reihenfolge ──────────────────────────────────────

function KategorienVerwaltungKarte({ kategorien: initialKategorien, initialReihenfolge, onSaved }) {
  const [kategorien, setKategorien] = useState(initialKategorien);
  const [neuerName, setNeuerName] = useState('');
  const [neueFarbe, setNeueFarbe] = useState('#636366');
  const [fehler, setFehler] = useState(null);
  const [loeschenId, setLoeschenId] = useState(null);
  const [loeschFehler, setLoeschFehler] = useState({});

  // D&D Reihenfolge – analog zu KontenVerwaltungKarte
  const reihenfolge = kategorien.map((k) => k.name);
  const initialListe = [
    ...initialReihenfolge.filter((n) => reihenfolge.includes(n)),
    ...reihenfolge.filter((n) => !initialReihenfolge.includes(n)),
  ];
  const [liste, setListe] = useState(initialListe);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [reihenfolgeGespeichert, setReihenfolgeGespeichert] = useState(false);

  // Liste synchronisieren wenn Kategorien sich ändern
  useEffect(() => {
    const namen = kategorien.map((k) => k.name);
    setListe((prev) => [
      ...prev.filter((n) => namen.includes(n)),
      ...namen.filter((n) => !prev.includes(n)),
    ]);
  }, [kategorien]);

  const handleAdd = async () => {
    if (!neuerName.trim()) return;
    setFehler(null);
    const res = await kategorienApi.create({ name: neuerName.trim(), farbe: neueFarbe });
    if (res.error) { setFehler(res.error); return; }
    setKategorien((prev) => [...prev, res.data]);
    setNeuerName('');
    setNeueFarbe('#636366');
    onSaved();
  };

  const handleLoeschen = async (id) => {
    if (loeschenId !== id) { setLoeschenId(id); return; }
    setLoeschFehler((prev) => ({ ...prev, [id]: null }));
    const res = await kategorienApi.delete(id);
    if (res.error) {
      setLoeschFehler((prev) => ({ ...prev, [id]: res.error }));
      setLoeschenId(null);
      return;
    }
    setKategorien((prev) => prev.filter((k) => k.id !== id));
    setLoeschenId(null);
    onSaved();
  };

  const handleDragStart = (i) => setDragIndex(i);
  const handleDragOver = (e, i) => { e.preventDefault(); setDropIndex(i); };
  const handleDragLeave = () => setDropIndex(null);
  const handleDrop = (e, ziel) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === ziel) {
      setDragIndex(null); setDropIndex(null); return;
    }
    const neu = [...liste];
    const [verschoben] = neu.splice(dragIndex, 1);
    neu.splice(ziel, 0, verschoben);
    setListe(neu);
    setDragIndex(null);
    setDropIndex(null);
    setReihenfolgeGespeichert(false);
  };

  const handleSaveReihenfolge = async () => {
    await einstellungenApi.save({ kategorienReihenfolge: liste });
    setReihenfolgeGespeichert(true);
    onSaved();
  };

  return (
    <div style={cardStyle}>
      {highlight}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Kategorien</div>
        <button
          onClick={handleSaveReihenfolge}
          style={{
            ...btnSecondary,
            background: reihenfolgeGespeichert ? 'rgba(48,209,88,0.1)' : 'var(--surface-2)',
            color: reihenfolgeGespeichert ? 'var(--green)' : 'var(--text-2)',
            border: reihenfolgeGespeichert ? '1px solid rgba(48,209,88,0.2)' : '1px solid var(--border)',
            transition: 'all 0.2s',
          }}
        >
          {reihenfolgeGespeichert ? '✓ Gespeichert' : 'Reihenfolge speichern'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
        Kategorien anlegen, löschen und per Drag & Drop sortieren. Die Reihenfolge steuert die Darstellung im Tortendiagramm.
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {liste.map((name, i) => {
          const kat = kategorien.find((k) => k.name === name);
          if (!kat) return null;
          const bestaetigen = loeschenId === kat.id;
          const bg = kat.farbe + '14'; // ~8% Deckkraft

          return (
            <div key={kat.id}>
              <div
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px',
                  background: dropIndex === i ? 'rgba(10,132,255,0.08)' : 'var(--surface-2)',
                  border: `1px solid ${dropIndex === i ? 'rgba(10,132,255,0.3)' : 'var(--border)'}`,
                  borderRadius: 8,
                  cursor: 'grab',
                  transition: 'background 0.1s, border-color 0.1s',
                  opacity: dragIndex === i ? 0.4 : 1,
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-3)', flexShrink: 0 }}>⠿</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 4, padding: '1px 6px', minWidth: 20, textAlign: 'center', flexShrink: 0,
                }}>{i + 1}</span>
                {/* Farbpunkt */}
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: kat.farbe, flexShrink: 0,
                }} />
                {/* Name-Badge */}
                <span style={{
                  display: 'inline-flex', padding: '2px 8px',
                  borderRadius: 5, fontSize: 11, fontWeight: 500,
                  background: bg, color: kat.farbe, flex: 1,
                }}>
                  {kat.name}
                </span>
                {/* Farb-Hex */}
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', flexShrink: 0 }}>
                  {kat.farbe}
                </span>
                <button
                  onClick={() => { setLoeschenId(bestaetigen ? null : kat.id); setLoeschFehler({}); }}
                  title={bestaetigen ? 'Abbrechen' : 'Kategorie löschen'}
                  style={{
                    background: bestaetigen ? 'rgba(255,69,58,0.1)' : 'transparent',
                    color: bestaetigen ? 'var(--red)' : 'var(--text-3)',
                    border: bestaetigen ? '1px solid rgba(255,69,58,0.2)' : '1px solid transparent',
                    borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                    fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  {bestaetigen ? 'Abbrechen' : '✕'}
                </button>
                {bestaetigen && (
                  <button
                    onClick={() => handleLoeschen(kat.id)}
                    style={{
                      background: 'var(--red)', color: '#fff', border: 'none',
                      borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                    }}
                  >Löschen</button>
                )}
              </div>
              {loeschFehler[kat.id] && (
                <div style={{
                  fontSize: 11, color: 'var(--red)', marginTop: 4, padding: '6px 12px',
                  background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.15)',
                  borderRadius: 6,
                }}>
                  {loeschFehler[kat.id]}
                </div>
              )}
            </div>
          );
        })}
        {kategorien.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>
            Noch keine Kategorien vorhanden.
          </div>
        )}
      </div>

      {/* Neue Kategorie */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <input
            style={inputStyle}
            placeholder="Neue Kategorie, z.B. Freizeit"
            value={neuerName}
            onChange={(e) => { setNeuerName(e.target.value); setFehler(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          {fehler && (
            <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{fehler}</div>
          )}
        </div>
        {/* Farbpicker */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <input
            type="color"
            value={neueFarbe}
            onChange={(e) => setNeueFarbe(e.target.value)}
            title="Farbe wählen"
            style={{
              width: 40, height: 39,
              border: '1px solid var(--border)',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'var(--surface-2)',
              padding: 2,
            }}
          />
        </div>
        <button onClick={handleAdd} style={btnPrimary}>+ Hinzufügen</button>
      </div>
    </div>
  );
}

// ── Desktop-Shortcut-Hinweis ──────────────────────────────────────────────────

function ShortcutKarte() {
  return (
    <div style={cardStyle}>
      {highlight}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Desktop-Verknüpfung</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
        Die <code style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>install.bat</code> legt beim ersten Start automatisch eine Verknüpfung{' '}
        <strong style={{ color: 'var(--text)' }}>cashfinch</strong> auf dem Desktop an –
        ein Doppelklick darauf startet cashfinch direkt.
      </div>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Verknüpfung fehlt?</div>
        <ol style={{ fontSize: 12, color: 'var(--text-2)', paddingLeft: 18, lineHeight: 1.8 }}>
          <li><code style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>install.bat</code> im cashfinch-Ordner nochmal ausführen – sie wird neu erstellt.</li>
          <li>Oder: <code style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>start.bat</code> direkt per Doppelklick starten.</li>
        </ol>
      </div>
    </div>
  );
}

// ── Passwort-Abschnitt ────────────────────────────────────────────────────────

function PasswortKarte({ onAuthChange }) {
  const [status, setStatus]         = useState(null); // null | { eingerichtet, gesperrt }
  const [modus, setModus]           = useState(null); // null | 'einrichten' | 'entfernen'
  const [passwort, setPasswort]     = useState('');
  const [bestaetigung, setBestaetigung] = useState('');
  const [fehler, setFehler]         = useState('');
  const [erfolg, setErfolg]         = useState('');
  const [laden, setLaden]           = useState(false);

  useEffect(() => {
    authApi.status().then((res) => setStatus(res.data ?? null));
  }, []);

  const reset = () => { setPasswort(''); setBestaetigung(''); setFehler(''); setErfolg(''); setModus(null); };

  const handleEinrichten = async (e) => {
    e.preventDefault();
    setFehler('');
    if (passwort.length < 4) { setFehler('Mind. 4 Zeichen.'); return; }
    if (passwort !== bestaetigung) { setFehler('Passwörter stimmen nicht überein.'); return; }
    setLaden(true);
    const res = await authApi.setup(passwort);
    setLaden(false);
    if (res.error) { setFehler(res.error); return; }
    setErfolg('Passwort eingerichtet. Daten sind jetzt verschlüsselt.');
    const neuerStatus = { eingerichtet: true, gesperrt: false };
    setStatus(neuerStatus);
    onAuthChange?.(neuerStatus);
    setModus(null);
    setPasswort(''); setBestaetigung('');
  };

  const handleEntfernen = async (e) => {
    e.preventDefault();
    setFehler('');
    setLaden(true);
    const res = await authApi.remove(passwort);
    setLaden(false);
    if (res.error) { setFehler(res.error); return; }
    setErfolg('Passwortschutz entfernt. Daten werden unverschlüsselt gespeichert.');
    const neuerStatus = { eingerichtet: false, gesperrt: false };
    setStatus(neuerStatus);
    onAuthChange?.(neuerStatus);
    setModus(null);
    setPasswort('');
  };

  if (!status) return null;

  const eingerichtet = status.eingerichtet;

  return (
    <div style={cardStyle}>
      {highlight}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Verschlüsselung</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
        {eingerichtet
          ? 'Deine Daten sind mit AES-256-GCM verschlüsselt. Das Passwort wird beim Start abgefragt.'
          : 'Kein Passwortschutz aktiv. Daten liegen unverschlüsselt im data-Ordner.'}
      </div>

      {/* Status-Badge */}
      {!modus && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontSize: 11, fontWeight: 600,
            padding: '4px 10px', borderRadius: 20,
            background: eingerichtet ? 'rgba(48,209,88,0.1)' : 'rgba(255,159,10,0.1)',
            color: eingerichtet ? 'var(--green)' : 'var(--yellow)',
            border: `1px solid ${eingerichtet ? 'rgba(48,209,88,0.2)' : 'rgba(255,159,10,0.2)'}`,
          }}>
            {eingerichtet ? '🔒 Verschlüsselt' : '🔓 Unverschlüsselt'}
          </div>
          <button
            onClick={() => { setErfolg(''); setFehler(''); setModus(eingerichtet ? 'entfernen' : 'einrichten'); }}
            style={{ ...btnPrimary, background: eingerichtet ? 'rgba(255,69,58,0.08)' : 'var(--blue)', color: eingerichtet ? 'var(--red)' : '#fff', border: eingerichtet ? '1px solid rgba(255,69,58,0.2)' : 'none' }}
          >
            {eingerichtet ? 'Entfernen' : 'Einrichten'}
          </button>
        </div>
      )}

      {/* Erfolgshinweis */}
      {erfolg && !modus && (
        <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 10 }}>{erfolg}</div>
      )}

      {/* Formular: Einrichten */}
      {modus === 'einrichten' && (
        <form onSubmit={handleEinrichten} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 2 }}>
            Neues Passwort (mind. 4 Zeichen) – danach werden alle Daten verschlüsselt.
          </div>
          <input style={inputStyle} type="password" placeholder="Neues Passwort" value={passwort} onChange={(e) => { setPasswort(e.target.value); setFehler(''); }} autoComplete="new-password" />
          <input style={inputStyle} type="password" placeholder="Passwort bestätigen" value={bestaetigung} onChange={(e) => { setBestaetigung(e.target.value); setFehler(''); }} autoComplete="new-password" />
          {fehler && <div style={{ fontSize: 11, color: 'var(--red)' }}>{fehler}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={laden} style={{ ...btnPrimary, background: 'var(--blue)', color: '#fff', border: 'none' }}>{laden ? 'Verschlüssele…' : 'Passwort einrichten'}</button>
            <button type="button" onClick={reset} style={{ ...btnPrimary, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>Abbrechen</button>
          </div>
        </form>
      )}

      {/* Formular: Entfernen */}
      {modus === 'entfernen' && (
        <form onSubmit={handleEntfernen} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 2 }}>
            Aktuelles Passwort eingeben um die Verschlüsselung zu entfernen. Daten werden danach im Klartext gespeichert.
          </div>
          <input style={inputStyle} type="password" placeholder="Aktuelles Passwort" value={passwort} onChange={(e) => { setPasswort(e.target.value); setFehler(''); }} autoComplete="current-password" />
          {fehler && <div style={{ fontSize: 11, color: 'var(--red)' }}>{fehler}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={laden} style={{ ...btnPrimary, background: 'rgba(255,69,58,0.08)', color: 'var(--red)', border: '1px solid rgba(255,69,58,0.2)' }}>{laden ? 'Entschlüssele…' : 'Verschlüsselung entfernen'}</button>
            <button type="button" onClick={reset} style={{ ...btnPrimary, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>Abbrechen</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function EinstellungenSeite({ ausgaben, konten, kategorien, kontenReihenfolge, kategorienReihenfolge, onReload, onAuthChange }) {
  const [datenpfad, setDatenpfad] = useState('');
  const [geladen, setGeladen] = useState(false);

  // Aktuellen Datenpfad laden
  useEffect(() => {
    einstellungenApi.get().then((res) => {
      setDatenpfad(res.data?.datenpfad ?? '');
      setGeladen(true);
    });
  }, []);

  if (!geladen) return null;

  return (
    <>
      <DatenpfadKarte initialPfad={datenpfad} onSaved={onReload} />
      <KontenVerwaltungKarte konten={konten} initialReihenfolge={kontenReihenfolge} onSaved={onReload} />
      <KategorienVerwaltungKarte kategorien={kategorien} initialReihenfolge={kategorienReihenfolge} onSaved={onReload} />
      <PasswortKarte onAuthChange={onAuthChange} />
      <ShortcutKarte />
    </>
  );
}
