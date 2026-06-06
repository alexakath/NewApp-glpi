import Papa from 'papaparse'
import { getItems, createItem, updateItem, postSubItem } from '../glpi'
import { createV1Item } from '../glpi'
import { ImportRegistry } from './detectModules'
import { KNOWN_ITEM_TYPES, TICKET_STATUS_MAP, TICKET_PRIORITY_MAP, TICKET_TYPE_MAP, SUB_MODULE_ORDER, expandModule } from './modulesConfig'
import { MODULES_CONFIG } from './modulesConfig'

// ─── CSV ──────────────────────────────────────────────────────────────────────

export const detectDelimiter = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const firstLine = e.target.result.split('\n')[0]
      const candidates = [';', ',', '|', '\t']
      let bestSep = ';', bestCount = 0
      for (const sep of candidates) {
        const count = firstLine.split(sep).length - 1
        if (count > bestCount) { bestCount = count; bestSep = sep }
      }
      resolve({ delimiter: bestSep, count: bestCount })
    }
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'))
    reader.readAsText(file)
  })

export const parseCsvFile = (file, delimiter = ';') =>
  new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) reject(new Error(`Erreur CSV : ${results.errors[0].message}`))
        else resolve(results.data)
      },
      error: (err) => reject(err),
    })
  })

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalize = (str) =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_]/g, '')

// Lecture insensible à la casse
const getCi = (row, ...keys) => {
  for (const key of keys) {
    for (const [k, v] of Object.entries(row)) {
      if (normalize(k) === normalize(key) && v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim()
      }
    }
  }
  return ''
}

const parseCsvFloat = (str) =>
  parseFloat(String(str || '0').replace(',', '.').trim()) || 0

// "03/06/2026" + "13:45" → "2026-06-03 13:45:00"
const parseGlpiDate = (dateStr, heureStr = '') => {
  if (!dateStr) return null
  const parts = String(dateStr).split('/')
  if (parts.length !== 3) return null
  const time = heureStr ? `${heureStr}:00` : '00:00:00'
  return `${parts[2]}-${parts[1]}-${parts[0]} ${time}`
}

// Supprime les accents et caractères spéciaux pour produire un login valide GLPI
const sanitizeLogin = (str) =>
  str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9_]/g, '')

// "Rakoto Jean" → { name: "RakotoJean", realname: "Rakoto", firstname: "Jean" }
const parseUserName = (fullName) => {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    const login = sanitizeLogin(parts[0])
    return { name: login, realname: parts[0], firstname: '' }
  }
  const realname  = parts[0]
  const firstname = parts.slice(1).join(' ')
  const login = sanitizeLogin(parts.join(''))
  return { name: login, realname, firstname }
}

// ─── Upsert générique pour les intitulés (State, Location, Manufacturer, Model) ─
// 1. Cherche dans le registre (déjà créé ce batch)
// 2. Cherche dans GLPI (existe déjà en base)
// 3. Crée dans GLPI si introuvable

const upsertDropdown = async (glpiPath, name, registryKey, registry, extra = {}) => {
  if (!name) return null
  const trimmed = name.trim()

  if (registry.has(registryKey, trimmed)) return registry.get(registryKey, trimmed).id

  // Récupérer tous les items et chercher par nom (filtre client-side — fiable)
  const all = await getItems(glpiPath, { range: '0-999' }).catch(() => [])
  const existing = all.find(item => {
    const n = typeof item.name === 'object' ? (item.name?.name ?? '') : String(item.name ?? '')
    return n.toLowerCase() === trimmed.toLowerCase()
  })

  if (existing) {
    const id = Number(existing.id)
    registry.set(registryKey, trimmed, { id })
    return id
  }

  const created = await createItem(glpiPath, { name: trimmed, ...extra })
  const id = Number(created?.id ?? created)
  registry.set(registryKey, trimmed, { id })
  return id
}

// Visibilité à activer sur chaque État importé — GLPI v2 utilise un objet imbriqué "visibilities"
const STATE_VISIBILITY = {
  visibilities: {
    computer: true, monitor: true, networkequipment: true, peripheral: true,
    phone: true, printer: true, softwarelicense: true, certificate: true,
    enclosure: true, pdu: true, line: true, rack: true, softwareversion: true,
    cluster: true, contract: true, appliance: true, databaseinstance: true,
    cable: true, unmanaged: true, passivedcequipment: true,
  },
}

// ─── Import STATUTS ───────────────────────────────────────────────────────────

const importStates = async (rows, registry, onProgress) => {
  const unique = [...new Set(rows.map(r => getCi(r, 'Status')).filter(Boolean))]
  const results = { success: 0, errors: [] }
  for (let i = 0; i < unique.length; i++) {
    try {
      const id = await upsertDropdown('Dropdowns/State', unique[i], 'states', registry, STATE_VISIBILITY)
      if (id) await updateItem('Dropdowns/State', id, STATE_VISIBILITY).catch(() => {})
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 1, message: err.message, row: { Status: unique[i] } })
    }
    onProgress?.(Math.round(((i + 1) / unique.length) * 100), results)
  }
  return results
}

// ─── Import LOCALISATIONS ─────────────────────────────────────────────────────

const importLocations = async (rows, registry, onProgress) => {
  const unique = [...new Set(rows.map(r => getCi(r, 'Location')).filter(Boolean))]
  const results = { success: 0, errors: [] }
  for (let i = 0; i < unique.length; i++) {
    try {
      await upsertDropdown('Dropdowns/Location', unique[i], 'locations', registry)
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 1, message: err.message, row: { Location: unique[i] } })
    }
    onProgress?.(Math.round(((i + 1) / unique.length) * 100), results)
  }
  return results
}

// ─── Import FABRICANTS ────────────────────────────────────────────────────────

const importManufacturers = async (rows, registry, onProgress) => {
  const unique = [...new Set(rows.map(r => getCi(r, 'Manufacturer')).filter(Boolean))]
  const results = { success: 0, errors: [] }
  for (let i = 0; i < unique.length; i++) {
    try {
      await upsertDropdown('Dropdowns/Manufacturer', unique[i], 'manufacturers', registry)
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 1, message: err.message, row: { Manufacturer: unique[i] } })
    }
    onProgress?.(Math.round(((i + 1) / unique.length) * 100), results)
  }
  return results
}

// ─── Import MODÈLES ORDINATEURS ───────────────────────────────────────────────

const importComputerModels = async (rows, registry, onProgress) => {
  const computerRows = rows.filter(r => getCi(r, 'Item_Type').toLowerCase() === 'computer')
  const unique = [...new Set(computerRows.map(r => getCi(r, 'Model')).filter(Boolean))]
  const results = { success: 0, errors: [] }
  for (let i = 0; i < unique.length; i++) {
    try {
      await upsertDropdown('Dropdowns/ComputerModel', unique[i], 'computerModels', registry)
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 1, message: err.message, row: { Model: unique[i] } })
    }
    onProgress?.(Math.round(((i + 1) / unique.length) * 100), results)
  }
  return results
}

// ─── Import MODÈLES MONITEURS ─────────────────────────────────────────────────

const importMonitorModels = async (rows, registry, onProgress) => {
  const monitorRows = rows.filter(r => getCi(r, 'Item_Type').toLowerCase() === 'monitor')
  const unique = [...new Set(monitorRows.map(r => getCi(r, 'Model')).filter(Boolean))]
  const results = { success: 0, errors: [] }
  for (let i = 0; i < unique.length; i++) {
    try {
      await upsertDropdown('Dropdowns/MonitorModel', unique[i], 'monitorModels', registry)
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 1, message: err.message, row: { Model: unique[i] } })
    }
    onProgress?.(Math.round(((i + 1) / unique.length) * 100), results)
  }
  return results
}

// ─── Import UTILISATEURS ──────────────────────────────────────────────────────
// Identifiant GLPI = LastnameFirstname (concaténé sans espace)
// Pas de mot de passe obligatoire côté API

const importUsers = async (rows, registry, onProgress) => {
  const unique = [...new Set(rows.map(r => getCi(r, 'User')).filter(Boolean))]
  const results = { success: 0, errors: [] }

  for (let i = 0; i < unique.length; i++) {
    const fullName = unique[i]
    try {
      if (registry.has('users', fullName)) { results.success++; onProgress?.(Math.round(((i + 1) / unique.length) * 100), results); continue }

      const { name: login, realname, firstname } = parseUserName(fullName)

      // Chercher si un utilisateur avec ce login existe déjà dans GLPI
      const all = await getItems('Administration/User', { range: '0-999' }).catch(() => [])
      // v2 : le champ login s'appelle "username" (pas "name")
      const existing = all.find(u => String(u.username ?? u.name ?? '').toLowerCase() === login.toLowerCase())

      if (existing) {
        registry.set('users', fullName, { id: Number(existing.id) })
        results.success++
      } else {
        const body = { username: login, realname, firstname }
        const created = await createItem('Administration/User', body)
        registry.set('users', fullName, { id: Number(created?.id ?? created) })
        results.success++
      }
    } catch (err) {
      const glpiMsg = err.response?.data ? JSON.stringify(err.response.data).slice(0, 300) : err.message
      results.errors.push({ line: i + 1, message: glpiMsg, row: { User: fullName } })
    }
    onProgress?.(Math.round(((i + 1) / unique.length) * 100), results)
  }
  return results
}

// ─── Import ORDINATEURS ───────────────────────────────────────────────────────

const importComputers = async (rows, registry, onProgress) => {
  const computerRows = rows.filter(r => getCi(r, 'Item_Type').toLowerCase() === 'computer')
  const results = { success: 0, errors: [], warnings: [] }

  // Récupérer tous les ordinateurs existants une seule fois (upsert)
  const allExisting = await getItems('Assets/Computer', { range: '0-999' }).catch(() => [])

  for (let i = 0; i < computerRows.length; i++) {
    const row = computerRows[i]
    const name = getCi(row, 'Name')
    if (!name) { results.errors.push({ line: i + 2, message: 'Nom manquant', row }); onProgress?.(Math.round(((i + 1) / computerRows.length) * 100), results); continue }

    try {
      const body = { name }

      const status   = getCi(row, 'Status')
      const location = getCi(row, 'Location')
      const manuf    = getCi(row, 'Manufacturer')
      const model    = getCi(row, 'Model')
      const serial   = getCi(row, 'Inventory_Number')
      const user     = getCi(row, 'User')

      const stateId  = registry.get('states',         status)?.id
      const locId    = registry.get('locations',      location)?.id
      const manufId  = registry.get('manufacturers',  manuf)?.id
      const modelId  = registry.get('computerModels', model)?.id
      const userId   = registry.get('users',          user)?.id

      // GLPI v2 utilise des noms courts (sans suffixe _id)
      if (status)   body.status       = stateId   ?? undefined
      if (location) body.location     = locId     ?? undefined
      if (manuf)    body.manufacturer = manufId   ?? undefined
      if (model)    body.model        = modelId   ?? undefined
      if (serial)   body.otherserial  = serial
      if (user)     body.user         = userId    ?? undefined

      const existing = allExisting.find(c => {
        const n = typeof c.name === 'object' ? (c.name?.name ?? '') : String(c.name ?? '')
        return n.toLowerCase() === name.toLowerCase()
      })

      let id
      if (existing) {
        await updateItem('Assets/Computer', existing.id, body)
        id = String(existing.id)
      } else {
        const created = await createItem('Assets/Computer', body)
        id = String(created?.id ?? created)
      }

      registry.set('computers', name, { id, itemtype: 'Computer' })
      registry.set('assets',    name, { id, itemtype: 'Computer' })
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : err.message, row })
    }
    onProgress?.(Math.round(((i + 1) / computerRows.length) * 100), results)
  }
  return results
}

// ─── Import MONITEURS ─────────────────────────────────────────────────────────

const importMonitors = async (rows, registry, onProgress) => {
  const monitorRows = rows.filter(r => {
    const t = getCi(r, 'Item_Type').toLowerCase()
    return t === 'monitor'
  })

  // Lignes avec Item_Type inconnu → warnings
  const unknownRows = rows.filter(r => {
    const t = getCi(r, 'Item_Type')
    if (!t) return false
    return !KNOWN_ITEM_TYPES[t]
  })

  const results = { success: 0, errors: [], warnings: unknownRows.map(r => ({
    message: `Item_Type "${getCi(r, 'Item_Type')}" non reconnu dans GLPI — ligne ignorée`,
    row: r,
  })) }

  // Récupérer tous les moniteurs existants une seule fois (upsert)
  const allExisting = await getItems('Assets/Monitor', { range: '0-999' }).catch(() => [])

  for (let i = 0; i < monitorRows.length; i++) {
    const row = monitorRows[i]
    const name = getCi(row, 'Name')
    if (!name) { results.errors.push({ line: i + 2, message: 'Nom manquant', row }); onProgress?.(Math.round(((i + 1) / monitorRows.length) * 100), results); continue }

    try {
      const body = { name }

      const status   = getCi(row, 'Status')
      const location = getCi(row, 'Location')
      const manuf    = getCi(row, 'Manufacturer')
      const model    = getCi(row, 'Model')
      const serial   = getCi(row, 'Inventory_Number')
      const user     = getCi(row, 'User')

      // GLPI v2 utilise des noms courts (sans suffixe _id)
      if (status)   body.status       = registry.get('states',        status)?.id   ?? undefined
      if (location) body.location     = registry.get('locations',     location)?.id ?? undefined
      if (manuf)    body.manufacturer = registry.get('manufacturers', manuf)?.id    ?? undefined
      if (model)    body.model        = registry.get('monitorModels', model)?.id    ?? undefined
      if (serial)   body.otherserial  = serial
      if (user)     body.user         = registry.get('users',         user)?.id     ?? undefined

      const existing = allExisting.find(m => {
        const n = typeof m.name === 'object' ? (m.name?.name ?? '') : String(m.name ?? '')
        return n.toLowerCase() === name.toLowerCase()
      })

      let id
      if (existing) {
        await updateItem('Assets/Monitor', existing.id, body)
        id = String(existing.id)
      } else {
        const created = await createItem('Assets/Monitor', body)
        id = String(created?.id ?? created)
      }

      registry.set('monitors', name, { id, itemtype: 'Monitor' })
      registry.set('assets',   name, { id, itemtype: 'Monitor' })
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : err.message, row })
    }
    onProgress?.(Math.round(((i + 1) / monitorRows.length) * 100), results)
  }
  return results
}

// ─── Import TICKETS ───────────────────────────────────────────────────────────

const importTickets = async (rows, registry, onProgress) => {
  const results = { success: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const titre = getCi(row, 'Titre')
    if (!titre) { results.errors.push({ line: i + 2, message: 'Titre manquant', row }); onProgress?.(Math.round(((i + 1) / rows.length) * 100), results); continue }

    try {
      const body = { name: titre }

      const desc     = getCi(row, 'Description')
      const dateStr  = getCi(row, 'Date')
      const heureStr = getCi(row, 'Heure')
      const typeStr  = getCi(row, 'Type')
      const statusStr   = getCi(row, 'Status')
      const priorityStr = getCi(row, 'Priority')
      const refTicket   = getCi(row, 'Ref_Ticket')

      if (desc)     body.content  = desc
      const glpiDate = parseGlpiDate(dateStr, heureStr)
      if (glpiDate) body.date = glpiDate

      const typeId = TICKET_TYPE_MAP[typeStr.toLowerCase()]
      if (typeId) body.type = typeId

      const statusId = TICKET_STATUS_MAP[statusStr.toLowerCase()]
      if (statusId) body.status = statusId

      const priorityId = TICKET_PRIORITY_MAP[priorityStr.toLowerCase()]
      if (priorityId) body.priority = priorityId

      const created = await createItem('Assistance/Ticket', body)
      const ticketId = String(created?.id ?? created)

      if (refTicket) registry.set('tickets', refTicket, { id: ticketId })

      // Items associés au ticket via v1 (Item_Ticket)
      const itemsRaw = getCi(row, 'Items')
      if (itemsRaw) {
        let assetNames = []
        try { assetNames = JSON.parse(itemsRaw) } catch { /* items malformé — ignoré */ }

        for (const assetName of assetNames) {
          const asset = registry.get('assets', assetName.trim())
          if (!asset?.id) continue
          createV1Item('Item_Ticket', {
            tickets_id: ticketId,
            itemtype: asset.itemtype,
            items_id: Number(asset.id),
          }).catch(() => {}) // non-bloquant : le ticket est déjà créé
        }
      }

      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : err.message, row })
    }
    onProgress?.(Math.round(((i + 1) / rows.length) * 100), results)
  }
  return results
}

// ─── Import COÛTS TICKETS ─────────────────────────────────────────────────────

const importTicketCosts = async (rows, registry, onProgress) => {
  const results = { success: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const refTicket = getCi(row, 'Num_Ticket')
    if (!refTicket) { results.errors.push({ line: i + 2, message: 'Num_Ticket manquant', row }); onProgress?.(Math.round(((i + 1) / rows.length) * 100), results); continue }

    const ticketEntry = registry.get('tickets', refTicket)
    if (!ticketEntry?.id) {
      results.errors.push({ line: i + 2, message: `Ticket "${refTicket}" introuvable dans le registre — importer d'abord le fichier tickets`, row })
      onProgress?.(Math.round(((i + 1) / rows.length) * 100), results)
      continue
    }

    try {
      const durationRaw = getCi(row, 'Duration_second')
      const timeCostRaw = getCi(row, 'Time_Cost')
      const fixedCostRaw = getCi(row, 'Fixed_Cost')

      const body = {
        duration:     durationRaw  ? parseInt(durationRaw, 10) : 0,
        cost_time:    timeCostRaw  ? parseCsvFloat(timeCostRaw)  : 0,
        cost_fixed:   fixedCostRaw ? parseCsvFloat(fixedCostRaw) : 0,
        cost_material: 0,
      }

      await postSubItem('Assistance/Ticket', ticketEntry.id, 'Cost', body)
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : err.message, row })
    }
    onProgress?.(Math.round(((i + 1) / rows.length) * 100), results)
  }
  return results
}

// ─── Routeur des sous-modules ─────────────────────────────────────────────────

const SUB_MODULE_IMPORTERS = {
  states:         importStates,
  locations:      importLocations,
  manufacturers:  importManufacturers,
  computerModels: importComputerModels,
  monitorModels:  importMonitorModels,
  users:          importUsers,
  computers:      importComputers,
  monitors:       importMonitors,
  tickets:        importTickets,
  ticketCosts:    importTicketCosts,
}

// ─── Orchestrateur principal ──────────────────────────────────────────────────
// csvPlan : [{ subModuleKey, rows, sourceModuleKey, fileName }]
// Les sous-modules sont déjà triés par SUB_MODULE_ORDER à la construction du plan.

export const importMultiModule = async (csvPlan, onSubModuleProgress, onSubModuleDone) => {
  const registry = new ImportRegistry()
  const globalReport = {}

  for (const { subModuleKey, rows } of csvPlan) {
    const importer = SUB_MODULE_IMPORTERS[subModuleKey]
    if (!importer) continue

    const results = await importer(
      rows,
      registry,
      (pct, partial) => onSubModuleProgress?.(subModuleKey, pct, partial)
    )

    globalReport[subModuleKey] = results
    onSubModuleDone?.(subModuleKey, results)
  }

  return globalReport
}

// ─── Construction du plan (appelé depuis ImportPage) ─────────────────────────
// detectedEntries : [{ moduleKey, rows, fileName, fileId }]
// Retourne les sous-modules triés, prêts à passer à importMultiModule.

export const buildImportPlan = (detectedEntries) => {
  const subModuleMap = {}

  for (const { moduleKey, rows, fileName, fileId } of detectedEntries) {
    const subKeys = expandModule(moduleKey)
    for (const subKey of subKeys) {
      if (!subModuleMap[subKey]) {
        subModuleMap[subKey] = { subModuleKey: subKey, rows, sourceModuleKey: moduleKey, fileName, fileId }
      }
    }
  }

  return SUB_MODULE_ORDER.filter(k => subModuleMap[k]).map(k => subModuleMap[k])
}
