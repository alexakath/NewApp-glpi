import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getComputerFull } from '../api/computers'
import './ComputerDetail.css'

function Row({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value ?? '—'}</span>
    </div>
  )
}

function ComputerDetail() {
  const { id: computerId } = useParams()
  const navigate = useNavigate()
  const [computer, setComputer] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getComputerFull(computerId)
      .then(setComputer)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [computerId])

  if (loading) return <div className="page-state">Chargement de l'ordinateur...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  const fmt = (val) => val ? new Date(val).toLocaleString('fr-FR') : '—'

  return (
    <div className="detail-wrap">
      <button className="back-btn" onClick={() => navigate('/computers')}>
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd"/>
        </svg>
        Retour à la liste
      </button>

      <div className="detail-header">
        <p className="page-breadcrumb">Parc / Ordinateurs</p>
        <div className="cd-header-row">
          <h2>{computer.name}</h2>
          {computer.states_id && (
            <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>
              {computer.states_id}
            </span>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h3>Identification</h3>
          <Row label="Numéro de série" value={computer.serial} />
          <Row label="N° inventaire"   value={computer.otherserial} />
          <Row label="Type"            value={computer.computertypes_id} />
          <Row label="Fabricant"       value={computer.manufacturers_id} />
          <Row label="Modèle"          value={computer.computermodels_id} />
        </div>

        <div className="detail-section">
          <h3>Localisation</h3>
          <Row label="Entité"       value={computer.entities_id} />
          <Row label="Localisation" value={computer.locations_id} />
          <Row label="Groupe"       value={computer.groups_id} />
          <Row label="Utilisateur"  value={computer.users_id} />
          <Row label="Technicien"   value={computer.users_id_tech} />
        </div>

        <div className="detail-section">
          <h3>Système</h3>
          <Row label="Système d'exploitation" value={computer.operatingsystems_id} />
          <Row label="Version OS"             value={computer.operatingsystemversions_id} />
          <Row label="Architecture"           value={computer.operatingsystemarchitectures_id} />
          <Row label="UUID"                   value={computer.uuid} />
        </div>

        <div className="detail-section">
          <h3>Dates</h3>
          <Row label="Ajouté le"   value={fmt(computer.date_creation)} />
          <Row label="Dernière màj" value={fmt(computer.date_mod)} />
          <Row label="Contact"     value={computer.contact} />
          <Row label="N° contact"  value={computer.contact_num} />
        </div>
      </div>

      {computer._disks.length > 0 && (
        <div className="detail-section">
          <h3>Disques</h3>
          <table className="cd-disks-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Point de montage</th>
                <th>Taille totale</th>
                <th>Espace libre</th>
              </tr>
            </thead>
            <tbody>
              {computer._disks.map((disk, i) => (
                <tr key={i}>
                  <td>{disk.name || '—'}</td>
                  <td>{disk.mountpoint || '—'}</td>
                  <td>{disk.totalsize ? `${disk.totalsize} Mo` : '—'}</td>
                  <td>{disk.freesize  ? `${disk.freesize} Mo`  : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {computer.comment && (
        <div className="detail-section">
          <h3>Commentaire</h3>
          <p className="detail-content">{computer.comment}</p>
        </div>
      )}
    </div>
  )
}

export default ComputerDetail
