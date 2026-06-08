import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMonitorFull } from '../api/monitors'
import './MonitorDetail.css'

function Row({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || '—'}</span>
    </div>
  )
}

function MonitorDetail() {
  const { id: monitorId } = useParams()
  const navigate = useNavigate()
  const [monitor, setMonitor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getMonitorFull(monitorId)
      .then(setMonitor)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [monitorId])

  if (loading) return <div className="page-state">Chargement du moniteur...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  const fmt = (val) => val ? new Date(val).toLocaleString('fr-FR') : '—'

  // expand_dropdowns retourne string ou {id,name}
  const dd = (val) => (val !== null && typeof val === 'object') ? (val.name ?? val.id ?? null) : (val || null)

  return (
    <div className="detail-wrap">
      <button className="back-btn" onClick={() => navigate('/monitors')}>
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd"/>
        </svg>
        Retour à la liste
      </button>

      <div className="detail-header">
        <p className="page-breadcrumb">Parc / Moniteurs</p>
        <div className="monitor-header-row">
          <h2>{monitor.name}</h2>
          {dd(monitor.status) && (
            <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>
              {dd(monitor.status)}
            </span>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h3>Identification</h3>
          <Row label="N° de série"   value={monitor.serial} />
          <Row label="N° inventaire" value={monitor.otherserial} />
          <Row label="Type"          value={dd(monitor.type)} />
          <Row label="Fabricant"     value={dd(monitor.manufacturer)} />
          <Row label="Modèle"        value={dd(monitor.model)} />
          <Row label="Taille écran"  value={monitor.size > 0 ? `${monitor.size}"` : null} />
        </div>

        <div className="detail-section">
          <h3>Affectation</h3>
          <Row label="Entité"       value={dd(monitor.entity)} />
          <Row label="Localisation" value={dd(monitor.location)} />
          <Row label="Utilisateur"  value={dd(monitor.user)} />
          <Row label="Technicien"   value={dd(monitor.user_tech)} />
          <Row label="Groupe"       value={dd(monitor.group?.[0])} />
        </div>

        <div className="detail-section">
          <h3>Connectique & fonctionnalités</h3>
          {monitor._features.length > 0
            ? monitor._features.map((f) => (
                <div key={f} className="monitor-feature">
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z"/>
                  </svg>
                  {f}
                </div>
              ))
            : <p className="detail-value">Aucune information disponible</p>
          }
        </div>

        <div className="detail-section">
          <h3>Dates</h3>
          <Row label="Ajouté le"    value={fmt(monitor.date_creation)} />
          <Row label="Dernière màj" value={fmt(monitor.date_mod)} />
          <Row label="Contact"      value={monitor.contact} />
          <Row label="N° contact"   value={monitor.contact_num} />
        </div>
      </div>

      {monitor.comment && (
        <div className="detail-section">
          <h3>Commentaire</h3>
          <p className="detail-content">{monitor.comment}</p>
        </div>
      )}
    </div>
  )
}

export default MonitorDetail
