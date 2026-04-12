/**
 * API-Hilfsfunktionen für alle CRUD-Operationen.
 * Alle Methoden geben { data, error } zurück – gleiche Struktur wie der Server.
 */

const BASE = '/api';

/**
 * Generische Fetch-Hilfsfunktion.
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method
 * @param {string} url
 * @param {Object} [body]
 */
async function request(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + url, opts);
  return res.json();
}

// ── Ausgaben ─────────────────────────────────────────────────────────────
export const ausgabenApi = {
  /** Alle Ausgaben laden */
  getAll: () => request('GET', '/ausgaben'),
  /** Neue Ausgabe anlegen */
  create: (data) => request('POST', '/ausgaben', data),
  /** Ausgabe aktualisieren */
  update: (id, data) => request('PUT', `/ausgaben/${id}`, data),
  /** Ausgabe löschen */
  delete: (id) => request('DELETE', `/ausgaben/${id}`),
};

// ── Einnahmen ─────────────────────────────────────────────────────────────
export const einnahmenApi = {
  getAll: () => request('GET', '/einnahmen'),
  create: (data) => request('POST', '/einnahmen', data),
  update: (id, data) => request('PUT', `/einnahmen/${id}`, data),
  delete: (id) => request('DELETE', `/einnahmen/${id}`),
};

// ── Budgets ───────────────────────────────────────────────────────────────
export const budgetsApi = {
  getAll: () => request('GET', '/budgets'),
  create: (data) => request('POST', '/budgets', data),
  update: (id, data) => request('PUT', `/budgets/${id}`, data),
  delete: (id) => request('DELETE', `/budgets/${id}`),
};

// ── Konten ────────────────────────────────────────────────────────────────
export const kontenApi = {
  getAll: () => request('GET', '/konten'),
  create: (data) => request('POST', '/konten', data),
  update: (id, data) => request('PUT', `/konten/${id}`, data),
  delete: (id) => request('DELETE', `/konten/${id}`),
};

// ── Kategorien ────────────────────────────────────────────────────────────
export const kategorienApi = {
  getAll: () => request('GET', '/kategorien'),
  create: (data) => request('POST', '/kategorien', data),
  update: (id, data) => request('PUT', `/kategorien/${id}`, data),
  delete: (id) => request('DELETE', `/kategorien/${id}`),
};

// ── Einstellungen ─────────────────────────────────────────────────────────
export const einstellungenApi = {
  /** Aktuelle Einstellungen laden */
  get: () => request('GET', '/einstellungen'),
  /** Einstellungen speichern (partial update) */
  save: (data) => request('POST', '/einstellungen', data),
  /** Datenpfad auf Existenz prüfen */
  pruefePfad: (pfad) => request('GET', `/einstellungen/datenpfad-pruefen?pfad=${encodeURIComponent(pfad)}`),
};

// ── Auth / Passwortschutz ──────────────────────────────────────────────────────
export const authApi = {
  /** Status: eingerichtet? gesperrt? */
  status:  ()         => request('GET',  '/auth/status'),
  /** Ersteinrichtung: Passwort setzen + Daten verschlüsseln */
  setup:   (passwort) => request('POST', '/auth/setup',  { passwort }),
  /** Entsperren: Passwort prüfen, Schlüssel in RAM laden */
  unlock:  (passwort) => request('POST', '/auth/unlock', { passwort }),
  /** Sperren: Schlüssel aus RAM löschen */
  lock:    ()         => request('POST', '/auth/lock'),
};
