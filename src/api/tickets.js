import { getItems, getItem, getSubItems } from './glpi'

// Correspondance entre les valeurs numériques de l'API GLPI et leur libellé français
// GLPI retourne toujours des entiers pour ces champs — jamais du texte directement

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
  1: 'Très basse',
  2: 'Basse',
  3: 'Moyenne',
  4: 'Haute',
  5: 'Très haute',
}

export const IMPACT_LABELS = {
  1: 'Très faible',
  2: 'Faible',
  3: 'Moyen',
  4: 'Important',
  5: 'Majeur',
}

// Types d'utilisateurs liés à un ticket (champ "type" dans Ticket_User)
const USER_TYPE = {
  REQUESTER: 1,  // Demandeur
  ASSIGNED: 2,   // Technicien assigné
  OBSERVER: 3,   // Observateur
}

// Récupère la liste des tickets, triés par date de modification
// Les params supplémentaires permettent de surcharger le tri ou le filtre depuis le composant
export const getTickets = (params = {}) =>
  getItems('Ticket', { sort: 'date_mod', order: 'ASC', ...params })

// Récupère les données complètes d'un ticket :
// - les champs du ticket (titre, statut, priorité, contenu, dates...)
// - les utilisateurs liés via Ticket_User (demandeur, technicien, observateurs)
// Les deux appels sont faits en parallèle avec Promise.all pour minimiser le temps de chargement
export const getTicketFull = async (id) => {
  const [ticket, ticketUsers] = await Promise.all([
    getItem('Ticket', id),
    getSubItems('Ticket', id, 'Ticket_User'),
  ])

  // On sépare les utilisateurs selon leur rôle dans le ticket
  const users = Array.isArray(ticketUsers) ? ticketUsers : []
  const requester = users.find((u) => u.type === USER_TYPE.REQUESTER)
  const assigned  = users.find((u) => u.type === USER_TYPE.ASSIGNED)
  const observers = users.filter((u) => u.type === USER_TYPE.OBSERVER)

  return {
    ...ticket,
    _requester: requester?.users_id ?? '—',
    _assigned:  assigned?.users_id  ?? '—',
    _observers: observers.map((u) => u.users_id),
  }
}
