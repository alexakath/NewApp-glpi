// Opérations métier sur les coûts de tickets (SQLite).
// Utilisé par FrontKanbanPage (drag & drop) ET ImportMovementsPage (CSV).
// Toute modification de la logique doit se faire ici uniquement.

import {
  getTicketCostsForTicket,
  addTicketCostToSQLite,
  updateTicketCostInSQLite,
  getAllTicketCosts,
  cancelTicketCostToArchive,
  getCancelledCosts,
  restoreCancelledCost as restoreCancelledCostAPI,
  getSetting,
  setSetting,
} from './backend'


const getAllFixedCost = async (ticketId) => {
  const rows = await getTicketCostsForTicket(ticketId).catch(() => [])
  return (Array.isArray(rows) ? rows : []).filter(r => (r.type || 'fixed') === 'fixed')
}
// Retourne le coût fixe le plus récent pour un ticket, ou null.
// La route SQLite renvoie les coûts triés par id DESC → [0] = le plus récent.
export const getLastFixedCost = async (ticketId) => {
  const list = await getAllFixedCost(ticketId)
  return list[0] ?? null
}

export const getBaseForMode = (fixedCosts, mode) => {
  if (!fixedCosts.length) return 0
  const last = fixedCosts[0].fixed_cost
  const first = fixedCosts[fixedCosts.length - 1].fixed_cost
  const total = fixedCosts.reduce((s, r) => s + r.fixed_cost, 0)
  if (mode === 2) return first
  if (mode === 3) return total / fixedCosts.length
  if (mode === 4) return total
  return last
} 

// Enregistre un coût de réouverture = pct% du dernier coût fixe.
// Retourne { base, cost } pour l'affichage/log (cost=0 si aucun coût fixe).
export const applyReopenCost = async (ticketId, pct, mode = 1) => {
  const fixedCosts = await getAllFixedCost(ticketId)
  const base = getBaseForMode(fixedCosts,parseInt(mode) || 1)
  let cost = base * (parseFloat(pct) / 100)
  const capPct = parseFloat(await getSetting('reopen_cap_pct').catch(() => '0')) || 0

  if( capPct > 0) {
    const sumFixed = fixedCosts.reduce((s, r) => s + r.fixed_cost, 0)
    const capAmount = sumFixed * (capPct / 100)
    const rows = await getTicketCostsForTicket(ticketId).catch(() => [])
    const sumReopens = (Array.isArray(rows) ? rows : [])
      .filter(r => r.type === 'reopen').reduce((s, r) => s + r.fixed_cost, 0)
    cost = Math.min(cost, Math.max(0, capAmount - sumReopens))
  }
  await addTicketCostToSQLite(ticketId, cost, 'reopen', parseFloat(pct), parseInt(mode) || 1)
  return { base, cost}
}

// Supprime le dernier coût fixe d'un ticket (annulation).
// Retourne l'id supprimé, ou null si aucun coût fixe existant.
export const cancelLastFixedCost = async (ticketId, prevStatus = 5) => {
  const lastFixed = await getLastFixedCost(ticketId)
  if (!lastFixed) return null
  await cancelTicketCostToArchive(lastFixed.id, prevStatus).catch(() => {})
  return lastFixed.id
}

export { getAllFixedCost}

export const updateFixedCost = async (costId, ticketId, newAmount) => {
  await updateTicketCostInSQLite(costId, {fixed_cost: newAmount, pct: null, mode: null})
  await recalcAllReopensForTicket(ticketId)
}

export const updateReopenCost = async (costId, ticketId, newPct, newMode) => {
  await updateTicketCostInSQLite(costId, {fixed_cost: 0, pct: parseFloat(newPct), mode: parseInt(newMode) || 1})
  await recalcAllReopensForTicket(ticketId)
}

export const fetchAllCosts = () => getAllTicketCosts()

export const fetchCancelledCosts = () => getCancelledCosts()

export const restoreCost = async (cancelledId) => {
  const result = await restoreCancelledCostAPI(cancelledId)
  await recalcAllReopensForTicket(result.ticket_id)
  return result
}

export const getReopenCap = () => getSetting ('reopen_cap_pct')
export const setReopenCap = (pct) => setSetting('reopen_cap_pct', String(pct))

const recalcAllReopensForTicket = async (ticketId) => {
  const capPct = parseFloat(await getSetting('reopen_cap_pct').catch(() => '0')) || 0
  const rows = await getTicketCostsForTicket(ticketId).catch(() => [])
  const allRows = (Array.isArray(rows) ? rows : []).slice().sort((a, b) => a.id - b.id)
  const fixedSoFar = []
  let sumReopens = 0
  for (const r of allRows) {
    if((r.type || 'fixed') === 'fixed'){
      fixedSoFar.push(r)
    } else if (r.type === 'reopen' && r.pct != null && r.mode != null) {
      const base = getBaseForMode([...fixedSoFar].reverse(), r.mode)
      let cost = base * (r.pct / 100)
      if( capPct > 0) {
        const sumFixed = fixedSoFar.reduce((s, f) => s + f.fixed_cost, 0)
        const capAmount = sumFixed * (capPct / 100)
        cost = Math.min(cost, Math.max(0, capAmount - sumReopens))
      }
      await updateTicketCostInSQLite(r.id, { fixed_cost: cost, pct: r.pct, mode: r.mode})
      sumReopens += cost
    }
  }
}

export const applyCloseCost = async (ticketId, amount) => {
  const cost = parseFloat(amount) || 0
  await addTicketCostToSQLite(ticketId, cost, 'fixed')
    return { cost }
}
