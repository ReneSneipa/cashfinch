/**
 * Navigationsleiste.
 * - Pill-Tabs für die Seitennavigation
 * - Dark/Light-Mode-Toggle
 */

import logoUrl from '/img/logo.svg';

const TABS = [
  { id: 'dashboard', label: 'Übersicht' },
  { id: 'ausgaben', label: 'Ausgaben' },
  { id: 'einnahmen', label: 'Einnahmen' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'einstellungen', label: 'Einstellungen' },
];

const navStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 32px',
  height: '52px',
  borderBottom: '1px solid var(--border)',
  backdropFilter: 'blur(24px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
  background: 'rgba(9,9,11,0.72)',
  transition: 'background 0.25s',
};

const navLightOverride = {
  background: 'rgba(245,245,247,0.72)',
};

export default function Navbar({ theme, onThemeToggle, aktiveSeite, onSeitenwechsel, onLock }) {
  const iconBtnStyle = {
    width: 32, height: 32,
    borderRadius: 'var(--r-sm)',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  };

  return (
    <nav style={{ ...navStyle, ...(theme === 'light' ? navLightOverride : {}) }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, letterSpacing: '-0.4px' }}>
        <img src={logoUrl} alt="cashfinch" style={{ height: 24, width: 24, flexShrink: 0 }} />
        cashfinch
      </div>

      {/* Pill-Tabs */}
      <div style={{
        display: 'flex', gap: 2,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 3,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSeitenwechsel(tab.id)}
            style={{
              padding: '5px 14px',
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              background: aktiveSeite === tab.id ? 'var(--surface)' : 'transparent',
              color: aktiveSeite === tab.id ? 'var(--text)' : 'var(--text-2)',
              boxShadow: aktiveSeite === tab.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aktionen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Sperren (nur sichtbar wenn onLock übergeben) */}
        {onLock && (
          <button
            onClick={onLock}
            title="App sperren"
            style={iconBtnStyle}
          >
            🔒
          </button>
        )}

        {/* Dark/Light-Toggle */}
        <button
          onClick={onThemeToggle}
          title="Dark/Light umschalten"
          style={iconBtnStyle}
        >
          {theme === 'dark' ? '☾' : '○'}
        </button>
      </div>
    </nav>
  );
}
