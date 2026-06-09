const express        = require('express')
const router         = express.Router()
const db             = require('../db')
const { MODULES }    = require('../modules')

// POST /api/sync/:moduleKey
// Reçoit un tableau JSON depuis React et upsert dans la table correspondante.
// Fonctionne pour tout module enregistré dans modules/index.js.
router.post('/:moduleKey', (req, res) => {
  const { moduleKey } = req.params
  const mod = MODULES[moduleKey]

  if (!mod)               return res.status(404).json({ error: `Module '${moduleKey}' non enregistré dans modules/index.js.` })
  if (!mod.mapRow)        return res.status(400).json({ error: `Module '${moduleKey}' n'a pas de mapRow — il n'est pas synchronisable depuis GLPI.` })
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Le body doit être un tableau.' })

  const cols      = mod.columns
  const colsList  = cols.join(', ')
  const valsList  = cols.map(c => `@${c}`).join(', ')
  const updateSet = cols.filter(c => c !== 'id').map(c => `${c} = excluded.${c}`).join(', ')

  const upsert = db.prepare(`
    INSERT INTO ${moduleKey} (${colsList}, synced_at)
    VALUES (${valsList}, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      ${updateSet},
      synced_at = datetime('now')
  `)

  const insertMany = db.transaction((rows) => {
    for (const item of rows) upsert.run(mod.mapRow(item))
  })

  insertMany(req.body)
  res.json({ stored: req.body.length, message: `${req.body.length} ${moduleKey} stocké(s) dans SQLite.` })
})

module.exports = router
