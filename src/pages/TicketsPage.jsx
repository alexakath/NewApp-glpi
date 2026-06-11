import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTickets, STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS } from '../api/tickets'
import './TicketsPage.css'

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

function Badge({ label, scheme = {} }) {
  // v2 peut retourner un objet {id, name} à la place d'un scalaire
  const text = label !== null && typeof label === 'object'
    ? (label.name ?? label.id ?? '?')
    : (label ?? '—')
  return (
    <span
      className="badge"
      style={{ background: scheme.background ?? '#f1f5f9', color: scheme.color ?? '#374151' }}
    >
      {text}
    </span>
  )
}

function TicketsPage() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  useEffect(() => {
    getTickets()
      .then(setTickets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const getId =  (val) => (val !== null && typeof val === 'object' ? val.id : val)

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch = ticket.name?.toLowerCase?().includes(search.toLowerCase())
      const matchesStatus = !statusFilter || String(getId(ticket.status)) === statusFilter
      const matchesType = !typeFilter || String(getId(ticket.type)) === typeFilter
      const matchesPriority = !priorityFilter || String(getId(ticket.priority)) === priorityFilter
      return matchesSearch && matchesStatus && matchesType && matchesPriority
    })
  }, [tickets, search, statusFilter, typeFilter, priorityFilter])

  if (loading) return <div className="page-state">Chargement des tickets...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="page-breadcrumb">Assistance</p>
          <h1>Tickets</h1>
        </div>
        <span className="page-count">{filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="filters-bar">
        <input type="text" className="filter-input" placeholder="Rechercher un ticket..." value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          <option value="">Tous les status</option>
          {Object.entries(STATUS_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <select className="filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          <option value="">Tous les priorites</option>
          {Object.entries(PRIORITY_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>

      <div className="table-card">
        <table className="data-table">
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
            {filteredTickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="table-row"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <td className="id-cell">#{ticket.id}</td>
                <td className="title-cell">
                  <span className="row-title" title={ticket.name}>{ticket.name}</span>
                </td>
                <td>{TYPE_LABELS[ticket.type] ?? ticket.type}</td>
                <td>
                  <Badge
                    label={STATUS_LABELS[ticket.status] ?? ticket.status}
                    scheme={STATUS_SCHEME[ticket.status]}
                  />
                </td>
                <td>
                  <Badge
                    label={PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                    scheme={PRIORITY_SCHEME[ticket.priority]}
                  />
                </td>
                <td className="muted">{ticket.itilcategories_id || '—'}</td>
                <td className="muted">{new Date(ticket.date).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTickets.length === 0 && <div className="table-empty">Aucun ticket trouvé.</div>}
      </div>
    </div>
  )
}

export default TicketsPage
