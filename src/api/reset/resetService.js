// ─── Service de réinitialisation des données GLPI ────────────────────────────
//
// Pendant de api/import/importService.js, mais en sens inverse : au lieu de
// créer des items dans GLPI à partir d'un CSV, on les supprime — uniquement
// ceux que l'app a elle-même créés (voir resetConfig.js pour la logique de
// protection).
//
// Flux en DEUX TEMPS, calqué sur la corbeille native de GLPI :
//   1. trashAllSelected  → met les éléments à la corbeille (is_deleted = 1),
//                          réversible — l'utilisateur peut encore changer d'avis
//                          dans GLPI directement
//   2. purgeAllSelected  → supprime définitivement (force_purge = 1)
//
// Limite GLPI : seuls Ticket / Computer / Monitor / User / Document possèdent
// une corbeille (`is_deleted`). Les listes déroulantes (State, Location,
// Manufacturer, *Model) n'en ont pas — voir `trashable` dans resetConfig.js.
// Pour elles, l'étape 1 ne fait rien et l'étape 2 supprime directement.
//
// Différence avec l'équivalent Prestashop dont ce module s'inspire : pas de
// "cascade" de modules à calculer — la purge GLPI nettoie elle-même les
// sous-entités (coûts de tickets, liens Item_Ticket, Document_Item…).

import { getItems, deleteItem, deleteV1Item, getV1Items } from '../glpi'
import { RESET_MODULES, getResetOrder } from './resetConfig'

// Récupère tous les items "à nous" d'un module (corbeille incluse, items
// protégés exclus) — la distinction actif/à la corbeille se fait ensuite
// via le champ is_deleted, présent uniquement sur les types `trashable`.
//
// Piège v1 : contrairement à la v2 (qui renvoie tout, actifs ET à la
// corbeille, is_deleted servant juste d'indicateur), la liste v1 FILTRE par
// is_deleted et ne renvoie QUE les éléments actifs (is_deleted=0) si on ne
// précise rien. Pour un module v1 + trashable (Document), il faut donc
// interroger les deux états séparément et fusionner — sinon les éléments
// déjà à la corbeille deviennent invisibles pour purgeModule/getResetStats.
const fetchModuleItems = async (cfg) => {
  let items
  if (cfg.isV1 && cfg.trashable) {
    const [active, trashed] = await Promise.all([
      getV1Items(cfg.glpiPath, { range: '0-999', is_deleted: 0 }),
      getV1Items(cfg.glpiPath, { range: '0-999', is_deleted: 1 }),
    ])
    items = [...active, ...trashed]
  } else if (cfg.isV1) {
    items = await getV1Items(cfg.glpiPath, { range: '0-999' })
  } else {
    items = await getItems(cfg.glpiPath, { range: '0-999' })
  }

  return cfg.isProtected ? items.filter(it => !cfg.isProtected(it)) : items
}

// Nom d'itemtype v1 — dernier segment du chemin v2 (ex: 'Assets/Computer' → 'Computer')
const v1Itemtype = (cfg) => cfg.glpiPath.split('/').pop()

// IMPORTANT : `force_purge` est silencieusement ignoré par l'API HL v2 — un
// DELETE avec force_purge=true sur un item déjà à la corbeille ne fait que
// réappliquer le soft-delete (vérifié par requêtes directes : l'item reste
// is_deleted=true, seul date_mod change). Seule l'API v1 honore ce paramètre
// et purge réellement l'item. La mise à la corbeille (sans force_purge),
// elle, fonctionne correctement via la v2.
const removeItem = (cfg, id, { purge } = {}) => {
  if (purge) return deleteV1Item(v1Itemtype(cfg), id, { force_purge: true })
  if (cfg.isV1) return deleteV1Item(cfg.glpiPath, id, {})
  return deleteItem(cfg.glpiPath, id, {})
}

/**
 * Statistiques par module : nombre d'éléments actifs (pas encore à la
 * corbeille) et nombre d'éléments déjà à la corbeille.
 * Pour les types sans corbeille, tout est compté en "actif".
 */
export const getResetStats = async () => {
  const stats = {}

  for (const key of getResetOrder()) {
    const cfg = RESET_MODULES[key]
    try {
      const items = await fetchModuleItems(cfg)
      const trashed = cfg.trashable ? items.filter(it => it.is_deleted).length : 0
      const active  = items.length - trashed
      stats[key] = { label: cfg.label, active, trashed, trashable: cfg.trashable }
    } catch (err) {
      console.warn(`Impossible de récupérer ${cfg.glpiPath}`, err.response?.status || err.message)
      stats[key] = { label: cfg.label, active: 0, trashed: 0, trashable: cfg.trashable }
    }
  }

  return stats
}

/**
 * Étape 1 — met à la corbeille les éléments actifs d'un module.
 * Ne fait rien pour les types sans corbeille (retourne 0).
 */
export const trashModule = async (moduleKey) => {
  const cfg = RESET_MODULES[moduleKey]
  if (!cfg) throw new Error(`Module inconnu : ${moduleKey}`)
  if (!cfg.trashable) return 0

  const items = (await fetchModuleItems(cfg)).filter(it => !it.is_deleted)
  let done = 0
  for (const item of items) {
    try { await removeItem(cfg, item.id, { purge: false }); done++ }
    catch (err) { console.warn(`Mise à la corbeille ignorée ${cfg.glpiPath}/${item.id}`, err.response?.status || err.message) }
  }
  return done
}

/**
 * Étape 2 — suppression définitive.
 *   - Types avec corbeille : purge les éléments déjà à la corbeille
 *   - Types sans corbeille : suppression directe de tous les éléments restants
 */
export const purgeModule = async (moduleKey) => {
  const cfg = RESET_MODULES[moduleKey]
  if (!cfg) throw new Error(`Module inconnu : ${moduleKey}`)

  const items = await fetchModuleItems(cfg)
  const targets = cfg.trashable ? items.filter(it => it.is_deleted) : items

  let done = 0
  for (const item of targets) {
    try { await removeItem(cfg, item.id, { purge: true }); done++ }
    catch (err) { console.warn(`Purge ignorée ${cfg.glpiPath}/${item.id}`, err.response?.status || err.message) }
  }
  return done
}

/**
 * Étape 1 pour tous les modules sélectionnés.
 * @param {Object} selectedModules - ex: { tickets: true, states: false, ... }
 * @param {(info: { done: number, total: number, module: string, label: string, status: 'success'|'error'|'skipped' }) => void} [onProgress]
 *   Appelé après le traitement de CHAQUE module — permet d'afficher une
 *   barre de progression en temps réel plutôt qu'un état "tout ou rien".
 * @returns {{ success: Array, errors: Array, skipped: Array }}
 *   `skipped` liste les modules sans corbeille (rien à faire à cette étape).
 */
export const trashAllSelected = async (selectedModules = {}, onProgress) => {
  const results = { success: [], errors: [], skipped: [] }
  const targets = getResetOrder().filter((key) => selectedModules[key] !== false)
  let done = 0

  const report = (key, label, status) => {
    done++
    onProgress?.({ done, total: targets.length, module: key, label, status })
  }

  for (const key of targets) {
    const cfg = RESET_MODULES[key]

    if (!cfg.trashable) {
      results.skipped.push({ module: key, label: cfg.label })
      report(key, cfg.label, 'skipped')
      continue
    }
    try {
      const count = await trashModule(key)
      results.success.push({ module: key, label: cfg.label, count })
      report(key, cfg.label, 'success')
    } catch (err) {
      console.error(`Erreur lors de la mise à la corbeille de ${cfg.label}`, err)
      results.errors.push({ module: key, label: cfg.label, error: err.message })
      report(key, cfg.label, 'error')
    }
  }

  return results
}

/**
 * Étape 2 pour tous les modules sélectionnés — suppression définitive.
 * @param {Object} selectedModules - ex: { tickets: true, states: false, ... }
 * @param {(info: { done: number, total: number, module: string, label: string, status: 'success'|'error' }) => void} [onProgress]
 */
export const purgeAllSelected = async (selectedModules = {}, onProgress) => {
  const results = { success: [], errors: [] }
  const targets = getResetOrder().filter((key) => selectedModules[key] !== false)
  let done = 0

  const report = (key, label, status) => {
    done++
    onProgress?.({ done, total: targets.length, module: key, label, status })
  }

  for (const key of targets) {
    const cfg = RESET_MODULES[key]

    try {
      const count = await purgeModule(key)
      results.success.push({ module: key, label: cfg.label, count })
      report(key, cfg.label, 'success')
    } catch (err) {
      console.error(`Erreur lors de la purge de ${cfg.label}`, err)
      results.errors.push({ module: key, label: cfg.label, error: err.message })
      report(key, cfg.label, 'error')
    }
  }

  return results
}

export default {
  getResetStats,
  trashModule,
  purgeModule,
  trashAllSelected,
  purgeAllSelected,
}
