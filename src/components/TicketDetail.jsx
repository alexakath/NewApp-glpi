import { useEffect, useState } from 'react'
import { getTicketFull, STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, URGENCY_LABELS, IMPACT_LABELS } from '../api/tickets'
import './TicketDetail.css'

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
    <span className="detail-badge" style={{ backgroundColor: color }}>
      {label}
    </span>
  )
}

function Row({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value ?? '—'}</span>
    </div>
  )
}

// Affiche le détail complet d'un ticket
// ticketId : ID du ticket sélectionné depuis la liste
// onBack : callback pour revenir à la liste
function TicketDetail({ ticketId, onBack }) {
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getTicketFull(ticketId)
      .then(setTicket)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [ticketId])

  if (loading) return <p className="detail-loading">Chargement du ticket...</p>
  if (error)   return <p className="detail-error">Erreur : {error}</p>

  const formatDate = (val) =>
    val ? new Date(val).toLocaleString('fr-FR') : '—'

  return (
    <div className="ticket-detail">
      <button className="detail-back" onClick={onBack}>← Retour à la liste</button>

      <div className="detail-header">
        <h2>Ticket #{ticket.id} — {ticket.name}</h2>
        <div className="detail-badges">
          <Badge
            label={TYPE_LABELS[ticket.type] ?? ticket.type}
            color="#4b5563"
          />
          <Badge
            label={STATUS_LABELS[ticket.status] ?? ticket.status}
            color={STATUS_COLORS[ticket.status] ?? '#6b7280'}
          />
          <Badge
            label={PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
            color={PRIORITY_COLORS[ticket.priority] ?? '#6b7280'}
          />
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h3>Informations générales</h3>
          <Row label="Catégorie"       value={ticket.itilcategories_id} />
          <Row label="Entité"          value={ticket.entities_id} />
          <Row label="Urgence"         value={URGENCY_LABELS[ticket.urgency] ?? ticket.urgency} />
          <Row label="Impact"          value={IMPACT_LABELS[ticket.impact] ?? ticket.impact} />
          <Row label="Ouvert le"       value={formatDate(ticket.date)} />
          <Row label="Dernière màj"    value={formatDate(ticket.date_mod)} />
          <Row label="Délai résolution" value={formatDate(ticket.time_to_resolve)} />
          <Row label="Résolu le"       value={formatDate(ticket.solvedate)} />
          <Row label="Clôturé le"      value={formatDate(ticket.closedate)} />
        </div>

        <div className="detail-section">
          <h3>Intervenants</h3>
          <Row label="Demandeur"       value={ticket._requester} />
          <Row label="Technicien"      value={ticket._assigned} />
          {ticket._observers.length > 0 && (
            <Row label="Observateurs"  value={ticket._observers.join(', ')} />
          )}
        </div>
      </div>

      <div className="detail-section">
        <h3>Description</h3>
        <div
          className="detail-content"
          // GLPI stocke le contenu en HTML — on l'affiche tel quel (usage interne uniquement)
          dangerouslySetInnerHTML={{ __html: ticket.content || '<em>Aucune description</em>' }}
        />
      </div>
    </div>
  )
}

export default TicketDetail
