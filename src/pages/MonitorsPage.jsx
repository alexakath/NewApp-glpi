import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMonitors } from '../api/monitors'
import './MonitorsPage.css'

// v2 retourne des objets {id, name} pour les champs relationnels
const n = (obj) => obj?.name || '—'

function MonitorsPage() {
  const navigate = useNavigate()
  const [monitors, setMonitors] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    getMonitors()
      .then(setMonitors)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-state">Chargement des moniteurs...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="page-breadcrumb">Parc</p>
          <h1>Moniteurs</h1>
        </div>
        <span className="page-count">{monitors.length} moniteur{monitors.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nom</th>
              <th>N° de série</th>
              <th>Taille</th>
              <th>Localisation</th>
              <th>État</th>
              <th>Entité</th>
            </tr>
          </thead>
          <tbody>
            {monitors.map((monitor) => (
              <tr
                key={monitor.id}
                className="table-row"
                onClick={() => navigate(`/monitors/${monitor.id}`)}
              >
                <td className="id-cell">#{monitor.id}</td>
                <td className="title-cell">
                  <span className="row-title" title={monitor.name}>{monitor.name}</span>
                </td>
                <td className="muted">{monitor.serial || '—'}</td>
                <td className="muted">{monitor.size > 0 ? `${monitor.size}"` : '—'}</td>
                <td className="muted">{n(monitor.location)}</td>
                <td>
                  {monitor.status
                    ? <span className="state-pill">{n(monitor.status)}</span>
                    : <span className="muted">—</span>
                  }
                </td>
                <td className="muted">{n(monitor.entity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {monitors.length === 0 && <div className="table-empty">Aucun moniteur trouvé.</div>}
      </div>
    </div>
  )
}

export default MonitorsPage
