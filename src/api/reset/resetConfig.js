import { ASSET_TYPE_META, buildItemTypeConfig } from '../import/modulesConfig'

// Comptes créés automatiquement par l'installation de GLPI — jamais supprimés
export const PROTECTED_USERS = ['glpi', 'post-only', 'tech', 'normal', 'glpi-system']

const isProtectedUser = (user) =>
  PROTECTED_USERS.includes(String(user.username ?? user.name ?? '').toLowerCase())

// ─── Génération dynamique depuis ASSET_TYPE_META ──────────────────────────────
// Ajouter un type dans ASSET_TYPE_META l'inclut automatiquement dans la
// réinitialisation, dans le bon ordre (actifs avant leurs modèles).

const _assetTypeKeys  = Object.keys(ASSET_TYPE_META)
const _modelTypeKeys  = _assetTypeKeys.filter(t => ASSET_TYPE_META[t].hasModel !== false)

// Actifs — order 3, 4, 5, ... (après tickets=1 et images=2)
const _assetEntries = Object.fromEntries(
  _assetTypeKeys.map((itemType, i) => {
    const cfg  = buildItemTypeConfig(itemType)
    const meta = ASSET_TYPE_META[itemType]
    return [cfg.registryModule, {
      label:     meta.label,
      color:     meta.color    ?? '#64748b',
      icon:      meta.icon     ?? 'ti-device-desktop',
      glpiPath:  cfg.glpiPath,
      order:     3 + i,
      trashable: true,
    }]
  })
)

const _usersOrder = 3 + _assetTypeKeys.length

// Modèles — order juste après utilisateurs (pas de corbeille GLPI)
const _modelEntries = Object.fromEntries(
  _modelTypeKeys.map((itemType, i) => {
    const cfg = buildItemTypeConfig(itemType)
    return [cfg.modelModule, {
      label:     cfg.modelLabel,
      color:     cfg.modelColor,
      icon:      cfg.modelIcon,
      glpiPath:  cfg.modelGlpiPath,
      order:     _usersOrder + 1 + i,
      trashable: false,
      note:      'Pas de corbeille GLPI pour ce type — suppression directe à la purge',
    }]
  })
)

const _dropdownBase = _usersOrder + 1 + _modelTypeKeys.length

// ─── RESET_MODULES ────────────────────────────────────────────────────────────

export const RESET_MODULES = {
  tickets: {
    label: 'Tickets', color: '#6366f1', icon: 'ti-ticket',
    glpiPath: 'Assistance/Ticket',
    order: 1, trashable: true,
    note: 'Supprime aussi les coûts et liens associés (purge en cascade GLPI)',
  },
  images: {
    label: 'Images / Documents', color: '#f97316', icon: 'ti-photo',
    glpiPath: 'Document', isV1: true,
    order: 2, trashable: true,
  },

  // Actifs — générés depuis ASSET_TYPE_META
  ..._assetEntries,

  users: {
    label: 'Utilisateurs importés', color: '#ec4899', icon: 'ti-user',
    glpiPath: 'Administration/User',
    order: _usersOrder, trashable: true,
    isProtected: isProtectedUser,
    note: 'Les comptes système GLPI (glpi, tech, normal, post-only…) sont protégés',
  },

  // Modèles — générés depuis ASSET_TYPE_META (uniquement les types avec hasModel ≠ false)
  ..._modelEntries,

  // Listes déroulantes communes
  manufacturers: {
    label: 'Fabricants', color: '#6366f1', icon: 'ti-building-factory',
    glpiPath: 'Dropdowns/Manufacturer',
    order: _dropdownBase, trashable: false,
    note: 'Pas de corbeille GLPI pour ce type — suppression directe à la purge',
  },
  locations: {
    label: 'Localisations', color: '#8b5cf6', icon: 'ti-map-pin',
    glpiPath: 'Dropdowns/Location',
    order: _dropdownBase + 1, trashable: false,
    note: 'Pas de corbeille GLPI pour ce type — suppression directe à la purge',
  },
  states: {
    label: 'Statuts', color: '#f59e0b', icon: 'ti-tag',
    glpiPath: 'Dropdowns/State',
    order: _dropdownBase + 2, trashable: false,
    note: 'Pas de corbeille GLPI pour ce type — suppression directe à la purge',
  },
}

export const RESET_MODULE_KEYS = Object.keys(RESET_MODULES)

export const getResetOrder = () =>
  [...RESET_MODULE_KEYS].sort((a, b) => RESET_MODULES[a].order - RESET_MODULES[b].order)
