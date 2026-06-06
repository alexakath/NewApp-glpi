import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTickets, deleteTicket, TYPE_LABELS, STATUS_LABELS } from '../../api/tickets'
import './FrontTicketsPage.css'

// GLPI peut retourner un champ comme entier, string, ou objet { id, name } (expand_dropdowns)
const resolve = (val, labels) => {
  const key = val !== null && typeof val === 'object' ? val?.id : val
  const label = labels[key] ?? (val !== null && typeof val === 'object' ? val?.name : val)
  return { key, label: label ?? '—' }
}

function FrontTicketsPage() {
  const navigate = useNavigate()
  const [tickets,  setTickets]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [deleting, setDeleting] = useState(null) // id du ticket en cours de suppression

  useEffect(() => {
    getTickets()
      .then(setTickets)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (ticket) => {
    if (!window.confirm(`Supprimer le ticket « ${ticket.name} » ?`)) return
    setDeleting(ticket.id)
    try {
      await deleteTicket(ticket.id)
      setTickets(prev => prev.filter(t => t.id !== ticket.id))
    } catch (err) {
      alert(`Erreur lors de la suppression : ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <p className="ft-status">Chargement des tickets…</p>
  if (error)   return <p className="ft-status ft-status--error">Erreur : {error}</p>

  return (
    <div>
      {/* En-tête avec compteur et bouton de création */}
      <div className="ft-header">
        <div>
          <h1 className="ft-title">Tickets</h1>
          <span className="ft-count">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="ft-btn-create" onClick={() => navigate('/front/tickets/new')}>
          + Créer un ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="ft-empty">
          <p>Aucun ticket pour le moment</p>
          <button className="ft-btn-create" onClick={() => navigate('/front/tickets/new')}>
            Créer le premier ticket
          </button>
        </div>
      ) : (
        <div className="ft-table-wrap">
          <table className="ft-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Titre</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => {
                const { key: typeKey,   label: typeLabel   } = resolve(t.type,   TYPE_LABELS)
                const { key: statusKey, label: statusLabel } = resolve(t.status, STATUS_LABELS)
                return (
                  <tr key={t.id}>
                    <td className="ft-id">{t.id}</td>
                    <td className="ft-name">{t.name}</td>
                    <td><span className={`ft-badge ft-badge--type${typeKey}`}>{typeLabel}</span></td>
                    <td><span className={`ft-badge ft-badge--status${statusKey}`}>{statusLabel}</span></td>
                    <td className="ft-date">
                      {t.date ? new Date(t.date).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="ft-actions">
                      <button
                        className="ft-btn-edit"
                        onClick={() => navigate(`/front/tickets/${t.id}/edit`)}
                      >
                        Modifier
                      </button>
                      <button
                        className="ft-btn-delete"
                        onClick={() => handleDelete(t)}
                        disabled={deleting === t.id}
                      >
                        {deleting === t.id ? '…' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default FrontTicketsPage
