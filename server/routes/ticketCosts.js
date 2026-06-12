const express = require('express')
const router  = express.Router()
const db      = require('../db')

router.post('/', (req, res) => {
  const { ticket_id, fixed_cost } = req.body

  if (!ticket_id || fixed_cost === undefined)
    return res.status(400).json({error : 'ticket_id et fixed_cost sont recquises'})
    const info = db.prepare(
        'INSERT INTO ticket_costs (ticket_id, fixed_cost) VALUES (?,?)'
    ).run(Number(ticket_id), Number(fixed_cost))
    res.json({ id: info.lastInsertRowid, ticket_id: Number(ticket_id), fixed_cost: Number(fixed_cost)})
})

module.exports = router
