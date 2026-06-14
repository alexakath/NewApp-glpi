const express = require('express')
const router  = express.Router()
const db      = require('../db')

router.post('/', (req, res) => {
  const { ticket_id, fixed_cost, type } = req.body

  if (!ticket_id || fixed_cost === undefined)
    return res.status(400).json({error : 'ticket_id et fixed_cost sont recquises'})
    const info = db.prepare(
        'INSERT INTO ticket_costs (ticket_id, fixed_cost, type) VALUES (?,?,?)'
    ).run(Number(ticket_id), Number(fixed_cost), type || 'fixed')
    res.json({ id: info.lastInsertRowid, ticket_id: Number(ticket_id), fixed_cost: Number(fixed_cost), type: type || 'fixed'})
})

router.get('/ticket/:ticket_id', (req, res) => {
  const rows = db.prepare('SELECT * FROM ticket_costs WHERE ticket_id = ? ORDER BY id DESC').all(Number(req.params.ticket_id))
  res.json(rows)
})

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM ticket_costs WHERE id = ?').run(Number(req.params.id))
  res.json( {deleted: info.changes})
})

module.exports = router
