// Factory générique — crée un router Express GET / GET/count / DELETE
// pour n'importe quel module enregistré dans modules/index.js.
const express = require('express')
const db      = require('../db')

const makeResourceRouter = (key, mod) => {
  const router  = express.Router()
  const orderBy = mod.orderBy || 'id DESC'

  router.get('/', (req, res) =>
    res.json(db.prepare(`SELECT * FROM ${key} ORDER BY ${orderBy}`).all())
  )

  router.get('/count', (req, res) =>
    res.json(db.prepare(`SELECT COUNT(*) as count FROM ${key}`).get())
  )

  router.delete('/', (req, res) => {
    const info = db.prepare(`DELETE FROM ${key}`).run()
    res.json({ deleted: info.changes, message: `Table ${key} vidée.` })
  })

  return router
}

module.exports = makeResourceRouter
