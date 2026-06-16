// Opérations métier sur les coûts de tickets (SQLite).
// Utilisé par FrontKanbanPage (drag & drop) ET ImportMovementsPage (CSV).
// Toute modification de la logique doit se faire ici uniquement.

import {
  getTicketCostsForTicket,
  addTicketCostToSQLite,
  deleteTicketCostFromSQLite,
} from './backend'

// Retourne le coût fixe le plus récent pour un ticket, ou null.
// La route SQLite renvoie les coûts triés par id DESC → [0] = le plus récent.
export const getLastFixedCost = async (ticketId) => {
  const rows = await getTicketCostsForTicket(ticketId).catch(() => [])
  const list = Array.isArray(rows) ? rows : []
  return list.filter(r => (r.type || 'fixed') === 'fixed')[0] ?? null
}

// Enregistre un coût de réouverture = pct% du dernier coût fixe.
// Retourne { base, cost } pour l'affichage/log (cost=0 si aucun coût fixe).
export const applyReopenCost = async (ticketId, pct) => {
  const lastFixed = await getLastFixedCost(ticketId)
  const base = lastFixed?.fixed_cost ?? 0
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
