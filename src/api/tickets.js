import { getItems, getItem, getSubItems } from './glpi'

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

// v2 — rôles TeamMember : 1=demandeur, 2=assigné, 3=observateur (identique à v1)
const ROLE = { REQUESTER: 1, ASSIGNED: 2, OBSERVER: 3 }

export const getTickets = (params = {}) =>
  getItems('Assistance/Ticket', { sort: 'date_mod', order: 'ASC', ...params })

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
