import { useEffect, useState } from 'react'
import { getComputerFull } from '../api/computers'
import './ComputerDetail.css'

function Row({ label, value }) {
  return (
    <div className="cd-row">
      <span className="cd-label">{label}</span>
      <span className="cd-value">{value ?? '—'}</span>
    </div>
  )
}

// Affiche le détail complet d'un ordinateur
// computerId : ID de l'ordinateur sélectionné depuis la liste
// onBack : callback pour revenir à la liste
function ComputerDetail({ computerId, onBack }) {
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

  if (loading) return <p className="cd-loading">Chargement de l'ordinateur...</p>
  if (error)   return <p className="cd-error">Erreur : {error}</p>

  const formatDate = (val) =>
    val ? new Date(val).toLocaleString('fr-FR') : '—'

  return (
    <div className="computer-detail">
      <button className="cd-back" onClick={onBack}>← Retour à la liste</button>

      <div className="cd-header">
        <h2>{computer.name}</h2>
        <span className="cd-state">{computer.states_id || 'État inconnu'}</span>
      </div>

      <div className="cd-grid">
        <div className="cd-section">
          <h3>Identification</h3>
          <Row label="Numéro de série"    value={computer.serial} />
          <Row label="N° inventaire"      value={computer.otherserial} />
          <Row label="Type"               value={computer.computertypes_id} />
          <Row label="Fabricant"          value={computer.manufacturers_id} />
          <Row label="Modèle"             value={computer.computermodels_id} />
        </div>

        <div className="cd-section">
          <h3>Localisation</h3>
          <Row label="Entité"             value={computer.entities_id} />
          <Row label="Localisation"       value={computer.locations_id} />
          <Row label="Groupe"             value={computer.groups_id} />
          <Row label="Utilisateur"        value={computer.users_id} />
          <Row label="Technicien"         value={computer.users_id_tech} />
        </div>

        <div className="cd-section">
          <h3>Système</h3>
          <Row label="Système d'exploitation" value={computer.operatingsystems_id} />
          <Row label="Version OS"         value={computer.operatingsystemversions_id} />
          <Row label="Architecture"       value={computer.operatingsystemarchitectures_id} />
          <Row label="UUID"               value={computer.uuid} />
        </div>

        <div className="cd-section">
          <h3>Dates</h3>
          <Row label="Ajouté le"          value={formatDate(computer.date_creation)} />
          <Row label="Dernière màj"       value={formatDate(computer.date_mod)} />
          <Row label="Contact"            value={computer.contact} />
          <Row label="N° contact"         value={computer.contact_num} />
        </div>
      </div>

      {computer._disks.length > 0 && (
        <div className="cd-section">
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
        <div className="cd-section">
          <h3>Commentaire</h3>
          <p className="cd-comment">{computer.comment}</p>
        </div>
      )}
    </div>
  )
}

export default ComputerDetail
