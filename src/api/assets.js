import { getItems, getItem } from './glpi'

// ─── Registre des types d'actifs affichés dans le front-office ───────────────
// Pour ajouter un type GLPI supplémentaire (ex. "Cable", "Software"), il suffit
// d'ajouter une ligne ici — aucune autre modification n'est nécessaire pour que
// l'actif apparaisse dans la liste, les filtres et la page de détail générique.
//
// glpiPath    : chemin v2 de l'API  → GET /api.php/v2.3/{glpiPath}
// label       : libellé singulier (badge de carte, fil d'ariane)
// labelPlural : libellé pluriel (titre de section, option de filtre)

export const ASSET_TYPES = {
  Computer:         { glpiPath: 'Assets/Computer',         label: 'Ordinateur',        labelPlural: 'Ordinateurs' },
  Monitor:          { glpiPath: 'Assets/Monitor',          label: 'Moniteur',          labelPlural: 'Moniteurs' },
  Peripheral:       { glpiPath: 'Assets/Peripheral',       label: 'Périphérique',      labelPlural: 'Périphériques' },
  Printer:          { glpiPath: 'Assets/Printer',          label: 'Imprimante',        labelPlural: 'Imprimantes' },
  NetworkEquipment: { glpiPath: 'Assets/NetworkEquipment', label: 'Équip. réseau',     labelPlural: 'Équipements réseau' },
  Phone:            { glpiPath: 'Assets/Phone',            label: 'Téléphone',         labelPlural: 'Téléphones' },
}

export const ASSET_TYPE_KEYS = Object.keys(ASSET_TYPES)

// Récupère la liste des actifs d'un type donné (ex: getAssets('Peripheral'))
export const getAssets = (itemtype, params = {}) => {
  const cfg = ASSET_TYPES[itemtype]
  if (!cfg) throw new Error(`Type d'actif inconnu : ${itemtype}`)
  return getItems(cfg.glpiPath, { sort: 'name', order: 'ASC', ...params })
}

// Récupère le détail complet d'un actif par son type + son ID
export const getAssetFull = (itemtype, id) => {
  const cfg = ASSET_TYPES[itemtype]
  if (!cfg) throw new Error(`Type d'actif inconnu : ${itemtype}`)
  return getItem(cfg.glpiPath, id)
}
