// Source de vérité pour tous les modules SQLite.
// Pour ajouter un nouveau module (ex: computers) :
//   1. Ajouter une entrée ici avec schema + columns + mapRow
//   2. C'est tout — routes et tables créées automatiquement.

const toInt = (val) => {
  if (val === null || val === undefined) return null
  if (typeof val === 'object') return val?.id ?? null
  return Number(val) || null
}

const toStr = (val) => {
  if (val === null || val === undefined) return null
  if (typeof val === 'object') return val?.name ?? null
  return String(val)
}

const MODULES = {

  // ── Copié depuis GLPI ─────────────────────────────────────────────────────
  tickets: {
    orderBy: 'date_mod DESC',
    schema: `
      CREATE TABLE IF NOT EXISTS tickets (
        id        INTEGER PRIMARY KEY,
        name      TEXT,
        content   TEXT,
        status    INTEGER,
        type      INTEGER,
        urgency   INTEGER,
        priority  INTEGER,
        date      TEXT,
        date_mod  TEXT,
        data_json TEXT,
        ref_user  TEXT,
        synced_at TEXT DEFAULT (datetime('now'))
      )
    `,
    columns: ['id', 'name', 'content', 'status', 'type', 'urgency', 'priority', 'date', 'date_mod', 'data_json'],
    mapRow: (t) => ({
      id:        Number(t.id),
      name:      t.name     ?? null,
      content:   t.content  ?? null,
      status:    toInt(t.status),
      type:      toInt(t.type),
      urgency:   toInt(t.urgency),
      priority:  toInt(t.priority),
      date:      t.date     ?? null,
      date_mod:  t.date_mod ?? null,
      data_json: JSON.stringify(t),
    }),
  },

  // ── Exemple : ajouter computers ───────────────────────────────────────────
  // computers: {
  //   orderBy: 'name ASC',
  //   schema: `
  //     CREATE TABLE IF NOT EXISTS computers (
  //       id           INTEGER PRIMARY KEY,
  //       name         TEXT,
  //       serial       TEXT,
  //       status       INTEGER,
  //       location     TEXT,
  //       manufacturer TEXT,
  //       data_json    TEXT,
  //       synced_at    TEXT DEFAULT (datetime('now'))
  //     )
  //   `,
  //   columns: ['id', 'name', 'serial', 'status', 'location', 'manufacturer', 'data_json'],
  //   mapRow: (c) => ({
  //     id:           Number(c.id),
  //     name:         c.name        ?? null,
  //     serial:       c.otherserial ?? null,
  //     status:       toInt(c.status),
  //     location:     toStr(c.location),
  //     manufacturer: toStr(c.manufacturer),
  //     data_json:    JSON.stringify(c),
  //   }),
  // },

  // ── Tables indépendantes de GLPI ──────────────────────────────────────────
  // Pas de mapRow ici — React écrit directement, pas de sync GLPI.

  kanban_columns: {
    orderBy: 'status_id ASC',
    schema: `
      CREATE TABLE IF NOT EXISTS kanban_columns (
        status_id  INTEGER PRIMARY KEY,
        color      TEXT    NOT NULL DEFAULT '#f1f5f9',
        label_mg   TEXT    NOT NULL DEFAULT '',
        updated_at TEXT    DEFAULT (datetime('now'))
      )
    `,
  },
  ticket_costs: {
    orderBy: 'created_at DESC',
    schema: `
      CREATE TABLE IF NOT EXISTS ticket_costs (
        id  INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id   INTEGER NOT NULL,
        fixed_cost  REAL NOT NULL,
        type TEXT NOT NULL DEFAULT 'fixed',
        created_at TEXT    DEFAULT (datetime('now'))
      )
    `,
  },
}

module.exports = { MODULES, toInt, toStr }
