import { useEffect, useState } from 'react'
import { getComputers } from '../api/computers'
import { getMonitors }  from '../api/monitors'
import { getTickets }   from '../api/tickets'
import './DashboardPage.css'

// Récupère tous les éléments (pas de limite à 100) pour des comptages exacts
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
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    Promise.all([getComputers(ALL), getMonitors(ALL), getTickets(ALL)])
      .then(([computers, monitors, tickets]) => setData({ computers, monitors, tickets }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-state">Chargement du tableau de bord...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  const { computers, monitors, tickets } = data

  const totalElements = computers.length + monitors.length
  const incidents     = tickets.filter((t) => t.type === 1).length
  const demandes      = tickets.filter((t) => t.type === 2).length

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
          rows={[
            { name: 'Ordinateurs', count: computers.length, color: '#2563eb' },
            { name: 'Moniteurs',   count: monitors.length,  color: '#7c3aed' },
          ]}
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
