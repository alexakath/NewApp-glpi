// ─── Mapping Item_Type CSV → module GLPI ─────────────────────────────────────
// Si Item_Type n'est pas dans cette liste → warning + ligne sautée

export const KNOWN_ITEM_TYPES = {
  Computer: { registryModule: 'computers', glpiPath: 'Assets/Computer', modelModule: 'computerModels' },
  Monitor:  { registryModule: 'monitors',  glpiPath: 'Assets/Monitor',  modelModule: 'monitorModels'  },
}

// ─── Mappings statut / priorité / type tickets (CSV anglais → entier GLPI) ───

export const TICKET_STATUS_MAP = {
  'new': 1, 'nouveau': 1,
  'in progress': 2, 'assigned': 2, 'en cours': 2,
  'planned': 3, 'planifié': 3,
  'pending': 4, 'en attente': 4,
  'solved': 5, 'résolu': 5,
  'closed': 6, 'clôturé': 6,
}

export const TICKET_PRIORITY_MAP = {
  'very low': 1, 'très basse': 1,
  'low': 2, 'basse': 2,
  'medium': 3, 'moyenne': 3,
  'high': 4, 'haute': 4,
  'very high': 5, 'très haute': 5,
}

export const TICKET_TYPE_MAP = {
  'incident': 1,
  'request': 2, 'demande': 2,
}

// ─── Modules détectables (niveau fichier) ────────────────────────────────────
// La détection se fait sur les headers CSV (scoring par poids).
// Un fichier peut contenir un ou plusieurs modules.

export const MODULES_CONFIG = {
  assets: {
    label: 'Actifs',
    importOrder: 1,
    detectionSignatures: {
      'item_type':        { weight: 5 },
      'name':             { weight: 2 },
      'inventory_number': { weight: 4 },
      'status':           { weight: 2 },
      'location':         { weight: 2 },
      'manufacturer':     { weight: 2 },
      'model':            { weight: 1 },
      'user':             { weight: 1 },
    },
    detectionThreshold: 5,
  },

  tickets: {
    label: 'Tickets',
    importOrder: 2,
    detectionSignatures: {
      'ref_ticket':  { weight: 5 },
      'titre':       { weight: 4 },
      'description': { weight: 2 },
      'priority':    { weight: 2 },
      'items':       { weight: 3 },
    },
    detectionThreshold: 4,
  },

  ticketCosts: {
    label: 'Coûts tickets',
    importOrder: 3,
    detectionSignatures: {
      'num_ticket':      { weight: 5 },
      'duration_second': { weight: 4 },
      'time_cost':       { weight: 3 },
      'fixed_cost':      { weight: 3 },
    },
    detectionThreshold: 5,
  },
}

export const MODULE_KEYS = Object.keys(MODULES_CONFIG)

// ─── Sous-modules (ce qui apparaît réellement dans le plan et les barres) ────
// Un module "assets" se déroule en 8 sous-modules séquentiels.

export const SUB_MODULE_META = {
  states:         { label: 'Statuts',            color: '#f59e0b', icon: 'ti-tag',            parentModule: 'assets' },
  locations:      { label: 'Localisations',       color: '#8b5cf6', icon: 'ti-map-pin',        parentModule: 'assets' },
  manufacturers:  { label: 'Fabricants',          color: '#6366f1', icon: 'ti-building-factory', parentModule: 'assets' },
  computerModels: { label: 'Modèles Ordinateurs', color: '#0ea5e9', icon: 'ti-cpu',            parentModule: 'assets' },
  monitorModels:  { label: 'Modèles Moniteurs',   color: '#06b6d4', icon: 'ti-device-desktop', parentModule: 'assets' },
  users:          { label: 'Utilisateurs',        color: '#ec4899', icon: 'ti-user',           parentModule: 'assets' },
  computers:      { label: 'Ordinateurs',         color: '#3b82f6', icon: 'ti-device-laptop',  parentModule: 'assets' },
  monitors:       { label: 'Moniteurs',           color: '#10b981', icon: 'ti-device-desktop', parentModule: 'assets' },
  tickets:        { label: 'Tickets',             color: '#6366f1', icon: 'ti-ticket',         parentModule: 'tickets' },
  ticketCosts:    { label: 'Coûts tickets',       color: '#64748b', icon: 'ti-receipt',        parentModule: 'ticketCosts' },
  images:         { label: 'Images',              color: '#f97316', icon: 'ti-photo',          parentModule: 'images' },
}

// Ordre strict d'exécution des sous-modules (dépendances respectées)
export const SUB_MODULE_ORDER = [
  'states', 'locations', 'manufacturers', 'computerModels', 'monitorModels',
  'users', 'computers', 'monitors', 'tickets', 'ticketCosts',
]

// Dépendances affichées dans le plan UI
export const SUB_MODULE_DEPS = {
  computers:    ['states', 'locations', 'manufacturers', 'computerModels', 'users'],
  monitors:     ['states', 'locations', 'manufacturers', 'monitorModels',  'users'],
  tickets:      ['computers', 'monitors'],
  ticketCosts:  ['tickets'],
}

// Expand un module détecté en sous-modules réels
export const expandModule = (moduleKey) => {
  if (moduleKey === 'assets') {
    return ['states', 'locations', 'manufacturers', 'computerModels', 'monitorModels', 'users', 'computers', 'monitors']
  }
  if (moduleKey === 'tickets')     return ['tickets']
  if (moduleKey === 'ticketCosts') return ['ticketCosts']
  return []
}
