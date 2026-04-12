/**
 * Tabelle aller wiederkehrenden Ausgaben (Dashboard-Übersicht, read-only).
 * Spalten: Name | Konto | Kategorie | Rhythmus | Betrag | /Monat
 *
 * Zwei Sortiermodi:
 *   "standard" → Konto (asc) → Kategorie (asc) → /Monat (desc)
 *                Konto-Reihenfolge wird in M6 per Einstellungen (Drag & Drop) konfigurierbar.
 *   "custom"   → Klick auf Spalte (asc/desc toggle)
 *
 * Oben rechts: "Standard"-Button zum Zurücksetzen.
 */

import { useState } from 'react';
import { formatBetrag } from '../utils/formatierung.js';
import { berechneMonatsbetrag } from '../utils/berechnungen.js';

// ── Kategorie-Badges ──────────────────────────────────────────────────────────

function KategorieBadge({ kategorie, kategorien }) {
  const farbe = kategorien.find((k) => k.name === kategorie)?.farbe ?? '#636366';
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

function RhythmusBadge({ rhythmus }) {
  const LABEL = { M: 'Monatl.', Q: 'Quartl.', J: 'Jährl.' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color: 'var(--text-3)',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      padding: '1px 5px',
    }}>
      {LABEL[rhythmus] ?? rhythmus}
    </span>
  );
}

// ── Sortier-Logik ─────────────────────────────────────────────────────────────

/** Einzelspalten-Sortierfunktionen (für custom-Modus) */
const SORTIERER = {
  name:     (a, b) => a.name.localeCompare(b.name, 'de'),
  konto:    (a, b) => (a.konto ?? '').localeCompare(b.konto ?? '', 'de'),
  kategorie:(a, b) => (a.kategorie ?? '').localeCompare(b.kategorie ?? '', 'de'),
  rhythmus: (a, b) => {
    const ord = { M: 0, Q: 1, J: 2 };
    return (ord[a.rhythmus] ?? 9) - (ord[b.rhythmus] ?? 9);
  },
  betrag:   (a, b) => a.betrag - b.betrag,
  monat:    (a, b) => berechneMonatsbetrag(a) - berechneMonatsbetrag(b),
};

/**
 * Standard-Sortierung: Konto (per kontenReihenfolge) → Kategorie (per kategorienReihenfolge) → /Monat (desc).
 * Beide Reihenfolgen stammen aus den Einstellungen (Drag & Drop).
 * Fallback: alphabetisch wenn keine Reihenfolge konfiguriert.
 */
function standardSortierung(a, b, kontenReihenfolge, kategorienReihenfolge) {
  // 1. Konto
  if (kontenReihenfolge.length > 0) {
    const pA = kontenReihenfolge.indexOf(a.konto ?? '');
    const pB = kontenReihenfolge.indexOf(b.konto ?? '');
    const posA = pA === -1 ? 9999 : pA;
    const posB = pB === -1 ? 9999 : pB;
    if (posA !== posB) return posA - posB;
  } else {
    const kontoVergl = (a.konto ?? '').localeCompare(b.konto ?? '', 'de');
    if (kontoVergl !== 0) return kontoVergl;
  }

  // 2. Kategorie
  if (kategorienReihenfolge.length > 0) {
    const pA = kategorienReihenfolge.indexOf(a.kategorie ?? '');
    const pB = kategorienReihenfolge.indexOf(b.kategorie ?? '');
    const posA = pA === -1 ? 9999 : pA;
    const posB = pB === -1 ? 9999 : pB;
    if (posA !== posB) return posA - posB;
  } else {
    const katVergl = (a.kategorie ?? '').localeCompare(b.kategorie ?? '', 'de');
    if (katVergl !== 0) return katVergl;
  }

  // 3. /Monat absteigend
  return berechneMonatsbetrag(b) - berechneMonatsbetrag(a);
}

function sortiereAusgaben(liste, modus, spalte, richtung, kontenReihenfolge, kategorienReihenfolge) {
  const aktive = liste.filter((a) => a.aktiv);
  if (modus === 'standard') {
    return [...aktive].sort((a, b) => standardSortierung(a, b, kontenReihenfolge, kategorienReihenfolge));
  }
  const fn = SORTIERER[spalte];
  if (!fn) return aktive;
  const sorted = [...aktive].sort(fn);
  return richtung === 'desc' ? sorted.reverse() : sorted;
}

// ── Sortierbarer Tabellenkopf ─────────────────────────────────────────────────

/**
 * Im Standard-Modus: alle drei Sortierspalten (Konto¹, Kategorie², /Monat³) dezent
 * mit ihrer Priorität markiert. Im Custom-Modus: nur die aktive Spalte blau + Pfeil.
 */
const STANDARD_PRIO = { konto: '¹↑', kategorie: '²↑', monat: '³↓' };

function SortTh({ children, spalte, modus, aktiveSpalte, richtung, onChange, rechtsbündig }) {
  const istCustomAktiv = modus === 'custom' && spalte === aktiveSpalte;
  const standardPrio = modus === 'standard' ? STANDARD_PRIO[spalte] : null;

  const pfeil = istCustomAktiv ? (richtung === 'asc' ? ' ↑' : ' ↓') : '';
  const farbe = istCustomAktiv
    ? 'var(--blue)'
    : standardPrio
      ? 'var(--text-2)'
      : 'var(--text-3)';

  return (
    <th
      onClick={() => onChange(spalte)}
      style={{
        padding: '9px 24px',
        textAlign: rechtsbündig ? 'right' : 'left',
        fontSize: 11, fontWeight: 600,
        color: farbe,
        textTransform: 'uppercase', letterSpacing: '0.5px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'color 0.15s',
      }}
    >
      {children}
      {standardPrio && (
        <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>{standardPrio}</span>
      )}
      {pfeil}
    </th>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function AusgabenTabelle({ ausgaben, kategorien = [], kontenReihenfolge = [], kategorienReihenfolge = [] }) {
  const [modus, setModus] = useState('standard'); // 'standard' | 'custom'
  const [sortSpalte, setSortSpalte] = useState('monat');
  const [sortRichtung, setSortRichtung] = useState('desc');

  // Klick auf Spalte → wechselt in Custom-Modus
  const handleSort = (spalte) => {
    if (modus === 'custom' && spalte === sortSpalte) {
      setSortRichtung((r) => (r === 'desc' ? 'asc' : 'desc'));
    } else {
      setModus('custom');
      setSortSpalte(spalte);
      setSortRichtung('desc');
    }
  };

  const handleStandard = () => setModus('standard');

  const sortiert = sortiereAusgaben(ausgaben, modus, sortSpalte, sortRichtung, kontenReihenfolge, kategorienReihenfolge);

  const thProps = {
    modus,
    aktiveSpalte: sortSpalte,
    richtung: sortRichtung,
    onChange: handleSort,
  };

  return (
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

      {/* Tabellenkopf */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Wiederkehrende Ausgaben</span>
          <span style={{
            fontSize: 11, fontWeight: 500,
            background: 'var(--surface-2)', color: 'var(--text-2)',
            borderRadius: 20, padding: '2px 8px',
          }}>
            {sortiert.length} Einträge
          </span>
        </div>

        {/* Standard-Button */}
        <button
          onClick={handleStandard}
          title="Konto → Kategorie → /Monat"
          style={{
            fontSize: 11, fontWeight: 600,
            background: modus === 'standard' ? 'rgba(10,132,255,0.1)' : 'var(--surface-2)',
            color: modus === 'standard' ? 'var(--blue)' : 'var(--text-3)',
            border: `1px solid ${modus === 'standard' ? 'rgba(10,132,255,0.25)' : 'var(--border)'}`,
            borderRadius: 7,
            padding: '4px 11px',
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <span style={{ fontSize: 12 }}>⇅</span> Standard
        </button>
      </div>

      {/* Tabelle */}
      {sortiert.length === 0 ? (
        <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: '40px 24px' }}>
          Noch keine aktiven Ausgaben vorhanden.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <SortTh spalte="name"      {...thProps}>Name</SortTh>
              <SortTh spalte="konto"     {...thProps}>Konto</SortTh>
              <SortTh spalte="kategorie" {...thProps}>Kategorie</SortTh>
              <SortTh spalte="rhythmus"  {...thProps}>Rhythmus</SortTh>
              <SortTh spalte="betrag"    {...thProps} rechtsbündig>Betrag</SortTh>
              <SortTh spalte="monat"     {...thProps} rechtsbündig>/ Monat</SortTh>
            </tr>
          </thead>
          <tbody>
            {sortiert.map((a) => {
              const monatsbetrag = berechneMonatsbetrag(a);
              const istJahresOderQuartal = a.rhythmus !== 'M';
              return (
                <tr
                  key={a.id}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 24px', fontSize: 13 }}>
                    {a.name}
                    {a.geteilt && (
                      <span style={{
                        fontSize: 10, color: 'var(--text-3)',
                        border: '1px solid var(--border)',
                        borderRadius: 4, padding: '1px 5px', marginLeft: 5,
                      }}>½</span>
                    )}
                  </td>
                  <td style={{ padding: '13px 24px', fontSize: 12, color: 'var(--text-2)' }}>
                    {a.konto}
                  </td>
                  <td style={{ padding: '13px 24px' }}>
                    <KategorieBadge kategorie={a.kategorie} kategorien={kategorien} />
                  </td>
                  <td style={{ padding: '13px 24px' }}>
                    <RhythmusBadge rhythmus={a.rhythmus} />
                  </td>
                  <td style={{ padding: '13px 24px', textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                    {formatBetrag(a.betrag)}
                  </td>
                  <td style={{
                    padding: '13px 24px', textAlign: 'right',
                    fontWeight: 500, fontVariantNumeric: 'tabular-nums', fontSize: 13,
                    color: istJahresOderQuartal ? 'var(--text-2)' : 'var(--text)',
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
  );
}
