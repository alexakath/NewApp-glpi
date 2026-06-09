// ─── Mapping Item_Type CSV → module GLPI ─────────────────────────────────────
// Source de vérité unique pour les types d'actifs.
// Ajouter une entrée ici propage automatiquement le type dans toute la chaîne
// d'import : sous-modules, ordre d'exécution, dépendances, détection images.

export const KNOWN_ITEM_TYPES = {
  Computer: {
    csvType:        'computer',                    // valeur CSV (insensible à la casse)
    glpiPath:       'Assets/Computer',
    modelGlpiPath:  'Dropdowns/ComputerModel',
    modelModule:    'computerModels',
    registryModule: 'computers',
    label:          'Ordinateurs',
    modelLabel:     'Modèles Ordinateurs',
    color:          '#3b82f6',
    modelColor:     '#0ea5e9',
    icon:           'ti-device-laptop',
    modelIcon:      'ti-cpu',
  },
  Monitor: {
    csvType:        'monitor',
    glpiPath:       'Assets/Monitor',
    modelGlpiPath:  'Dropdowns/MonitorModel',
    modelModule:    'monitorModels',
    registryModule: 'monitors',
    label:          'Moniteurs',
    modelLabel:     'Modèles Moniteurs',
    color:          '#10b981',
    modelColor:     '#06b6d4',
    icon:           'ti-device-desktop',
    modelIcon:      'ti-device-desktop',
  },
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

// ─── Sous-modules ─────────────────────────────────────────────────────────────
// Les entrées spécifiques aux types d'actifs sont dérivées de KNOWN_ITEM_TYPES.
// Les autres (statuts, localisations, fabricants, utilisateurs, tickets…)
// sont déclarés statiquement.

const _assetModelMeta = Object.fromEntries(
  Object.values(KNOWN_ITEM_TYPES).map(t => [
    t.modelModule,
    { label: t.modelLabel, color: t.modelColor, icon: t.modelIcon, parentModule: 'assets' },
  ])
)
const _assetMeta = Object.fromEntries(
  Object.values(KNOWN_ITEM_TYPES).map(t => [
    t.registryModule,
    { label: t.label, color: t.color, icon: t.icon, parentModule: 'assets' },
  ])
)

export const SUB_MODULE_META = {
  states:        { label: 'Statuts',       color: '#f59e0b', icon: 'ti-tag',              parentModule: 'assets' },
  locations:     { label: 'Localisations', color: '#8b5cf6', icon: 'ti-map-pin',          parentModule: 'assets' },
  manufacturers: { label: 'Fabricants',    color: '#6366f1', icon: 'ti-building-factory', parentModule: 'assets' },
  ..._assetModelMeta,
  users:         { label: 'Utilisateurs',  color: '#ec4899', icon: 'ti-user',             parentModule: 'assets' },
  ..._assetMeta,
  tickets:       { label: 'Tickets',       color: '#6366f1', icon: 'ti-ticket',           parentModule: 'tickets' },
  ticketCosts:   { label: 'Coûts tickets', color: '#64748b', icon: 'ti-receipt',          parentModule: 'ticketCosts' },
  images:        { label: 'Images',        color: '#f97316', icon: 'ti-photo',            parentModule: 'images' },
}

// Ordre strict d'exécution — dépendances FK respectées :
// modèles avant actifs, actifs avant tickets
export const SUB_MODULE_ORDER = [
  'states', 'locations', 'manufacturers',
  ...Object.values(KNOWN_ITEM_TYPES).map(t => t.modelModule),
  'users',
  ...Object.values(KNOWN_ITEM_TYPES).map(t => t.registryModule),
  'tickets', 'ticketCosts',
]

// Dépendances affichées dans le plan UI (pas d'impact sur l'exécution)
export const SUB_MODULE_DEPS = {
  ...Object.fromEntries(
    Object.values(KNOWN_ITEM_TYPES).map(t => [
      t.registryModule,
      ['states', 'locations', 'manufacturers', t.modelModule, 'users'],
    ])
  ),
  tickets:     Object.values(KNOWN_ITEM_TYPES).map(t => t.registryModule),
  ticketCosts: ['tickets'],
}

// Expand un module détecté (niveau fichier) en sous-modules réels
export const expandModule = (moduleKey) => {
  if (moduleKey === 'assets') return [
    'states', 'locations', 'manufacturers',
    ...Object.values(KNOWN_ITEM_TYPES).map(t => t.modelModule),
    'users',
    ...Object.values(KNOWN_ITEM_TYPES).map(t => t.registryModule),
  ]
  if (moduleKey === 'tickets')     return ['tickets']
  if (moduleKey === 'ticketCosts') return ['ticketCosts']
  return []
}
