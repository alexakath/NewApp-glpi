// Opérations métier sur les coûts de tickets (SQLite).
// Utilisé par FrontKanbanPage (drag & drop) ET ImportMovementsPage (CSV).
// Toute modification de la logique doit se faire ici uniquement.

import {
  getTicketCostsForTicket,
  addTicketCostToSQLite,
  deleteTicketCostFromSQLite,
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
  const cost = base * (parseFloat(pct) / 100)
  if (cost > 0) await addTicketCostToSQLite(ticketId, cost, 'reopen')
  return { base, cost }
}

// Supprime le dernier coût fixe d'un ticket (annulation).
// Retourne l'id supprimé, ou null si aucun coût fixe existant.
export const cancelLastFixedCost = async (ticketId) => {
  const lastFixed = await getLastFixedCost(ticketId)
  if (!lastFixed) return null
  await deleteTicketCostFromSQLite(lastFixed.id).catch(() => {})
  return lastFixed.id
}
