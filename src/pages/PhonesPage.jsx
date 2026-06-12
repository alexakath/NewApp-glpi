import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPhones } from '../api/phones'
import './PhonesPage.css'

// expand_dropdowns peut retourner un string ou un objet {id,name}
const dd = (val) => (val !== null && typeof val === 'object') ? (val.name ?? val.id ?? null) : (val || null)

function PhonesPage() {
  const navigate = useNavigate()
  const [phones, setPhones] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    getPhones()
      .then(setPhones)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-state">Chargement des telephones...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="page-breadcrumb">Parc</p>
          <h1>Telephones</h1>
        </div>
        <span className="page-count">{phones.length} telephone{phones.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nom</th>
              <th>N° inventaire</th>
              <th>Fabricant</th>
              <th>Localisation</th>
              <th>État</th>
              <th>Marque</th>
              <th>Entité</th>
            </tr>
          </thead>
          <tbody>
            {phones.map((phone) => (
              <tr
                key={phone.id}
                className="table-row"
                onClick={() => navigate(`/phones/${phone.id}`)}
              >
                <td className="id-cell">#{phone.id}</td>
                <td className="title-cell">
                  <span className="row-title" title={phone.name}>{phone.name}</span>
                </td>
                <td className="muted">{phone.otherserial || phone.serial || '—'}</td>
                <td className="muted">{dd(phone.manufacturer) || '—'}</td>
                <td className="muted">{dd(phone.brand) || '—'}</td>
                <td className="muted">{dd(phone.location) || '—'}</td>
                <td>
                  {dd(phone.status)
                    ? <span className="state-pill">{dd(phone.status)}</span>
                    : <span className="muted">—</span>
                  }
                </td>
                <td className="muted">{dd(phone.entity) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {phones.length === 0 && <div className="table-empty">Aucun telephone trouvé.</div>}
      </div>
    </div>
  )
}

export default PhonesPage
