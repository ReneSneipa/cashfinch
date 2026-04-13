/**
 * Root-Komponente.
 * Verwaltet Theme, Navigation und das zentrale Datenladen.
 * Rendert die jeweils aktive Seite unterhalb der Navbar.
 */

import { useState, useEffect } from 'react';
import useFinanzDaten from './hooks/useFinanzDaten.js';
import { authApi, konsistenzApi } from './api/api.js';
import Navbar from './components/Navbar.jsx';
import PasswortSperre from './components/PasswortSperre.jsx';
import Onboarding from './components/Onboarding.jsx';
import VerschluesselungsHinweis from './components/VerschluesselungsHinweis.jsx';
import KonsistenzModal from './components/KonsistenzModal.jsx';
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

  // Auth-Status: null = noch nicht geladen, sonst { eingerichtet, gesperrt, ... }
  const [authStatus, setAuthStatus] = useState(null);

  // Migrations-Zustand: verschlüsselte Dateien ohne config.json
  const [migrationFehler, setMigrationFehler] = useState(null); // null | { configPfad }

  // Onboarding-Guide anzeigen
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Verschlüsselungs-Hinweis beim ersten Start anzeigen
  const [showEncPrompt, setShowEncPrompt] = useState(false);

  // Konsistenz-Modal: inkonsistente Daten beim Start
  const [showKonsistenzModal, setShowKonsistenzModal] = useState(false);
  const [konsistenzDaten, setKonsistenzDaten] = useState(null);

  /** Konsistenz-Check ausführen und bei Problemen Modal anzeigen. */
  const pruefeKonsistenz = async () => {
    const res = await konsistenzApi.pruefen();
    if (res.data?.hatProbleme) {
      setKonsistenzDaten(res.data);
      setShowKonsistenzModal(true);
    }
  };

  // Auth-Status beim Start laden
  useEffect(() => {
    authApi.status().then(async (res) => {
      const status = res.data ?? { eingerichtet: false, gesperrt: false };

      // Verschlüsselte Daten ohne config.json – vor allem anderen prüfen
      if (status.verschluesseltOhneKonfig) {
        setMigrationFehler({ configPfad: status.configPfad ?? '' });
        setAuthStatus(status);
        return;
      }

      setAuthStatus(status);

      if (!status.eingerichtet) {
        // Onboarding beim allerersten Start – Flag in config.json, überlebt Neuinstallation nicht
        if (!status.onboardingGesehen) {
          authApi.onboardingGesehen();
          setShowOnboarding(true);
        }
        // Verschlüsselungs-Vorschlag: Flag ebenfalls in config.json
        if (!status.encHintGesehen) {
          setShowEncPrompt(true);
        }
      }

      // Konsistenz-Check: nur wenn App zugänglich (nicht gesperrt)
      if (!status.gesperrt && !status.verschluesseltOhneKonfig) {
        await pruefeKonsistenz();
      }
    });
  }, []);

  // Verschlüsselung wurde direkt im Hinweis-Modal eingerichtet
  const handleEncEingerichtet = () => {
    authApi.encHintGesehen();   // in config.json speichern
    setShowEncPrompt(false);
    setAuthStatus({ eingerichtet: true, gesperrt: false });
  };

  // Nutzer wählt "Später" im Hinweis-Modal
  const handleEncSpaeter = () => {
    authApi.encHintGesehen();   // in config.json speichern
    setShowEncPrompt(false);
  };

  // Auth-Status von EinstellungenSeite aktualisieren (z.B. nach Passwort einrichten/entfernen)
  const handleAuthChange = (neuerStatus) => {
    setAuthStatus((prev) => ({ ...prev, ...neuerStatus }));
  };

  // Zentrale Daten – einmal laden, alle Seiten profitieren
  // onGesperrt: wird aufgerufen wenn der Server neu gestartet wurde und der Key verloren ist
  const { einnahmen, ausgaben, budgets, konten, kategorien, kontenReihenfolge, kategorienReihenfolge, laden, fehler, neu: onReload } = useFinanzDaten({
    onGesperrt: () => setAuthStatus({ eingerichtet: true, gesperrt: true }),
  });

  // Nach erfolgreichem Entsperren: Status aktualisieren + Daten laden + Konsistenz prüfen
  const handleErfolg = async () => {
    setAuthStatus({ eingerichtet: true, gesperrt: false });
    onReload();
    await pruefeKonsistenz();
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
        return <EinstellungenSeite ausgaben={ausgaben} konten={konten} kategorien={kategorien} kontenReihenfolge={kontenReihenfolge} kategorienReihenfolge={kategorienReihenfolge} onReload={onReload} onAuthChange={handleAuthChange} />;
      default:
        return null;
    }
  };

  // PasswortSperre NUR anzeigen wenn Passwort bereits eingerichtet ist aber gesperrt ist.
  // Auf Erstinstall (eingerichtet: false) → App direkt nutzbar, kein Pflicht-Passwort.
  const zeigeSperre = authStatus?.eingerichtet === true && authStatus?.gesperrt === true;

  // Migrations-Fehler: verschlüsselte Daten ohne config.json
  if (migrationFehler) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 520, width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '32px 36px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Konfigurationsdatei fehlt</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 20 }}>
            Die Datendateien sind verschlüsselt, aber die zugehörige Konfigurationsdatei wurde nicht gefunden.
            Ohne diese Datei kann der Schlüssel nicht wiederhergestellt werden.
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>So behebst du das Problem:</div>
          <ol style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, paddingLeft: 20, marginBottom: 20 }}>
            <li>Kopiere <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>config.json</code> aus deiner alten Installation</li>
            <li>Lege sie hier ab:</li>
          </ol>
          {migrationFehler.configPfad && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)', wordBreak: 'break-all', marginBottom: 20 }}>
              {migrationFehler.configPfad}
            </div>
          )}
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
            Danach cashfinch neu starten – die App entsperrt sich wie gewohnt mit deinem Passwort.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Nach dem Kopieren: Neu laden
          </button>
        </div>
      </div>
    );
  }

  // Auth noch nicht geladen → kurzer Ladeindikator
  if (!authStatus) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-2)', fontSize: 13 }}>Starte cashfinch…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Passwort-Overlay: nur wenn Passwort eingerichtet + gesperrt */}
      {zeigeSperre && (
        <PasswortSperre
          modus="entsperren"
          onErfolg={handleErfolg}
        />
      )}

      {/* Onboarding-Guide beim allerersten Start */}
      {showOnboarding && !zeigeSperre && (
        <Onboarding
          onSeitenwechsel={setAktiveSeite}
          onFertig={() => setShowOnboarding(false)}
        />
      )}

      {/* Verschlüsselungs-Hinweis beim allerersten Start */}
      {showEncPrompt && !zeigeSperre && (
        <VerschluesselungsHinweis
          onEingerichtet={handleEncEingerichtet}
          onSpaeter={handleEncSpaeter}
        />
      )}

      {/* Konsistenz-Modal: inkonsistente Daten (hinter allen anderen Overlays) */}
      {showKonsistenzModal && !zeigeSperre && !showEncPrompt && konsistenzDaten && (
        <KonsistenzModal
          daten={konsistenzDaten}
          onBehoben={() => { setShowKonsistenzModal(false); onReload(); }}
          onSpaeter={() => setShowKonsistenzModal(false)}
        />
      )}

      <Navbar
        theme={theme}
        onThemeToggle={toggleTheme}
        aktiveSeite={aktiveSeite}
        onSeitenwechsel={setAktiveSeite}
        onLock={authStatus.eingerichtet ? handleLock : undefined}
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
