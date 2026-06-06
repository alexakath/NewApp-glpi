import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTicketFull, getTicketItems, STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, URGENCY_LABELS, IMPACT_LABELS } from '../api/tickets'
import { getTicketCosts } from '../api/costs'
import { getItem } from '../api/glpi'
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
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        // Chargement en parallèle des trois sources de données.
        // getTicketItems utilise l'API v1, les deux autres utilisent v2.
        // .catch(() => []) sur costs et items : une erreur partielle
        // ne bloque pas l'affichage du ticket principal.
        const [t, c, itemLinks] = await Promise.all([
          getTicketFull(ticketId),                  // v2 : ticket + membres
          getTicketCosts(ticketId).catch(() => []),  // v2 : coûts
          getTicketItems(ticketId).catch(() => []),  // v1 : liens Item_Ticket
        ])
        setTicket(t)
        setCosts(Array.isArray(c) ? c : [])

        // itemLinks = [{ id, itemtype: "Computer", items_id: 3, tickets_id: 1 }, ...]
        // Ce sont seulement des LIENS — pas encore les noms ni les serials.
        const links = Array.isArray(itemLinks) ? itemLinks : []
        if (links.length === 0) { setItems([]); return }

        // Enrichissement via v2 : pour chaque lien, on va chercher le détail
        // de l'actif (nom, serial) dans /Assets/Computer/{id} ou /Assets/Monitor/{id}.
        // Promise.allSettled : si un actif échoue, les autres s'affichent quand même.
        const enriched = await Promise.allSettled(
          links.map(link => {
            // Si _name est déjà là (cas où v1 aurait fourni le nom), on évite l'appel
            if (link._name != null) return Promise.resolve(link)

            // items_id est un entier brut depuis v1 (expand_dropdowns désactivé)
            const rawId = typeof link.items_id === 'object' ? link.items_id?.id : link.items_id

            // Chemin v2 selon le type d'actif
            const path  = link.itemtype === 'Computer' ? 'Assets/Computer'
                        : link.itemtype === 'Monitor'  ? 'Assets/Monitor'
                        : null

            if (!path || !rawId) return Promise.resolve(link)

            // Appel v2 pour obtenir le nom et le numéro de série
            return getItem(path, rawId)
              .then(asset => ({ ...link, _name: asset.name, _serial: asset.serial }))
              .catch(() => link)   // en cas d'échec, on garde le lien sans nom
          })
        )

        // flatMap : on garde seulement les résultats réussis (fulfilled)
        setItems(enriched.flatMap(r => r.status === 'fulfilled' ? [r.value] : []))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
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
          {items.map((item, i) => {
            const name = item._name
              ?? (typeof item.items_id === 'object' ? item.items_id?.name : null)
              ?? `#${typeof item.items_id === 'object' ? item.items_id?.id : item.items_id}`
            const typeLabel = item.itemtype === 'Computer' ? 'Ordinateur'
                            : item.itemtype === 'Monitor'  ? 'Moniteur'
                            : (item.itemtype ?? 'Actif')
            return (
              <div key={item.id ?? i} className="detail-row">
                <span className="detail-label">{typeLabel}</span>
                <span className="detail-value">
                  {name}
                  {item._serial ? <span className="td-item-serial"> — {item._serial}</span> : null}
                </span>
              </div>
            )
          })}
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
