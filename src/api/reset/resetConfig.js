// ─── Configuration de la réinitialisation des données ────────────────────────
//
// Contexte : à l'installation, GLPI est strictement vide — seules les comptes
// utilisateurs par défaut et l'entité racine existent déjà. Tout le reste
// (ordinateurs, moniteurs, tickets, statuts, localisations, fabricants,
// modèles, utilisateurs métier, images...) provient de l'import CSV de cette
// application.
//
// Principe de protection : on ne protège QUE ce qui préexistait à toute
// utilisation de l'app — pas de listes d'IDs à maintenir module par module
// comme côté Prestashop, juste une règle simple sur les comptes système.

// Comptes créés automatiquement par l'installation de GLPI — jamais supprimés
export const PROTECTED_USERS = ['glpi', 'post-only', 'tech', 'normal', 'glpi-system']

const isProtectedUser = (user) =>
  PROTECTED_USERS.includes(String(user.username ?? user.name ?? '').toLowerCase())

// ─── Modules réinitialisables ─────────────────────────────────────────────────
//
// `order` = ordre de SUPPRESSION (inverse de l'ordre d'import — voir
// SUB_MODULE_ORDER dans api/import/modulesConfig.js) afin de ne jamais essayer
// de supprimer une donnée encore référencée par une autre :
//
//   1. Tickets       → la purge GLPI nettoie en cascade Coûts + liens Item_Ticket
//   2. Images        → Document liés aux ordinateurs/moniteurs (v1 uniquement,
//                      l'itemtype Document n'est pas exposé par l'API v2)
//   3-4. Moniteurs / Ordinateurs → référencent users, statuts, localisations,
//                      fabricants, modèles
//   5. Utilisateurs  → seuls ceux importés (les comptes système sont protégés)
//   6-10. Listes déroulantes  → ne sont alors plus référencées par rien
//
// `glpiPath`   : chemin GLPI v2 (sauf `isV1: true` → API v1, voir glpi.js)
// `isProtected(item)` : optionnel — exclut un item de la suppression
// `trashable`  : ce type possède une corbeille GLPI (champ `is_deleted`).
//                Vérifié par requête API directe sur chaque itemtype :
//                  Ticket, Computer, Monitor, User, Document → ont `is_deleted`
//                  State, Location, Manufacturer, *Model     → ne l'ont PAS
//                Les types sans corbeille sont supprimés directement à l'étape
//                de purge — GLPI ne propose pas d'étape intermédiaire pour eux.

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
  monitors: {
    label: 'Moniteurs', color: '#10b981', icon: 'ti-device-desktop',
    glpiPath: 'Assets/Monitor',
    order: 3, trashable: true,
  },
  computers: {
    label: 'Ordinateurs', color: '#3b82f6', icon: 'ti-device-laptop',
    glpiPath: 'Assets/Computer',
    order: 4, trashable: true,
  },
  users: {
    label: 'Utilisateurs importés', color: '#ec4899', icon: 'ti-user',
    glpiPath: 'Administration/User',
    order: 5, trashable: true,
    isProtected: isProtectedUser,
    note: 'Les comptes système GLPI (glpi, tech, normal, post-only…) sont protégés',
  },
  monitorModels: {
    label: 'Modèles moniteurs', color: '#06b6d4', icon: 'ti-device-desktop',
    glpiPath: 'Dropdowns/MonitorModel',
    order: 6, trashable: false,
    note: 'Pas de corbeille GLPI pour ce type — suppression directe à la purge',
  },
  computerModels: {
    label: 'Modèles ordinateurs', color: '#0ea5e9', icon: 'ti-cpu',
    glpiPath: 'Dropdowns/ComputerModel',
    order: 7, trashable: false,
    note: 'Pas de corbeille GLPI pour ce type — suppression directe à la purge',
  },
  manufacturers: {
    label: 'Fabricants', color: '#6366f1', icon: 'ti-building-factory',
    glpiPath: 'Dropdowns/Manufacturer',
    order: 8, trashable: false,
    note: 'Pas de corbeille GLPI pour ce type — suppression directe à la purge',
  },
  locations: {
    label: 'Localisations', color: '#8b5cf6', icon: 'ti-map-pin',
    glpiPath: 'Dropdowns/Location',
    order: 9, trashable: false,
    note: 'Pas de corbeille GLPI pour ce type — suppression directe à la purge',
  },
  states: {
    label: 'Statuts', color: '#f59e0b', icon: 'ti-tag',
    glpiPath: 'Dropdowns/State',
    order: 10, trashable: false,
    note: 'Pas de corbeille GLPI pour ce type — suppression directe à la purge',
  },
}

export const RESET_MODULE_KEYS = Object.keys(RESET_MODULES)

// Ordre de suppression — du plus dépendant au moins dépendant
export const getResetOrder = () =>
  [...RESET_MODULE_KEYS].sort((a, b) => RESET_MODULES[a].order - RESET_MODULES[b].order)
