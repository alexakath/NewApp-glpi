import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './TicketCostDetailPage.css'

const fmtMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function TicketCostDetailPage() {
  const navigate  = useNavigate()
  const { state } = useLocation()
  const item      = state?.item
  const typeLabel = state?.typeLabel ?? ''

  useEffect(() => {
    if (!item) navigate('/tickets/costs', { replace: true })
  }, [item, navigate])

  if (!item) return null

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="page-breadcrumb">
            <button className="tcd-breadcrumb-link" onClick={() => navigate('/tickets/costs')}>
              Coûts tickets
            </button>
            {' / '}
            <button className="tcd-breadcrumb-link" onClick={() => navigate(-1)}>
              {typeLabel}
            </button>
            {' / '}{item.name}
          </p>
          <h1>{item.name}</h1>
        </div>
        <button className="tcd-back-btn" onClick={() => navigate(-1)}>← Précédent</button>
      </div>

      <div className="table-card">
        <table className="data-table tcd-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Coût saisi</th>
              <th>Coût import</th>
              <th>Frais réouverture</th>
              <th>Répartition</th>
              <th>Part saisi</th>
              <th>Part import</th>
              <th>Part réouverture</th>
            </tr>
          </thead>
          <tbody>
            {item.details.map(d => (
              <tr key={d.ticketId} className="table-row">
                <td>#{d.ticketId} — {d.ticketName}</td>
                <td className="tcd-cost-cell">{fmtMoney(d.ticketFixed)} €</td>
                <td className="tcd-cost-cell">{fmtMoney(d.ticketImport)} €</td>
                <td className="tcd-cost-cell">{fmtMoney(d.ticketReopen)} €</td>
                <td className="tcd-muted">
                  {d.itemCount > 1 ? `÷ ${d.itemCount} éléments` : 'Entièrement attribué'}
                </td>
                <td className="tcd-cost-cell">{fmtMoney(d.fixedShare)} €</td>
                <td className="tcd-cost-cell">{fmtMoney(d.importShare)} €</td>
                <td className="tcd-cost-cell">{fmtMoney(d.reopenShare)} €</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="tcd-footer-row">
              <td colSpan="5" className="tcd-footer-label">Total attribué à {item.name}</td>
              <td className="tcd-cost-cell tcd-cost-footer">{fmtMoney(item.fixedTotal)} €</td>
              <td className="tcd-cost-cell tcd-cost-footer">{fmtMoney(item.importTotal)} €</td>
              <td className="tcd-cost-cell tcd-cost-footer">{fmtMoney(item.reopenTotal)} €</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default TicketCostDetailPage
