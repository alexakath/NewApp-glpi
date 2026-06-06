import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getComputers } from '../api/computers'
import './ComputersPage.css'

// expand_dropdowns peut retourner un string ou un objet {id,name}
const dd = (val) => (val !== null && typeof val === 'object') ? (val.name ?? val.id ?? null) : (val || null)

function ComputersPage() {
  const navigate = useNavigate()
  const [computers, setComputers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    getComputers()
      .then(setComputers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-state">Chargement des ordinateurs...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="page-breadcrumb">Parc</p>
          <h1>Ordinateurs</h1>
        </div>
        <span className="page-count">{computers.length} appareil{computers.length !== 1 ? 's' : ''}</span>
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
              <th>Entité</th>
            </tr>
          </thead>
          <tbody>
            {computers.map((computer) => (
              <tr
                key={computer.id}
                className="table-row"
                onClick={() => navigate(`/computers/${computer.id}`)}
              >
                <td className="id-cell">#{computer.id}</td>
                <td className="title-cell">
                  <span className="row-title" title={computer.name}>{computer.name}</span>
                </td>
                <td className="muted">{computer.otherserial || computer.serial || '—'}</td>
                <td className="muted">{dd(computer.manufacturer) || '—'}</td>
                <td className="muted">{dd(computer.location) || '—'}</td>
                <td>
                  {dd(computer.status)
                    ? <span className="state-pill">{dd(computer.status)}</span>
                    : <span className="muted">—</span>
                  }
                </td>
                <td className="muted">{dd(computer.entity) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {computers.length === 0 && <div className="table-empty">Aucun ordinateur trouvé.</div>}
      </div>
    </div>
  )
}

export default ComputersPage
