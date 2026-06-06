// ─── Colonnes attendues par module (noms normalisés) ─────────────────────────

const normalize = (str) =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_]/g, '')

const CANONICAL = {
  assets: {
    required: ['name', 'item_type'],
    optional: ['status', 'location', 'manufacturer', 'model', 'inventory_number', 'user'],
  },
  tickets: {
    required: ['titre'],
    optional: ['ref_ticket', 'date', 'heure', 'type', 'description', 'status', 'priority', 'items'],
  },
  ticketCosts: {
    required: ['num_ticket'],
    optional: ['duration_second', 'time_cost', 'fixed_cost'],
  },
}

const findHeader = (headers, canonicalName) =>
  headers.find(h => normalize(h) === normalize(canonicalName)) ?? null

export const validateFile = (rows, headers, modules) => {
  const errors   = []
  const warnings = []

  // Colonnes obligatoires manquantes → erreur bloquante
  modules.forEach(mk => {
    const cfg = CANONICAL[mk]
    if (!cfg) return
    cfg.required.forEach(canonical => {
      if (!findHeader(headers, canonical)) {
        errors.push({
          type: 'missing_column',
          module: mk,
          column: canonical,
          message: `Colonne obligatoire "${canonical}" absente du fichier`,
        })
      }
    })
  })

  // Colonnes inconnues → warning non-bloquant
  const allKnown = new Set()
  modules.forEach(mk => {
    const cfg = CANONICAL[mk]
    if (!cfg) return
    ;[...cfg.required, ...cfg.optional].forEach(c => allKnown.add(normalize(c)))
  })
  headers.forEach(h => {
    if (!allKnown.has(normalize(h))) {
      warnings.push({
        type: 'unknown_column',
        column: h,
        message: `Colonne "${h}" non reconnue — sera ignorée`,
      })
    }
  })

  return { errors, warnings }
}
