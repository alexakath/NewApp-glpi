require('dotenv').config()
const express            = require('express')
const cors               = require('cors')
const { MODULES }        = require('./modules')
const makeResourceRouter = require('./routes/resource')
const { seedKanban }     = require('./seeds')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Valeurs par défaut pour les tables indépendantes
seedKanban()

// Auto-enregistrement des routes de lecture pour chaque module
Object.entries(MODULES).forEach(([key, mod]) => {
  app.use(`/api/${key}`, makeResourceRouter(key, mod))
})

// Routes d'écriture custom pour tables indépendantes
app.use('/api/kanban_columns', require('./routes/kanban'))

// Route de synchronisation générique (POST /api/sync/:moduleKey)
app.use('/api/sync', require('./routes/sync'))

// Health check
app.get('/api/health', (req, res) =>
  res.json({ ok: true, backend: 'newapp-server', db: 'sqlite', modules: Object.keys(MODULES) })
)

app.listen(PORT, () => {
  console.log(`Backend NewApp → http://localhost:${PORT}`)
  console.log(`Modules        : ${Object.keys(MODULES).join(', ')}`)
})
