// ─── Source de vérité unique pour les types d'actifs ─────────────────────────
//
// Pour ajouter un nouveau type : UNE SEULE LIGNE dans ASSET_TYPE_META.
// Tout le reste (import, dashboard, plan, progress...) se dérive automatiquement.
//
// Convention GLPI v2 :
//   glpiPath  → Assets/{ItemType}
//   modelPath → Dropdowns/{ItemType}Model
//
// Si un type s'écarte de cette convention, ajouter une entrée dans GLPI_PATH_OVERRIDES.

// hasModel: false → pas de dropdown Dropdowns/{Type}Model dans GLPI pour ce type
export const ASSET_TYPE_META = {
  //                          label affichée           couleur     icône Tabler            modèle?
  Computer:           { label: 'Ordinateurs',        color: '#3b82f6', icon: 'ti-device-laptop'  },
  Monitor:            { label: 'Moniteurs',           color: '#10b981', icon: 'ti-device-desktop' },
  Printer:            { label: 'Imprimantes',         color: '#f59e0b', icon: 'ti-printer'        },
  Phone:              { label: 'Téléphones',          color: '#8b5cf6', icon: 'ti-phone'          },
  NetworkEquipment:   { label: 'Équip. réseau',       color: '#06b6d4', icon: 'ti-network'        },
  Peripheral:         { label: 'Périphériques',       color: '#ec4899', icon: 'ti-mouse'          },
  Enclosure:          { label: 'Châssis',             color: '#64748b', icon: 'ti-server'         },
  PDU:                { label: 'PDU',                 color: '#84cc16', icon: 'ti-plug',           hasModel: false },
  PassiveDCEquipment: { label: 'Équip. passif DC',    color: '#94a3b8', icon: 'ti-cable',          hasModel: false },
  Cable:              { label: 'Câbles',              color: '#a78bfa', icon: 'ti-plug-connected', hasModel: false },
  Socket:             { label: 'Prises',              color: '#f472b6', icon: 'ti-plug',           hasModel: false },
  Appliance:          { label: 'Appliances',          color: '#34d399', icon: 'ti-server-2',       hasModel: false },
  Software:           { label: 'Logiciels',           color: '#60a5fa', icon: 'ti-apps',           hasModel: false },
  SoftwareLicense:    { label: 'Licences logiciels',  color: '#f97316', icon: 'ti-license',        hasModel: false },
  Certificate:        { label: 'Certificats',         color: '#4ade80', icon: 'ti-certificate',    hasModel: false },
  Rack:               { label: 'Baies',               color: '#e2e8f0', icon: 'ti-server',         hasModel: false },
}

// Exceptions aux paths GLPI conventionnels Assets/{Type}
const GLPI_PATH_OVERRIDES = {}

// ─── Générateur de config par convention ─────────────────────────────────────
// buildItemTypeConfig('Printer') → { glpiPath:'Assets/Printer', modelModule:'printer_models', ... }
// Fonctionne pour tout type GLPI standard, connu ou inconnu dans ASSET_TYPE_META.

export const buildItemTypeConfig = (itemType) => {
  const meta     = ASSET_TYPE_META[itemType] ?? {}
  const slug     = itemType.toLowerCase()
  const hasModel = meta.hasModel !== false  // true par défaut, false si explicitement désactivé
  return {
    itemType,
    csvType:        slug,
    glpiPath:       GLPI_PATH_OVERRIDES[itemType] ?? `Assets/${itemType}`,
    modelGlpiPath:  hasModel ? `Dropdowns/${itemType}Model` : null,
    modelModule:    hasModel ? `${slug}_models` : null,
    registryModule: slug,
    label:          meta.label ?? itemType,
    modelLabel:     `Modèles ${meta.label ?? itemType}`,
    color:          meta.color ?? '#64748b',
    modelColor:     '#94a3b8',
    icon:           meta.icon  ?? 'ti-device-desktop',
    modelIcon:      'ti-cpu',
  }
}

// ─── KNOWN_ITEM_TYPES — généré depuis ASSET_TYPE_META ─────────────────────────
// Ne jamais modifier manuellement. Ajouter dans ASSET_TYPE_META suffit.

export const KNOWN_ITEM_TYPES = Object.fromEntries(
  Object.keys(ASSET_TYPE_META).map(t => [t, buildItemTypeConfig(t)])
)

// Lookup insensible à la casse : "computer" → "Computer", "pdu" → "PDU"
const _csvToItemType = Object.fromEntries(
  Object.keys(ASSET_TYPE_META).map(t => [t.toLowerCase(), t])
)

// Normalise une valeur CSV Item_Type → clé exacte GLPI
export const normalizeItemType = (csvValue) => {
  const lower = String(csvValue ?? '').trim().toLowerCase()
  return _csvToItemType[lower] ?? (lower.charAt(0).toUpperCase() + lower.slice(1))
}

// ─── Mappings statut / priorité / type tickets ────────────────────────────────

// ─── Statuts tickets — synonymes connus → ID GLPI fixe (1-6) ─────────────────
// GLPI ne propose que 6 statuts (fixes). Pour reconnaître un nouveau mot dans
// les fichiers d'import, il suffit de l'ajouter dans le tableau correspondant.
export const STATUS_SYNONYMS = {
  1: ['new', 'nouveau', 'open', 'ouvert'],
  2: ['in progress (assigned)', 'in progress', 'assigned', 'en cours (attribué)', 'en cours'],
  3: ['in progress (planned)', 'planned', 'planifié'],
  4: ['pending', 'en attente'],
  5: ['solved', 'résolu', 'resolved'],
  6: ['closed', 'clôturé', 'cloture'],
}
export const TICKET_STATUS_MAP = Object.fromEntries(
  Object.entries(STATUS_SYNONYMS).flatMap(([id, words]) => words.map(w => [w, Number(id)]))
)

// ─── Priorités tickets — synonymes connus → ID GLPI fixe (1-6) ───────────────
export const PRIORITY_SYNONYMS = {
  1: ['very low', 'très basse'],
  2: ['low', 'basse'],
  3: ['medium', 'moyenne'],
  4: ['high', 'haute'],
  5: ['very high', 'très haute'],
  6: ['critical', 'majeure', 'urgent', 'major'],
}
export const TICKET_PRIORITY_MAP = Object.fromEntries(
  Object.entries(PRIORITY_SYNONYMS).flatMap(([id, words]) => words.map(w => [w, Number(id)]))
)

export const TICKET_TYPE_MAP = {
  'incident': 1,
  'request': 2, 'demande': 2,
}

// ─── Modules détectables (niveau fichier) ────────────────────────────────────

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

// ─── Sous-modules — tout dérivé de KNOWN_ITEM_TYPES ──────────────────────────

const _assetModelMeta = Object.fromEntries(
  Object.values(KNOWN_ITEM_TYPES)
    .filter(t => t.modelModule)
    .map(t => [
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

// Ordre canonique de référence pour le tri dans buildImportPlan
export const SUB_MODULE_ORDER = [
  'states', 'locations', 'manufacturers',
  ...Object.values(KNOWN_ITEM_TYPES).filter(t => t.modelModule).map(t => t.modelModule),
  'users',
  ...Object.values(KNOWN_ITEM_TYPES).map(t => t.registryModule),
  'tickets', 'ticketCosts',
]

export const SUB_MODULE_DEPS = {
  ...Object.fromEntries(
    Object.values(KNOWN_ITEM_TYPES).map(t => [
      t.registryModule,
      ['states', 'locations', 'manufacturers', ...(t.modelModule ? [t.modelModule] : []), 'users'],
    ])
  ),
  tickets:     Object.values(KNOWN_ITEM_TYPES).map(t => t.registryModule),
  ticketCosts: ['tickets'],
}

// expandModule — assets géré dynamiquement dans buildImportPlan (filtre par CSV)
export const expandModule = (moduleKey) => {
  if (moduleKey === 'tickets')     return ['tickets']
  if (moduleKey === 'ticketCosts') return ['ticketCosts']
  return []
}
