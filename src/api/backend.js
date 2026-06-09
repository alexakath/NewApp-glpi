// Client HTTP pour le backend NewApp (Express + SQLite).
// Base path proxifié par Vite : /backend → localhost:3001
// Ne parle jamais à GLPI directement.

const BASE = '/backend/api'

const json = (res) => {
  if (!res.ok) throw new Error(`Backend ${res.status}: ${res.statusText}`)
  return res.json()
}

// ── Health ────────────────────────────────────────────────────────────────────

export const checkBackendHealth = () =>
  fetch(`${BASE}/health`).then(json)

// ── API générique — utilisable pour tout module ───────────────────────────────
// module = clé enregistrée dans server/modules/index.js (ex: 'tickets', 'computers')

export const getFromSQLite   = (module) =>
  fetch(`${BASE}/${module}`).then(json)

export const getCountFromSQLite = (module) =>
  fetch(`${BASE}/${module}/count`).then(json)

export const clearFromSQLite = (module) =>
  fetch(`${BASE}/${module}`, { method: 'DELETE' }).then(json)

export const syncToSQLite = (module, data) =>
  fetch(`${BASE}/sync/${module}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  }).then(json)

// ── Tickets (raccourcis nommés) ───────────────────────────────────────────────

export const getTicketsFromSQLite      = () => getFromSQLite('tickets')
export const getTicketsCountFromSQLite = () => getCountFromSQLite('tickets')
export const clearTicketsFromSQLite    = () => clearFromSQLite('tickets')
export const syncTicketsToSQLite       = (tickets) => syncToSQLite('tickets', tickets)

// ── Settings ──────────────────────────────────────────────────────────────────

export const getSetting = (key) =>
  fetch(`${BASE}/settings/${key}`).then(json).then(r => r.value)

export const setSetting = (key, value) =>
  fetch(`${BASE}/settings/${key}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ value }),
  }).then(json)

export const getKanbanLang = () => getSetting('kanban_lang')
export const setKanbanLang = (lang) => setSetting('kanban_lang', lang)

// ── Kanban columns (table indépendante GLPI) ──────────────────────────────────

export const getKanbanColumns = () =>
  getFromSQLite('kanban_columns')

export const updateKanbanColumn = (statusId, patch) =>
  fetch(`${BASE}/kanban_columns/${statusId}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(patch),
  }).then(json)
