const express = require('express')
const router  = express.Router()
const db      = require('../db')

router.post('/', (req, res) => {
  const { ticket_id, fixed_cost, type, pct, mode } = req.body

  if (!ticket_id || fixed_cost === undefined)
    return res.status(400).json({error : 'ticket_id et fixed_cost sont recquises'})
    const info = db.prepare(
        'INSERT INTO ticket_costs (ticket_id, fixed_cost, type, pct, mode) VALUES (?,?,?,?,?)'
    ).run(Number(ticket_id), Number(fixed_cost), type || 'fixed', pct != null ? Number(pct) : null, mode != null ? Number(mode) : null)
    res.json({ id: info.lastInsertRowid, ticket_id: Number(ticket_id), fixed_cost: Number(fixed_cost), type: type || 'fixed', pct : pct ?? null, mode: mode ?? null})
})

router.get('/ticket/:ticket_id', (req, res) => {
  const rows = db.prepare('SELECT * FROM ticket_costs WHERE ticket_id = ? ORDER BY id DESC').all(Number(req.params.ticket_id))
  res.json(rows)
})

router.get('/', (req, res) => {
  const rows =db.prepare('SELECT * FROM ticket_costs ORDER BY id DESC').all()
  res.json(rows)
})

router.put('/:id', (req, res) => {
  const {fixed_cost, pct, mode} = req.body
  const id = Number(req.params.id)
  if(fixed_cost === undefined)
    return res.status(400).json({error: 'fixed_cost recquis'})
  db.prepare(
    'UPDATE ticket_costs SET fixed_cost = ?, pct = ?, mode = ? WHERE id = ?'
  ).run(Number(fixed_cost), pct != null ? Number(pct) : null, mode != null ? Number(mode) : null, id)
  const row = db.prepare('SELECT * FROM ticket_Costs WHERE id = ?').get(id)
  res.json(row)
})

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM ticket_costs WHERE id = ?').run(Number(req.params.id))
  res.json( {deleted: info.changes})
})

router.post('/cancel/:id', (req, res) => {
  const id = Number(req.params.id)
  const {prev_status} = req.body
  const row = db.prepare('SELECT * FROM ticket_costs WHERE id = ?').get(id)
  if(!row) return res.status(404).json({error: 'Not found'})
    db.prepare(
  'INSERT INTO cancelled_costs (original_id, ticket_id, fixed_cost, type, pct, mode, created_at, prev_status) VALUES (?,?,?,?,?,?,?,?)'
  ).run(row.id, row.ticket_id,row.fixed_cost,row.type,row.pct,row.mode,row.created_at, prev_status || 5)
  db.prepare('DELETE FROM ticket_costs WHERE id = ?').run(id)
  res.json({ok: true})
})

router.get('/cancelled', (req, res) => {
  res.json(db.prepare('SELECT * FROM cancelled_costs ORDER BY cancelled_at DESC').all())
})

router.post('/restore/:id', (req, res) => {
  const id = Number(req.params.id)
  const row = db.prepare('SELECT * FROM cancelled_costs WHERE id = ?').get(id)
  if(!row) return res.status(404).json({errot: 'Not found'})
    db.prepare('DELETE FROM ticket_costs WHERE id = ?').run(row.original_id)
    db.prepare(
      'INSERT INTO ticket_costs (id, ticket_id, fixed_cost, type, pct, mode, created_at) VALUES (?,?,?,?,?,?,?)'
    ).run(row.original_id, row.ticket_id, row.fixed_cost, row.type, row.pct, row.mode, row.created_at)
    db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(row.prev_status, row.ticket_id)
    db.prepare('DELETE FROM cancelled_costs WHERE id = ?').run(id)
    res.json({original_id: row.original_id, ticket_id: row.ticket_id, prev_status: row.prev_status})
})

module.exports = router
