import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './TicketCostElementPage.css'

const fmtMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function TicketCostElementPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const group = state?.group

  useEffect(() => {
    if (!group) navigate('/tickets/costs', { replace: true })
  }, [group, navigate])

  if (!group) return null

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="page-breadcrumb">
            <button className="tce-breadcrumb-link" onClick={() => navigate('/tickets/costs')}>
              Coûts tickets
            </button>
            {' / '}{group.label}
          </p>
          <h1>{group.label}</h1>
        </div>
        <span className="page-count">
          {group.items.length} élément{group.items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-card">
        <table className="data-table tce-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Coût saisi</th>
              <th>Coût import</th>
              <th>Frais de réouverture</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map(item => (
              <tr
                key={item.key}
                className="table-row tce-item-row"
                onClick={() => navigate(
                  `/tickets/costs/item/${item.itemtype}/${item.id}`,
                  { state: { item, typeLabel: group.label } }
                )}
              >
                <td className="title-cell">
                  <span className="row-title">{item.name}</span>
                  <span className="row-sub">{item.ticketCount} ticket{item.ticketCount !== 1 ? 's' : ''}</span>
                </td>
                <td className="tce-cost-cell">{fmtMoney(item.fixedTotal)} €</td>
                <td className="tce-cost-cell">{fmtMoney(item.importTotal)} €</td>
                <td className="tce-cost-cell">{fmtMoney(item.reopenTotal)} €</td>
                <td className="tce-cost-cell tce-cost-total">
                  {fmtMoney(item.fixedTotal + item.importTotal + item.reopenTotal)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TicketCostElementPage
