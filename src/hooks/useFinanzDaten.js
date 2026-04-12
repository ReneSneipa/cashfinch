import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Zentraler Datenhook – lädt alle Datensätze + Einstellungen parallel vom API-Server.
 *
 * Gibt zurück:
 * - einnahmen, ausgaben, budgets: die geladenen Daten
 * - konten, kategorien: dynamisch verwaltete Listen
 * - kontenReihenfolge: gespeicherte Konto-Sortierreihenfolge aus config.json
 * - laden: true NUR beim ersten Laden (blockiert die App)
 * - fehler: Fehlermeldung falls vorhanden
 * - neu: Funktion zum stillen Neuladen im Hintergrund (kein laden=true)
 */
export default function useFinanzDaten({ onGesperrt } = {}) {
  const [einnahmen, setEinnahmen] = useState([]);
  const [ausgaben, setAusgaben] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [konten, setKonten] = useState([]);
  const [kategorien, setKategorien] = useState([]);
  const [kontenReihenfolge, setKontenReihenfolge] = useState([]);
  const [kategorienReihenfolge, setKategorienReihenfolge] = useState([]);
  const [laden, setLaden] = useState(true);   // nur für initialen Ladevorgang
  const [fehler, setFehler] = useState(null);
  const hatGeladen = useRef(false);           // true nach dem ersten erfolgreichen Laden

  const ladeDaten = useCallback(async () => {
    // Beim ersten Mal Spinner zeigen; danach still im Hintergrund aktualisieren
    if (!hatGeladen.current) {
      setLaden(true);
    }
    setFehler(null);
    try {
      const [einnahmenRes, ausgabenRes, budgetsRes, einstellungenRes, kontenRes, kategorienRes] = await Promise.all([
        fetch('/api/einnahmen'),
        fetch('/api/ausgaben'),
        fetch('/api/budgets'),
        fetch('/api/einstellungen'),
        fetch('/api/konten'),
        fetch('/api/kategorien'),
      ]);

      const [einnahmenJson, ausgabenJson, budgetsJson, einstellungenJson, kontenJson, kategorienJson] = await Promise.all([
        einnahmenRes.json(),
        ausgabenRes.json(),
        budgetsRes.json(),
        einstellungenRes.json(),
        kontenRes.json(),
        kategorienRes.json(),
      ]);

      // 423 Gesperrt → PasswortSperre-Overlay übernimmt, hier still beenden
      const gesperrt = [einnahmenJson, ausgabenJson, budgetsJson, kontenJson, kategorienJson]
        .some((r) => r.error?.includes('Gesperrt'));
      if (gesperrt) { setLaden(false); onGesperrt?.(); return; }

      if (einnahmenJson.error) throw new Error(einnahmenJson.error);
      if (ausgabenJson.error) throw new Error(ausgabenJson.error);
      if (budgetsJson.error) throw new Error(budgetsJson.error);

      setEinnahmen(einnahmenJson.data ?? []);
      setAusgaben(ausgabenJson.data ?? []);
      setBudgets(budgetsJson.data ?? []);
      setKontenReihenfolge(einstellungenJson.data?.kontenReihenfolge ?? []);
      setKategorienReihenfolge(einstellungenJson.data?.kategorienReihenfolge ?? []);
      setKonten(kontenJson.data ?? []);
      setKategorien(kategorienJson.data ?? []);
      hatGeladen.current = true;
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaden(false);
    }
  }, []);

  useEffect(() => {
    ladeDaten();
  }, [ladeDaten]);

  return { einnahmen, ausgaben, budgets, konten, kategorien, kontenReihenfolge, kategorienReihenfolge, laden, fehler, neu: ladeDaten };
}
