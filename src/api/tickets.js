// Fonctions métier liées aux tickets GLPI.
// Toutes les fonctions utilisent l'API v2, SAUF getTicketItems qui utilise v1.
// Voir doc/api-architecture.md pour le schéma complet.
import { getItems, getItem, getSubItems, createItem, updateItem, deleteItem, getV1SubItems, createV1Item, deleteV1Item } from './glpi'

// ── Labels affichés dans l'UI ───────────────────────────────────────────────

export const STATUS_LABELS = {
  1: 'Nouveau',
  2: 'En cours (attribué)',
  3: 'En cours (planifié)',
  4: 'En attente',
  5: 'Résolu',
  6: 'Clôturé',
}

export const PRIORITY_LABELS = {
  1: 'Très basse',
  2: 'Basse',
  3: 'Moyenne',
  4: 'Haute',
  5: 'Très haute',
  6: 'Majeure',
}

export const TYPE_LABELS = {
  1: 'Incident',
  2: 'Demande',
}

export const URGENCY_LABELS = {
  1: 'Très basse', 2: 'Basse', 3: 'Moyenne', 4: 'Haute', 5: 'Très haute',
}

export const IMPACT_LABELS = {
  1: 'Très faible', 2: 'Faible', 3: 'Moyen', 4: 'Important', 5: 'Majeur',
}

// Rôles possibles dans l'équipe d'un ticket (valeurs GLPI)
const ROLE = { REQUESTER: 1, ASSIGNED: 2, OBSERVER: 3 }

// ── CRUD Ticket (v2) ─────────────────────────────────────────────────────────

// is_deleted: 0 → exclut les tickets en corbeille côté serveur
// .filter(!is_deleted) → garde-fou client si le paramètre serveur est ignoré
export const getTickets = (params = {}) =>
  getItems('Assistance/Ticket', { sort: 'date_mod', order: 'ASC', is_deleted: 0, ...params })
    .then(items => items.filter(t => !t.is_deleted))

export const getTicket = (id) => getItem('Assistance/Ticket', id)

// GLPI v2 n'utilise PAS de wrapper { input: {...} } — le body est envoyé directement
export const createTicket = (data) => createItem('Assistance/Ticket', data)
export const updateTicket = (id, data) => updateItem('Assistance/Ticket', id, data)

// force_purge: 1 → suppression définitive dans GLPI (sans ça, le ticket va en corbeille
// et réapparaît dans la liste au prochain chargement)
export const deleteTicket = (id) => deleteItem('Assistance/Ticket', id, { force_purge: 1 })

// ── Éléments associés (Item_Ticket) ─────────────────────────────────────────
//
// POURQUOI v1 ICI ?
// L'API HL v2 n'expose pas Item_Ticket (vérifié via Swagger /api.php/v2.3/doc).
// La v1 (/apirest.php) supporte GET /Ticket/{id}/Item_Ticket nativement.
//
// Ce que retourne v1 : [{ id, itemtype: "Computer", items_id: 3, tickets_id: 1 }]
// Ce sont des LIENS, pas les détails des actifs. L'enrichissement (nom, serial)
// est fait ensuite via v2 dans TicketDetail.jsx.

export const getTicketItems = (ticketId) =>
  getV1SubItems('Ticket', ticketId, 'Item_Ticket')

// Ajoute un actif à un ticket via v1.
// v1 exige { input: {...} } — géré automatiquement par createV1Item.
// La session v1 est ouverte + fermée à chaque appel (withV1Session).
export const addItemToTicket = (ticketId, itemtype, itemsId) =>
  createV1Item('Item_Ticket', { tickets_id: ticketId, itemtype, items_id: itemsId })

// Supprime une association Item_Ticket par son ID (itemId = ID de la ligne Item_Ticket, pas de l'actif)
export const removeItemFromTicket = (_ticketId, itemId) =>
  deleteV1Item('Item_Ticket', itemId)

// ── Ticket complet avec équipe (v2) ──────────────────────────────────────────
//
// Charge le ticket ET ses membres en parallèle (Promise.all),
// puis normalise les membres en _requester, _assigned, _observers
// pour simplifier l'affichage dans TicketDetail.

export const getTicketFull = async (id) => {
  const [ticket, members] = await Promise.all([
    getItem('Assistance/Ticket', id),
    getSubItems('Assistance/Ticket', id, 'TeamMember'),
  ])

  const list = Array.isArray(members) ? members : []

  // Le champ de rôle peut être 'role' (v2) ou 'type' (v1) — on gère les deux
  const role  = (m) => m.role  ?? m.type
  const label = (m) => m.users_id ?? m.name ?? '—'

  const requester = list.find((m) => role(m) === ROLE.REQUESTER)
  const assigned  = list.find((m) => role(m) === ROLE.ASSIGNED)
  const observers = list.filter((m) => role(m) === ROLE.OBSERVER)

  return {
    ...ticket,
    _requester: label(requester ?? {}),
    _assigned:  label(assigned  ?? {}),
    _observers: observers.map(label),
  }
}
