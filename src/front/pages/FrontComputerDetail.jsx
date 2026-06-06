import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getComputerFull } from '../../api/computers'
import { IcoBack } from '../icons'
import './FrontDetail.css'

function FrontComputerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [computer, setComputer] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    getComputerFull(id)
      .then(setComputer)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="fd-state">Chargement…</div>
  if (error)   return <div className="fd-state fd-state--error">Erreur : {error}</div>

  return (
    <div className="fd-wrap fd-wrap--computer">
      <button className="fd-back" onClick={() => navigate('/front')}>
        <IcoBack /> Retour à l'inventaire
      </button>

      <div className="fd-header">
        <div className="fd-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="13" rx="2"/>
            <path d="M9 17.25v1.007a2 2 0 01-.586 1.414L7.5 21h9l-.914-.914A2 2 0 0115 18.257V17.25"/>
            <line x1="9" y1="17" x2="15" y2="17"/>
          </svg>
        </div>
        <div>
          <p className="fd-breadcrumb">Parc / Ordinateurs</p>
          <h1 className="fd-title">{computer.name}</h1>
          {computer.states_id && (
            <span className="fd-status-badge">{computer.states_id}</span>
          )}
        </div>
      </div>

      <div className="fd-grid">
        <div className="fd-card">
          <h3 className="fd-card-title">Identification</h3>
          <dl className="fd-dl">
            <div className="fd-dl-row"><dt>Numéro de série</dt><dd>{computer.serial || '—'}</dd></div>
            <div className="fd-dl-row"><dt>N° inventaire</dt><dd>{computer.otherserial || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Fabricant</dt><dd>{computer.manufacturers_id || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Modèle</dt><dd>{computer.computermodels_id || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Type</dt><dd>{computer.computertypes_id || '—'}</dd></div>
          </dl>
        </div>

        <div className="fd-card">
          <h3 className="fd-card-title">Affectation</h3>
          <dl className="fd-dl">
            <div className="fd-dl-row"><dt>Utilisateur</dt><dd>{computer.users_id || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Localisation</dt><dd>{computer.locations_id || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Groupe</dt><dd>{computer.groups_id || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Entité</dt><dd>{computer.entities_id || '—'}</dd></div>
          </dl>
        </div>

        <div className="fd-card">
          <h3 className="fd-card-title">Système</h3>
          <dl className="fd-dl">
            <div className="fd-dl-row"><dt>OS</dt><dd>{computer.operatingsystems_id || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Version</dt><dd>{computer.operatingsystemversions_id || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Architecture</dt><dd>{computer.operatingsystemarchitectures_id || '—'}</dd></div>
          </dl>
        </div>
      </div>

      {computer._disks?.length > 0 && (
        <div className="fd-card fd-card--full">
          <h3 className="fd-card-title">Stockage</h3>
          <div className="fd-disks">
            {computer._disks.map((disk, i) => {
              const used = disk.totalsize && disk.freesize ? disk.totalsize - disk.freesize : null
              const pct  = used && disk.totalsize ? Math.round((used / disk.totalsize) * 100) : null
              return (
                <div key={i} className="fd-disk">
                  <div className="fd-disk-header">
                    <span className="fd-disk-name">{disk.mountpoint || disk.name || `Disque ${i + 1}`}</span>
                    <span className="fd-disk-size">{disk.totalsize ? `${disk.totalsize} Mo` : '—'}</span>
                  </div>
                  {pct !== null && (
                    <div className="fd-disk-bar">
                      <div className="fd-disk-fill" style={{ width: `${pct}%`, background: pct > 85 ? '#ef4444' : '#3b82f6' }} />
                    </div>
                  )}
                  {disk.freesize != null && (
                    <p className="fd-disk-free">{disk.freesize} Mo libres</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default FrontComputerDetail
