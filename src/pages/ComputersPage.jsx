import { useEffect, useState } from 'react'
import { getComputers } from '../api/computers'
import ComputerDetail from '../components/ComputerDetail'
import './ComputersPage.css'

function ComputersPage() {
  const [computers, setComputers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    getComputers()
      .then(setComputers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (selectedId !== null) {
    return <ComputerDetail computerId={selectedId} onBack={() => setSelectedId(null)} />
  }

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
              <th>Numéro de série</th>
              <th>Système d'exploitation</th>
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
                onClick={() => setSelectedId(computer.id)}
              >
                <td className="id-cell">#{computer.id}</td>
                <td className="title-cell">
                  <span className="row-title" title={computer.name}>{computer.name}</span>
                </td>
                <td className="muted">{computer.serial || '—'}</td>
                <td className="muted">{computer.operatingsystems_id || '—'}</td>
                <td className="muted">{computer.locations_id || '—'}</td>
                <td>
                  {computer.states_id
                    ? <span className="state-pill">{computer.states_id}</span>
                    : <span className="muted">—</span>
                  }
                </td>
                <td className="muted">{computer.entities_id || '—'}</td>
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
