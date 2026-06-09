// Routes d'écriture pour kanban_columns (table indépendante de GLPI).
// GET /api/kanban_columns et DELETE sont gérés par resource.js (auto).
// Ce fichier ajoute uniquement PUT (mise à jour d'une colonne).
const express = require('express')
const router  = express.Router()
const db      = require('../db')

// PUT /api/kanban_columns/:status_id
// Body : { color?: "#rrggbb", label_mg?: "..." }
router.put('/:status_id', (req, res) => {
  const statusId = Number(req.params.status_id)
  const { color, label_mg } = req.body

  const fields = []
  const values = []
  if (color    !== undefined) { fields.push('color = ?');    values.push(color) }
  if (label_mg !== undefined) { fields.push('label_mg = ?'); values.push(label_mg) }

  if (fields.length === 0)
    return res.status(400).json({ error: 'Rien à mettre à jour (color ou label_mg attendu).' })

  values.push(statusId)
  db.prepare(
    `UPDATE kanban_columns SET ${fields.join(', ')}, updated_at = datetime('now') WHERE status_id = ?`
  ).run(...values)

  res.json({ ok: true })
})

module.exports = router
