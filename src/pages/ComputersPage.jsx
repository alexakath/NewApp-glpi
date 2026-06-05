import { useEffect, useState } from 'react'
import { getComputers } from '../api/computers'
import ComputerDetail from '../components/ComputerDetail'
import './ComputersPage.css'

function ComputersPage() {
  const [computers, setComputers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // ID de l'ordinateur sélectionné — null = liste, sinon détail
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    getComputers()
      .then(setComputers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (selectedId !== null) {
    return (
      <ComputerDetail
        computerId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  if (loading) return <p className="computers-loading">Chargement des ordinateurs...</p>
  if (error)   return <p className="computers-error">Erreur : {error}</p>

  return (
    <div className="computers-page">
      <div className="page-header">
        <h1>Ordinateurs</h1>
        <span className="page-count">{computers.length}</span>
      </div>
      <div className="computers-table-wrapper">
        <table className="computers-table">
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
                className="computer-row"
                onClick={() => setSelectedId(computer.id)}
              >
                <td>{computer.id}</td>
                <td className="name-cell">
                  <span className="computer-name" title={computer.name}>
                    {computer.name}
                  </span>
                </td>
                <td>{computer.serial || '—'}</td>
                <td>{computer.operatingsystems_id || '—'}</td>
                <td>{computer.locations_id || '—'}</td>
                <td>{computer.states_id || '—'}</td>
                <td>{computer.entities_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {computers.length === 0 && (
          <p className="computers-empty">Aucun ordinateur trouvé.</p>
        )}
      </div>
    </div>
  )
}

export default ComputersPage
