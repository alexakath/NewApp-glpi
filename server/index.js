require('dotenv').config()
const express            = require('express')
const cors               = require('cors')
const { MODULES }        = require('./modules')
const db                 = require('./db')
const makeResourceRouter = require('./routes/resource')
const { seedKanban, seedSettings } = require('./seeds')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Valeurs par défaut pour les tables indépendantes
seedKanban()
seedSettings()

// Auto-enregistrement des routes de lecture pour chaque module
Object.entries(MODULES).forEach(([key, mod]) => {
  app.use(`/api/${key}`, makeResourceRouter(key, mod))
})

// Routes d'écriture custom pour tables indépendantes
app.use('/api/kanban_columns', require('./routes/kanban'))
app.use('/api/settings',       require('./routes/settings'))
app.use('/api/ticket_costs',   require('./routes/ticketCosts'))

// Route de synchronisation générique (POST /api/sync/:moduleKey)
app.use('/api/sync', require('./routes/sync'))

// Associe une référence utilisateur stable à un ticket GLPI (survit aux syncs)
app.put('/api/tickets/:id/ref', (req, res) => {
  const { id } = req.params
  const { ref_user } = req.body ?? {}
  if (ref_user == null) return res.status(400).json({ error: 'ref_user manquant' })
  db.prepare(`
    INSERT INTO tickets (id, ref_user) VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET ref_user = excluded.ref_user
  `).run(Number(id), String(ref_user))
  res.json({ ok: true })
})

// Health check
app.get('/api/health', (req, res) =>
  res.json({ ok: true, backend: 'newapp-server', db: 'sqlite', modules: Object.keys(MODULES) })
)

app.listen(PORT, () => {
  console.log(`Backend NewApp → http://localhost:${PORT}`)
  console.log(`Modules        : ${Object.keys(MODULES).join(', ')}`)
})


