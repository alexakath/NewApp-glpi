import { MODULES_CONFIG, MODULE_KEYS } from './modulesConfig'

const normalize = (str) =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_]/g, '')

// ─── Registre partagé ─────────────────────────────────────────────────────────
// Même pattern que la version Prestashop — clé → { id, ...extra }
// Exemple :
//   registry.set('states',    'En production', { id: '3' })
//   registry.set('computers', 'PC-ADM-001',    { id: '15', itemtype: 'Computer' })
//   registry.set('assets',    'PC-ADM-001',    { id: '15', itemtype: 'Computer' })  ← clé unifiée pour tickets
//   registry.set('tickets',   '1',             { id: '22' })

export class ImportRegistry {
  constructor() { this._store = {} }

  set(moduleKey, lookupKey, data) {
    if (!this._store[moduleKey]) this._store[moduleKey] = {}
    this._store[moduleKey][String(lookupKey).trim()] = data
  }

  get(moduleKey, lookupKey) {
    return this._store[moduleKey]?.[String(lookupKey).trim()] ?? null
  }

  has(moduleKey, lookupKey) {
    return !!this.get(moduleKey, lookupKey)
  }
}

// ─── Détection des modules depuis les headers CSV ─────────────────────────────

export const detectModulesFromHeaders = (headers) => {
  const results = []

  for (const moduleKey of MODULE_KEYS) {
    const config = MODULES_CONFIG[moduleKey]
    if (!config?.detectionSignatures) continue

    let score = 0
    const mapping = {}

    for (const header of headers) {
      const norm = normalize(header)
      const sig = config.detectionSignatures[norm]
      if (sig) {
        score += sig.weight
        mapping[header] = norm
      }
    }

    const threshold = config.detectionThreshold ?? 2
    results.push({
      moduleKey,
      label: config.label,
      score,
      detected: score >= threshold,
      mapping,
      importOrder: config.importOrder ?? 99,
    })
  }

  return results.sort((a, b) => {
    if (a.detected && !b.detected) return -1
    if (!a.detected && b.detected) return 1
    return a.importOrder - b.importOrder
  })
}
