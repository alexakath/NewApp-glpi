import { getAllItems, getItem } from './glpi'
import { ASSET_TYPE_META, buildItemTypeConfig } from './import/modulesConfig'

// ─── ASSET_TYPES — dérivé de ASSET_TYPE_META (source de vérité unique) ────────
// Ajouter un type dans ASSET_TYPE_META met à jour automatiquement le dashboard.

export const ASSET_TYPES = Object.fromEntries(
  Object.entries(ASSET_TYPE_META).map(([itemType, meta]) => {
    const cfg = buildItemTypeConfig(itemType)
    return [itemType, {
      glpiPath:    cfg.glpiPath,
      label:       meta.label,
      labelPlural: meta.label,
      color:       meta.color ?? '#64748b',
      icon:        meta.icon  ?? 'ti-device-desktop',
    }]
  })
)

export const ASSET_TYPE_KEYS = Object.keys(ASSET_TYPES)

// Récupère la liste des actifs d'un type donné (ex: getAssets('Peripheral'))
export const getAssets = (itemtype, params = {}) => {
  const cfg = ASSET_TYPES[itemtype]
  if (!cfg) throw new Error(`Type d'actif inconnu : ${itemtype}`)
  return getAllItems(cfg.glpiPath, { sort: 'name', order: 'ASC', ...params })
}

// Récupère le détail complet d'un actif par son type + son ID
export const getAssetFull = (itemtype, id) => {
  const cfg = ASSET_TYPES[itemtype]
  if (!cfg) throw new Error(`Type d'actif inconnu : ${itemtype}`)
  return getItem(cfg.glpiPath, id)
}
