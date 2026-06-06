import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMonitorFull } from '../../api/monitors'
import { IcoBack } from '../icons'
import './FrontDetail.css'

const n = (obj) => obj?.name || '—'

function FrontMonitorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [monitor, setMonitor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    getMonitorFull(id)
      .then(setMonitor)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="fd-state">Chargement…</div>
  if (error)   return <div className="fd-state fd-state--error">Erreur : {error}</div>

  return (
    <div className="fd-wrap fd-wrap--monitor">
      <button className="fd-back" onClick={() => navigate('/front')}>
        <IcoBack /> Retour à l'inventaire
      </button>

      <div className="fd-header">
        <div className="fd-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <div>
          <p className="fd-breadcrumb">Parc / Moniteurs</p>
          <h1 className="fd-title">{monitor.name}</h1>
          {monitor.status && (
            <span className="fd-status-badge">{monitor.status.name}</span>
          )}
        </div>
      </div>

      <div className="fd-grid">
        <div className="fd-card">
          <h3 className="fd-card-title">Identification</h3>
          <dl className="fd-dl">
            <div className="fd-dl-row"><dt>Numéro de série</dt><dd>{monitor.serial || '—'}</dd></div>
            <div className="fd-dl-row"><dt>N° inventaire</dt><dd>{monitor.otherserial || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Fabricant</dt><dd>{n(monitor.manufacturer)}</dd></div>
            <div className="fd-dl-row"><dt>Modèle</dt><dd>{n(monitor.model)}</dd></div>
            <div className="fd-dl-row"><dt>Type</dt><dd>{n(monitor.type)}</dd></div>
            <div className="fd-dl-row"><dt>Taille écran</dt><dd>{monitor.size > 0 ? `${monitor.size}"` : '—'}</dd></div>
          </dl>
        </div>

        <div className="fd-card">
          <h3 className="fd-card-title">Affectation</h3>
          <dl className="fd-dl">
            <div className="fd-dl-row"><dt>Utilisateur</dt><dd>{n(monitor.user)}</dd></div>
            <div className="fd-dl-row"><dt>Localisation</dt><dd>{n(monitor.location)}</dd></div>
            <div className="fd-dl-row"><dt>Entité</dt><dd>{n(monitor.entity)}</dd></div>
            <div className="fd-dl-row"><dt>Groupe</dt><dd>{Array.isArray(monitor.group) && monitor.group.length ? monitor.group.map(g => g.name).join(', ') : '—'}</dd></div>
          </dl>
        </div>

        {monitor._features?.length > 0 && (
          <div className="fd-card">
            <h3 className="fd-card-title">Connectique</h3>
            <ul className="fd-features">
              {monitor._features.map((f) => (
                <li key={f} className="fd-feature">
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z"/>
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default FrontMonitorDetail
