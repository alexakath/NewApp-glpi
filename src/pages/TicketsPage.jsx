import { useEffect, useState } from 'react'
import { getTickets, STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS } from '../api/tickets'
import TicketDetail from '../components/TicketDetail'
import './TicketsPage.css'

const STATUS_COLORS = {
  1: '#3b82f6', 2: '#f59e0b', 3: '#8b5cf6',
  4: '#6b7280', 5: '#10b981', 6: '#374151',
}

const PRIORITY_COLORS = {
  1: '#6b7280', 2: '#3b82f6', 3: '#f59e0b',
  4: '#ef4444', 5: '#b91c1c', 6: '#7f1d1d',
}

function Badge({ label, color }) {
  return (
    <span className="badge" style={{ backgroundColor: color }}>
      {label}
    </span>
  )
}

function TicketsPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // ID du ticket sélectionné — null = on affiche la liste, sinon on affiche le détail
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    getTickets()
      .then(setTickets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Si un ticket est sélectionné, on remplace la liste par la vue détail
  if (selectedId !== null) {
    return (
      <TicketDetail
        ticketId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  if (loading) return <p className="tickets-loading">Chargement des tickets...</p>
  if (error)   return <p className="tickets-error">Erreur : {error}</p>

  return (
    <div className="tickets-page">
      <div className="page-header">
        <h1>Tickets</h1>
        <span className="page-count">{tickets.length}</span>
      </div>
      <div className="tickets-table-wrapper">
        <table className="tickets-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Titre</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Priorité</th>
              <th>Catégorie</th>
              <th>Ouvert le</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              // Clic sur une ligne → affiche le détail complet du ticket
              <tr
                key={ticket.id}
                className="ticket-row"
                onClick={() => setSelectedId(ticket.id)}
              >
                <td>{ticket.id}</td>
                <td className="title-cell">
                  <span className="ticket-title" title={ticket.name}>
                    {ticket.name}
                  </span>
                </td>
                <td>{TYPE_LABELS[ticket.type] ?? ticket.type}</td>
                <td>
                  <Badge
                    label={STATUS_LABELS[ticket.status] ?? ticket.status}
                    color={STATUS_COLORS[ticket.status] ?? '#6b7280'}
                  />
                </td>
                <td>
                  <Badge
                    label={PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                    color={PRIORITY_COLORS[ticket.priority] ?? '#6b7280'}
                  />
                </td>
                <td>{ticket.itilcategories_id || '—'}</td>
                <td>{new Date(ticket.date).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && (
          <p className="tickets-empty">Aucun ticket trouvé.</p>
        )}
      </div>
    </div>
  )
}

export default TicketsPage
