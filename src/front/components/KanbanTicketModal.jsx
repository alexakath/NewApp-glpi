import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getTicketFull, getTicketItems,
  STATUS_LABELS, KANBAN_STATUS_LABELS,
  PRIORITY_LABELS, TYPE_LABELS, URGENCY_LABELS, IMPACT_LABELS,
} from '../../api/tickets'
import { getTicketCosts } from '../../api/costs'
import { getItem } from '../../api/glpi'
import './KanbanTicketModal.css'

// Reproduit les schemes de couleur de TicketDetail backoffice
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

const toId       = (val) => Number(typeof val === 'object' ? val?.id : val)
const fmt        = (val) => val ? new Date(val).toLocaleString('fr-FR') : '—'
const fmtDur     = (sec) => { const s = parseInt(sec)||0; const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); return `${h}h${String(m).padStart(2,'0')}` }
const lineCost   = (c)   => ((c.duration||0)/3600)*(c.cost_time||0) + (c.cost_fixed||0) + (c.cost_material||0)

function Badge({ label, scheme = {} }) {
  return (
    <span className="ktm-badge" style={{ background: scheme.background ?? '#f1f5f9', color: scheme.color ?? '#374151' }}>
      {label ?? '—'}
    </span>
  )
}

function Row({ label, value }) {
  return (
    <div className="ktm-row">
      <span className="ktm-row-label">{label}</span>
      <span className="ktm-row-value">{value ?? '—'}</span>
    </div>
  )
}

export default function KanbanTicketModal({ ticketId, onClose }) {
  const navigate = useNavigate()
  const [ticket,  setTicket]  = useState(null)
  const [costs,   setCosts]   = useState([])
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!ticketId) return
    setLoading(true)
    setError(null)
    setTicket(null)

    Promise.all([
      getTicketFull(ticketId),
      getTicketCosts(ticketId).catch(() => []),
      getTicketItems(ticketId).catch(() => []),
    ]).then(async ([t, c, itemLinks]) => {
      setTicket(t)
      setCosts(Array.isArray(c) ? c : [])

      const links = Array.isArray(itemLinks) ? itemLinks : []
      if (links.length === 0) { setItems([]); return }

      const enriched = await Promise.allSettled(
        links.map(link => {
          if (link._name != null) return Promise.resolve(link)
          const rawId = typeof link.items_id === 'object' ? link.items_id?.id : link.items_id
          const path  = link.itemtype === 'Computer' ? 'Assets/Computer'
                      : link.itemtype === 'Monitor'  ? 'Assets/Monitor' : null
          if (!path || !rawId) return Promise.resolve(link)
          return getItem(path, rawId)
            .then(asset => ({ ...link, _name: asset.name, _serial: asset.serial }))
            .catch(() => link)
        })
      )
      setItems(enriched.flatMap(r => r.status === 'fulfilled' ? [r.value] : []))
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false))
  }, [ticketId])

  // Fermeture au clic sur l'overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const statusId   = ticket ? toId(ticket.status)   : null
  const priorityId = ticket ? toId(ticket.priority) : null
  const typeId     = ticket ? toId(ticket.type)     : null
  const grandTotal = costs.reduce((sum, c) => sum + lineCost(c), 0)

  return (
    <div className="ktm-overlay" onClick={handleOverlayClick}>
      <div className="ktm-panel">

        {/* ── En-tête fixe ── */}
        <div className="ktm-header">
          {ticket && (
            <div>
              <p className="ktm-breadcrumb">Assistance / Tickets</p>
              <h2 className="ktm-title">Ticket #{ticket.id} — {ticket.name}</h2>
            </div>
          )}
          {!ticket && !error && <div className="ktm-title">Chargement…</div>}
          {error && <div className="ktm-title ktm-title--error">Erreur</div>}
          <button className="ktm-close" onClick={onClose}>×</button>
        </div>

        {/* ── Corps scrollable ── */}
        <div className="ktm-body">

          {loading && <p className="ktm-state">Chargement du ticket…</p>}
          {error   && <p className="ktm-state ktm-state--error">Erreur : {error}</p>}

          {ticket && (
            <>
              {/* Badges */}
              <div className="ktm-badges">
                <Badge label={TYPE_LABELS[typeId] ?? typeId}        scheme={{ background: '#f1f5f9', color: '#4b5563' }} />
                <Badge label={KANBAN_STATUS_LABELS[statusId] ?? STATUS_LABELS[statusId] ?? statusId} scheme={STATUS_SCHEME[statusId]} />
                <Badge label={PRIORITY_LABELS[priorityId] ?? priorityId} scheme={PRIORITY_SCHEME[priorityId]} />
              </div>

              {/* Grille informations */}
              <div className="ktm-grid">
                <div className="ktm-section">
                  <h3 className="ktm-section-title">Informations générales</h3>
                  <Row label="Urgence"          value={URGENCY_LABELS[ticket.urgency] ?? ticket.urgency} />
                  <Row label="Impact"           value={IMPACT_LABELS[ticket.impact]   ?? ticket.impact} />
                  <Row label="Ouvert le"        value={fmt(ticket.date)} />
                  <Row label="Dernière màj"     value={fmt(ticket.date_mod)} />
                  <Row label="Délai résolution" value={fmt(ticket.time_to_resolve)} />
                  <Row label="Résolu le"        value={fmt(ticket.solvedate)} />
                  <Row label="Clôturé le"       value={fmt(ticket.closedate)} />
                </div>

                <div className="ktm-section">
                  <h3 className="ktm-section-title">Intervenants</h3>
                  <Row label="Demandeur"    value={ticket._requester} />
                  <Row label="Technicien"   value={ticket._assigned} />
                  {ticket._observers?.length > 0 && (
                    <Row label="Observateurs" value={ticket._observers.join(', ')} />
                  )}
                </div>
              </div>

              {/* Éléments associés */}
              {items.length > 0 && (
                <div className="ktm-section">
                  <h3 className="ktm-section-title">Éléments associés</h3>
                  {items.map((item, i) => {
                    const name = item._name
                      ?? (typeof item.items_id === 'object' ? item.items_id?.name : null)
                      ?? `#${typeof item.items_id === 'object' ? item.items_id?.id : item.items_id}`
                    const typeLabel = item.itemtype === 'Computer' ? 'Ordinateur'
                                    : item.itemtype === 'Monitor'  ? 'Moniteur'
                                    : (item.itemtype ?? 'Actif')
                    return (
                      <Row key={item.id ?? i} label={typeLabel} value={
                        <>{name}{item._serial ? <span className="ktm-serial"> — {item._serial}</span> : null}</>
                      } />
                    )
                  })}
                </div>
              )}

              {/* Coûts */}
              {costs.length > 0 && (
                <div className="ktm-section">
                  <h3 className="ktm-section-title">Coût du ticket</h3>
                  <table className="ktm-cost-table">
                    <thead>
                      <tr>
                        <th>Durée</th><th>Coût/h</th><th>Coût fixe</th><th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costs.map((c, i) => (
                        <tr key={c.id ?? i}>
                          <td>{fmtDur(c.duration)}</td>
                          <td>{(c.cost_time  || 0).toFixed(2)} €</td>
                          <td>{(c.cost_fixed || 0).toFixed(2)} €</td>
                          <td className="ktm-cost-total">{lineCost(c).toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3" className="ktm-cost-footer">Total</td>
                        <td className="ktm-cost-grand">{grandTotal.toFixed(2)} €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Description */}
              <div className="ktm-section">
                <h3 className="ktm-section-title">Description</h3>
                <div
                  className="ktm-content"
                  dangerouslySetInnerHTML={{ __html: ticket.content || '<em>Aucune description</em>' }}
                />
              </div>

              {/* Footer */}
              <div className="ktm-footer">
                <button
                  className="ktm-edit-btn"
                  onClick={() => { onClose(); navigate(`/front/tickets/${ticket.id}/edit`) }}
                >
                  Modifier ce ticket
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
