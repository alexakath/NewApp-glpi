const Database   = require('better-sqlite3')
const path       = require('path')
const fs         = require('fs')
const { MODULES } = require('./modules')

const DATA_DIR = path.join(__dirname, 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(path.join(DATA_DIR, 'newapp.db'))
db.pragma('journal_mode = WAL')

// Crée toutes les tables déclarées dans modules/index.js
Object.values(MODULES).forEach(mod => db.exec(mod.schema))

const ticketCostsCols = db.prepare("PRAGMA table_info(ticket_costs)").all().map(c => c.name)
if(!ticketCostsCols.includes('type')) {
  db.exec("ALTER TABLE ticket_costs ADD COLUMN type TEXT NOT NULL DEFAULT 'fixed'")
}
if(!ticketCostsCols.includes('pct')) {
  db.exec("ALTER TABLE ticket_costs ADD COLUMN pct REAL")
}
if(!ticketCostsCols.includes('mode')) {
  db.exec("ALTER TABLE ticket_costs ADD COLUMN mode INTEGER")
}

const ticketsCols = db.prepare("PRAGMA table_info(tickets)").all().map(c => c.name)
if (!ticketsCols.includes('ref_user')) {
  db.exec("ALTER TABLE tickets ADD COLUMN ref_user TEXT")
}
// Table settings — indépendante, pas dans MODULES (routes custom uniquement)
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`)

module.exports = db
