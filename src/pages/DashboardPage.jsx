import { useEffect, useState } from 'react'
import { getAssets, ASSET_TYPES, ASSET_TYPE_KEYS } from '../api/assets'
import { getTickets } from '../api/tickets'
import './DashboardPage.css'

const ALL = { range: '0-9999' }

function StatCard({ title, total, label, rows }) {
  return (
    <div className="stat-card">
      <div className="stat-card-head">
        <span className="stat-card-title">{title}</span>
        <div>
          <span className="stat-card-total">{total}</span>
          <span className="stat-card-label">{label}</span>
        </div>
      </div>
      <div className="stat-card-rows">
        {rows.map(({ name, count, color }) => (
          <div key={name} className="stat-row">
            <div className="stat-row-left">
              <span className="stat-dot" style={{ background: color }} />
              <span className="stat-row-name">{name}</span>
            </div>
            <div className="stat-row-right">
              <span className="stat-row-count">{count}</span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: total > 0 ? `${(count / total) * 100}%` : '0%',
                    background: color,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardPage() {
  const [assetCounts, setAssetCounts] = useState({})
  const [tickets,     setTickets]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    Promise.all([
      Promise.all(ASSET_TYPE_KEYS.map(t => getAssets(t, ALL).catch(() => []))),
      getTickets(ALL).catch(() => []),
    ]).then(([lists, tix]) => {
      const counts = {}
      ASSET_TYPE_KEYS.forEach((t, i) => {
        counts[t] = lists[i].filter(a => !a.is_deleted).length
      })
      setAssetCounts(counts)
      setTickets(tix)
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-state">Chargement du tableau de bord...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  // Uniquement les types avec au moins 1 élément
  const presentTypes = ASSET_TYPE_KEYS.filter(t => (assetCounts[t] ?? 0) > 0)
  const totalElements = presentTypes.reduce((s, t) => s + assetCounts[t], 0)

  const incidents = tickets.filter(t => t.type === 1).length
  const demandes  = tickets.filter(t => t.type === 2).length

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="page-breadcrumb">Vue d'ensemble</p>
          <h1>Tableau de bord</h1>
        </div>
        <span className="dash-date">{today}</span>
      </div>

      <div className="dash-grid">
        <StatCard
          title="Parc informatique"
          total={totalElements}
          label={totalElements !== 1 ? 'éléments' : 'élément'}
          rows={presentTypes.map(t => ({
            name:  ASSET_TYPES[t].label,
            count: assetCounts[t],
            color: ASSET_TYPES[t].color,
          }))}
        />
        <StatCard
          title="Tickets d'assistance"
          total={tickets.length}
          label={tickets.length !== 1 ? 'tickets' : 'ticket'}
          rows={[
            { name: 'Incidents', count: incidents, color: '#ef4444' },
            { name: 'Demandes',  count: demandes,  color: '#f59e0b' },
          ]}
        />
      </div>
    </div>
  )
}

export default DashboardPage
