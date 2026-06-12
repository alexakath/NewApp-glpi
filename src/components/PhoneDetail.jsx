import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPhoneFull } from '../api/phones'
import './PhoneDetail.css'

function Row({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || '—'}</span>
    </div>
  )
}

function PhoneDetail() {
  const { id: phoneId } = useParams()
  const navigate = useNavigate()
  const [phone, setPhone] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getPhoneFull(phoneId)
      .then(setPhone)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [phoneId])

  if (loading) return <div className="page-state">Chargement du telephone...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  const fmt = (val) => val ? new Date(val).toLocaleString('fr-FR') : '—'

  // expand_dropdowns retourne string ou {id,name}
  const dd = (val) => (val !== null && typeof val === 'object') ? (val.name ?? val.id ?? null) : (val || null)

  return (
    <div className="detail-wrap">
      <button className="back-btn" onClick={() => navigate('/phones')}>
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd"/>
        </svg>
        Retour à la liste
      </button>

      <div className="detail-header">
        <p className="page-breadcrumb">Parc / Telephones</p>
        <div className="Phone-header-row">
          <h2>{phone.name}</h2>
          {dd(phone.status) && (
            <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>
              {dd(phone.status)}
            </span>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h3>Identification</h3>
          <Row label="N° de série"   value={phone.serial} />
          <Row label="N° inventaire" value={phone.otherserial} />
          <Row label="Type"          value={dd(phone.type)} />
          <Row label="Fabricant"     value={dd(phone.manufacturer)} />
          <Row label="Modèle"        value={dd(phone.model)} />
          <Row label="Marque"        value={dd(phone.brand)} />
          {/* <Row label="Taille écran"  value={phone.size > 0 ? `${phone.size}"` : null} /> */}
        </div>

        <div className="detail-section">
          <h3>Affectation</h3>
          <Row label="Entité"       value={dd(phone.entity)} />
          <Row label="Localisation" value={dd(phone.location)} />
          <Row label="Utilisateur"  value={dd(phone.user)} />
          <Row label="Technicien"   value={dd(phone.user_tech)} />
          <Row label="Groupe"       value={dd(phone.group?.[0])} />
        </div>

        {/* <div className="detail-section">
          <h3>Connectique & fonctionnalités</h3>
          {phone._features.length > 0
            ? phone._features.map((f) => (
                <div key={f} className="phone-feature">
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z"/>
                  </svg>
                  {f}
                </div>
              ))
            : <p className="detail-value">Aucune information disponible</p>
          }
        </div> */}

        <div className="detail-section">
          <h3>Dates</h3>
          <Row label="Ajouté le"    value={fmt(phone.date_creation)} />
          <Row label="Dernière màj" value={fmt(phone.date_mod)} />
          <Row label="Contact"      value={phone.contact} />
          <Row label="N° contact"   value={phone.contact_num} />
        </div>
      </div>

      {phone.comment && (
        <div className="detail-section">
          <h3>Commentaire</h3>
          <p className="detail-content">{phone.comment}</p>
        </div>
      )}
    </div>
  )
}

export default PhoneDetail
