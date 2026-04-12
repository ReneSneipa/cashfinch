/**
 * Root-Komponente.
 * Verwaltet Theme, Navigation und das zentrale Datenladen.
 * Rendert die jeweils aktive Seite unterhalb der Navbar.
 */

import { useState, useEffect } from 'react';
import useFinanzDaten from './hooks/useFinanzDaten.js';
import { authApi } from './api/api.js';
import Navbar from './components/Navbar.jsx';
import PasswortSperre from './components/PasswortSperre.jsx';
import Onboarding from './components/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AusgabenSeite from './pages/AusgabenSeite.jsx';
import EinnahmenSeite from './pages/EinnahmenSeite.jsx';
import BudgetSeite from './pages/BudgetSeite.jsx';
import EinstellungenSeite from './pages/EinstellungenSeite.jsx';

// Seitentitel-Mapping
const SEITEN_TITEL = {
  dashboard:    'Übersicht',
  ausgaben:     'Ausgaben',
  einnahmen:    'Einnahmen',
  budgets:      'Budgets',
  einstellungen: 'Einstellungen',
};

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [aktiveSeite, setAktiveSeite] = useState('dashboard');

  // Auth-Status: null = noch nicht geladen, sonst { eingerichtet, gesperrt }
  const [authStatus, setAuthStatus] = useState(null);

  // Onboarding nach Ersteinrichtung anzeigen
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Auth-Status beim Start und nach Änderungen laden
  useEffect(() => {
    authApi.status().then((res) => {
      setAuthStatus(res.data ?? { eingerichtet: false, gesperrt: true });
    });
  }, []);

  // Zentrale Daten – einmal laden, alle Seiten profitieren
  // onGesperrt: wird aufgerufen wenn der Server zwischenzeitlich neu gestartet wurde und der Key verloren ist
  const { einnahmen, ausgaben, budgets, konten, kategorien, kontenReihenfolge, kategorienReihenfolge, laden, fehler, neu: onReload } = useFinanzDaten({
    onGesperrt: () => setAuthStatus({ eingerichtet: true, gesperrt: true }),
  });

  // Nach erfolgreichem Entsperren/Einrichten: Status aktualisieren + Daten laden
  // Bei Ersteinrichtung (modus === 'einrichten') → Onboarding zeigen
  const handleErfolg = (warErsteinrichtung = false) => {
    setAuthStatus({ eingerichtet: true, gesperrt: false });
    if (warErsteinrichtung) setShowOnboarding(true);
    onReload();
  };

  // Sperren: Key aus RAM löschen + Status aktualisieren
  const handleLock = async () => {
    await authApi.lock();
    setAuthStatus({ eingerichtet: true, gesperrt: true });
  };

  // Theme auf dem <html>-Element setzen – CSS-Variablen reagieren darauf
  const toggleTheme = () => {
    const neuesTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(neuesTheme);
    document.documentElement.dataset.theme = neuesTheme === 'light' ? 'light' : '';
  };

  // Seiteninhalt basierend auf aktivem Tab
  const renderSeite = () => {
    // Lade- und Fehlerzustand (für alle Seiten)
    if (laden) {
      return (
        <div style={{ color: 'var(--text-2)', fontSize: 13, padding: '80px 0', textAlign: 'center' }}>
          Lade Daten…
        </div>
      );
    }
    if (fehler) {
      return (
        <div style={{
          background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)',
          borderRadius: 'var(--r-md)', padding: '16px 20px',
          color: 'var(--red)', fontSize: 13,
        }}>
          Fehler beim Laden: {fehler}
        </div>
      );
    }

    switch (aktiveSeite) {
      case 'dashboard':
        return <Dashboard einnahmen={einnahmen} ausgaben={ausgaben} budgets={budgets} kategorien={kategorien} kontenReihenfolge={kontenReihenfolge} kategorienReihenfolge={kategorienReihenfolge} />;
      case 'ausgaben':
        return <AusgabenSeite ausgaben={ausgaben} konten={konten} kategorien={kategorien} onReload={onReload} />;
      case 'einnahmen':
        return <EinnahmenSeite einnahmen={einnahmen} onReload={onReload} />;
      case 'budgets':
        return <BudgetSeite einnahmen={einnahmen} ausgaben={ausgaben} budgets={budgets} onReload={onReload} />;
      case 'einstellungen':
        return <EinstellungenSeite ausgaben={ausgaben} konten={konten} kategorien={kategorien} kontenReihenfolge={kontenReihenfolge} kategorienReihenfolge={kategorienReihenfolge} onReload={onReload} />;
      default:
        return null;
    }
  };

  // PasswortSperre anzeigen: solange Status unbekannt, oder gesperrt, oder nicht eingerichtet
  const zeigeSperre = !authStatus || authStatus.gesperrt || !authStatus.eingerichtet;
  const sperrModus  = !authStatus?.eingerichtet ? 'einrichten' : 'entsperren';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Passwort-Overlay (sitzt über allem) */}
      {zeigeSperre && (
        <PasswortSperre
          modus={sperrModus}
          onErfolg={() => handleErfolg(sperrModus === 'einrichten')}
        />
      )}

      {/* Onboarding-Guide nach Ersteinrichtung */}
      {showOnboarding && !zeigeSperre && (
        <Onboarding
          onSeitenwechsel={setAktiveSeite}
          onFertig={() => setShowOnboarding(false)}
        />
      )}

      <Navbar
        theme={theme}
        onThemeToggle={toggleTheme}
        aktiveSeite={aktiveSeite}
        onSeitenwechsel={setAktiveSeite}
        onLock={handleLock}
      />

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '36px 32px 64px' }}>
        {/* Seitentitel */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.6px' }}>
            {SEITEN_TITEL[aktiveSeite] ?? ''}
          </div>
          {aktiveSeite === 'dashboard' && (
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>
              Monatliche Fixkosten · Stand {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>

        {renderSeite()}
      </main>
    </div>
  );
}
