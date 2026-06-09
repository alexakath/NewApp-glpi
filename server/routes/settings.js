const express = require('express')
const router  = express.Router()
const db      = require('../db')

// GET /api/settings — toutes les settings sous forme d'objet { key: value }
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings ORDER BY key').all()
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])))
})

// GET /api/settings/:key — une valeur précise
router.get('/:key', (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key)
  if (!row) return res.status(404).json({ error: `Setting '${req.params.key}' introuvable.` })
  res.json({ key: req.params.key, value: row.value })
})

// PUT /api/settings/:key — créer ou mettre à jour
router.put('/:key', (req, res) => {
  const { value } = req.body
  if (value === undefined) return res.status(400).json({ error: 'Champ value requis.' })
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(req.params.key, String(value))
  res.json({ ok: true })
})

module.exports = router
