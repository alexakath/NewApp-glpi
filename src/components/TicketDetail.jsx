import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTicketFull, STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, URGENCY_LABELS, IMPACT_LABELS } from '../api/tickets'
import { getTicketCosts } from '../api/costs'
import { getSubItems } from '../api/glpi'
import './TicketDetail.css'

const STATUS_SCHEME = {
  1: { background: '#dbeafe', color: '#1e40af' },
  2: { background: '#fef3c7', color: '#92400e' },
  3: { background: '#ede9fe', color: '#5b21b6' },
  4: { background: '#f1f5f9', color: '#475569' },
  5: { background: '#d1fae5', color: '#065f46' },
  6: { background: '#e5e7eb', color: '#374151' },
}

const PRIORITY_SCHEME = {
  1: { background: '#f8fafc', color: '#9ca3af' },
  2: { background: '#dbeafe', color: '#1e40af' },
  3: { background: '#fef3c7', color: '#92400e' },
  4: { background: '#fee2e2', color: '#b91c1c' },
  5: { background: '#fecaca', color: '#7f1d1d' },
}

// Formate des secondes en "XhMM" (ex : 600 → 0h10, 3661 → 1h01)
const fmtDuration = (seconds) => {
  const s = parseInt(seconds) || 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h${m.toString().padStart(2, '0')}`
}

// Coût total d'une ligne : (secondes / 3600 × coût_horaire) + coût_fixe
// v2 retourne "duration" (secondes), pas "actiontime"
const lineCost = (cost) =>
  ((cost.duration || 0) / 3600) * (cost.cost_time || 0)
  + (cost.cost_fixed || 0)
  + (cost.cost_material || 0)

function Badge({ label, scheme = {} }) {
  const text = label !== null && typeof label === 'object'
    ? (label.name ?? label.id ?? '?')
    : (label ?? '—')
  return (
    <span className="badge" style={{ background: scheme.background ?? '#f1f5f9', color: scheme.color ?? '#374151' }}>
      {text}
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

function TicketDetail() {
  const { id: ticketId } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket]   = useState(null)
  const [costs, setCosts]     = useState([])
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      getTicketFull(ticketId),
      getTicketCosts(ticketId).catch(() => []),
      getSubItems('Assistance/Ticket', ticketId, 'Item').catch(() => []),
    ])
      .then(([t, c, i]) => {
        setTicket(t)
        setCosts(Array.isArray(c) ? c : [])
        setItems(Array.isArray(i) ? i : [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [ticketId])

  if (loading) return <div className="page-state">Chargement du ticket...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  const fmt = (val) => val ? new Date(val).toLocaleString('fr-FR') : '—'

  const statusId   = typeof ticket.status   === 'object' ? ticket.status?.id   : ticket.status
  const priorityId = typeof ticket.priority === 'object' ? ticket.priority?.id : ticket.priority
  const typeId     = typeof ticket.type     === 'object' ? ticket.type?.id     : ticket.type

  const grandTotal = costs.reduce((sum, c) => sum + lineCost(c), 0)

  return (
    <div className="detail-wrap">
      <button className="back-btn" onClick={() => navigate('/tickets')}>
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd"/>
        </svg>
        Retour à la liste
      </button>

      <div className="detail-header">
        <p className="page-breadcrumb">Assistance / Tickets</p>
        <h2>Ticket #{ticket.id} — {ticket.name}</h2>
        <div className="detail-badges">
          <Badge label={TYPE_LABELS[typeId] ?? typeId} scheme={{ background: '#f1f5f9', color: '#4b5563' }} />
          <Badge label={STATUS_LABELS[statusId] ?? statusId} scheme={STATUS_SCHEME[statusId]} />
          <Badge label={PRIORITY_LABELS[priorityId] ?? priorityId} scheme={PRIORITY_SCHEME[priorityId]} />
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h3>Informations générales</h3>
          <Row label="Catégorie"        value={ticket.itilcategories_id} />
          <Row label="Entité"           value={ticket.entities_id} />
          <Row label="Urgence"          value={URGENCY_LABELS[ticket.urgency] ?? ticket.urgency} />
          <Row label="Impact"           value={IMPACT_LABELS[ticket.impact]   ?? ticket.impact} />
          <Row label="Ouvert le"        value={fmt(ticket.date)} />
          <Row label="Dernière màj"     value={fmt(ticket.date_mod)} />
          <Row label="Délai résolution" value={fmt(ticket.time_to_resolve)} />
          <Row label="Résolu le"        value={fmt(ticket.solvedate)} />
          <Row label="Clôturé le"       value={fmt(ticket.closedate)} />
        </div>

        <div className="detail-section">
          <h3>Intervenants</h3>
          <Row label="Demandeur"   value={ticket._requester} />
          <Row label="Technicien"  value={ticket._assigned} />
          {ticket._observers?.length > 0 && (
            <Row label="Observateurs" value={ticket._observers.join(', ')} />
          )}
        </div>
      </div>

      {/* Éléments associés */}
      {items.length > 0 && (
        <div className="detail-section">
          <h3>Éléments associés</h3>
          {items.map((item, i) => (
            <div key={item.id ?? i} className="detail-row">
              <span className="detail-label">{item.itemtype ?? 'Actif'}</span>
              <span className="detail-value">
                {item.name ?? item.items_id ?? '—'}
                {item.serial ? <span className="td-item-serial"> — {item.serial}</span> : null}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tableau des coûts */}
      {costs.length > 0 && (
        <div className="detail-section">
          <h3>Coût du ticket</h3>
          <table className="cost-table">
            <thead>
              <tr>
                <th>Durée</th>
                <th>Coût/h</th>
                <th>Coût fixe</th>
                <th>Total ligne</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((cost, i) => (
                <tr key={cost.id ?? i}>
                  <td>{fmtDuration(cost.duration)}</td>
                  <td>{(cost.cost_time  || 0).toFixed(2)} €</td>
                  <td>{(cost.cost_fixed || 0).toFixed(2)} €</td>
                  <td className="cost-line-total">{lineCost(cost).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" className="cost-footer-label">Total</td>
                <td className="cost-grand-total">{grandTotal.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="detail-section">
        <h3>Description</h3>
        <div
          className="detail-content"
          dangerouslySetInnerHTML={{ __html: ticket.content || '<em>Aucune description</em>' }}
        />
      </div>
    </div>
  )
}

export default TicketDetail
