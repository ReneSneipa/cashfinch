/**
 * Dashboard-Seite – Hauptansicht mit Kennzahlen und Charts.
 * Erhält alle Daten als Props von App.jsx.
 */

import SummaryCards from '../components/SummaryCards.jsx';
import BudgetCard from '../components/BudgetCard.jsx';
import DonutChart from '../components/DonutChart.jsx';
import KontoAufschlüsselung from '../components/KontoAufschlüsselung.jsx';
import AusgabenTabelle from '../components/AusgabenTabelle.jsx';

export default function Dashboard({ einnahmen, ausgaben, budgets, konten = [], kategorien = [], kontenReihenfolge, kategorienReihenfolge = [], onUpdate }) {
  return (
    <>
      {/* Zeile 1: Summary Cards */}
      <SummaryCards einnahmen={einnahmen} ausgaben={ausgaben} konten={konten} />

      {/* Zeile 2: Budgets + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 10, marginBottom: 12 }}>
        <BudgetCard einnahmen={einnahmen} ausgaben={ausgaben} budgets={budgets} konten={konten} />
        <DonutChart ausgaben={ausgaben} kategorien={kategorien} kategorienReihenfolge={kategorienReihenfolge} />
      </div>

      {/* Zeile 3: Konto-Aufschlüsselung */}
      <div style={{ marginBottom: 12 }}>
        <KontoAufschlüsselung ausgaben={ausgaben} konten={konten} onUpdate={onUpdate} />
      </div>

      {/* Zeile 4: Ausgaben-Tabelle (read-only, Überblick) */}
      <AusgabenTabelle ausgaben={ausgaben} kategorien={kategorien} kontenReihenfolge={kontenReihenfolge} kategorienReihenfolge={kategorienReihenfolge} />
    </>
  );
}
