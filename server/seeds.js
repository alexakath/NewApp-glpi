// Valeurs par défaut insérées au démarrage du serveur.
// INSERT OR IGNORE : ne modifie jamais une valeur déjà personnalisée par l'utilisateur.
const db = require('./db')

// Les 3 statuts GLPI utilisés pour le Kanban frontoffice
const KANBAN_DEFAULTS = [
  { status_id: 1, color: '#dbeafe', label_mg: 'Vaovao' },    // Nouveau
  { status_id: 2, color: '#fef9c3', label_mg: 'Efa manao' }, // En cours
  { status_id: 5, color: '#dcfce7', label_mg: 'Vita' },      // Fermé
]

const seedKanban = () => {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO kanban_columns (status_id, color, label_mg) VALUES (?, ?, ?)'
  )
  KANBAN_DEFAULTS.forEach(r => insert.run(r.status_id, r.color, r.label_mg))
}

module.exports = { seedKanban }
