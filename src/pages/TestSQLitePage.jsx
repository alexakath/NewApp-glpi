import { useState, useEffect } from 'react'
import { getTickets } from '../api/tickets'
import {
  checkBackendHealth,
  getTicketsFromSQLite,
  syncTicketsToSQLite,
  clearTicketsFromSQLite,
} from '../api/backend'
import { STATUS_LABELS, TYPE_LABELS, PRIORITY_LABELS } from '../api/tickets'
import './TestSQLitePage.css'

const fmt = (isoStr) => {
  if (!isoStr) return '—'
  return isoStr.replace('T', ' ').slice(0, 16)
}

export default function TestSQLitePage() {
  const [health,       setHealth]       = useState(null)   // null | true | false
  const [glpiCount,    setGlpiCount]    = useState(null)
  const [sqliteRows,   setSqliteRows]   = useState([])
  const [syncing,      setSyncing]      = useState(false)
  const [clearing,     setClearing]     = useState(false)
  const [log,          setLog]          = useState([])

  const addLog = (msg, type = 'info') =>
    setLog(prev => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev])

  // ── Vérification du backend au montage ──────────────────────────────────────
  useEffect(() => {
    checkBackendHealth()
      .then(() => { setHealth(true); addLog('Backend opérationnel', 'success') })
      .catch(() => { setHealth(false); addLog('Backend inaccessible — lancez `npm run dev` dans server/', 'error') })
  }, [])

  // ── Lecture des tickets SQLite au montage ────────────────────────────────────
  useEffect(() => {
    if (health !== true) return
    loadSQLite()
  }, [health])

  const loadSQLite = () =>
    getTicketsFromSQLite()
      .then(rows => setSqliteRows(rows))
      .catch(() => addLog('Erreur lecture SQLite', 'error'))

  // ── Synchronisation GLPI → SQLite ───────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true)
    addLog('Chargement des tickets depuis GLPI…')
    try {
      const tickets = await getTickets()
      setGlpiCount(tickets.length)
      addLog(`${tickets.length} ticket(s) récupéré(s) depuis GLPI`)

      addLog('Envoi vers le backend SQLite…')
      const result = await syncTicketsToSQLite(tickets)
      addLog(result.message, 'success')

      await loadSQLite()
    } catch (err) {
      addLog(`Erreur : ${err.message}`, 'error')
    } finally {
      setSyncing(false)
    }
  }

  // ── Vider la table SQLite ────────────────────────────────────────────────────
  const handleClear = async () => {
    if (!window.confirm('Vider tous les tickets de SQLite ?')) return
    setClearing(true)
    try {
      const result = await clearTicketsFromSQLite()
      addLog(result.message, 'warn')
      setSqliteRows([])
    } catch (err) {
      addLog(`Erreur : ${err.message}`, 'error')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="tsql-page">
      <div className="tsql-header">
        <h1>Test SQLite</h1>
        <p className="tsql-sub">Vérification de la connexion React → Backend → SQLite</p>
      </div>

      {/* ── Statut backend ── */}
      <div className="tsql-status-bar">
        <div className={`tsql-badge ${health === true ? 'ok' : health === false ? 'err' : 'pending'}`}>
          {health === null ? '⏳ Vérification backend…'
            : health ? '✓ Backend connecté (port 3001)'
            : '✗ Backend inaccessible'}
        </div>
        <div className="tsql-counts">
          {glpiCount !== null && <span>GLPI : <strong>{glpiCount}</strong> tickets</span>}
          <span>SQLite : <strong>{sqliteRows.length}</strong> tickets</span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="tsql-actions">
        <button
          className="tsql-btn tsql-btn--sync"
          onClick={handleSync}
          disabled={syncing || health !== true}
        >
          {syncing ? 'Synchronisation…' : '↓ Sync GLPI → SQLite'}
        </button>
        <button
          className="tsql-btn tsql-btn--clear"
          onClick={handleClear}
          disabled={clearing || sqliteRows.length === 0}
        >
          Vider SQLite
        </button>
      </div>

      {/* ── Log ── */}
      {log.length > 0 && (
        <div className="tsql-log">
          {log.map((entry, i) => (
            <div key={i} className={`tsql-log-line tsql-log--${entry.type}`}>
              <span className="tsql-log-time">{entry.time}</span>
              <span>{entry.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tableau SQLite ── */}
      {sqliteRows.length > 0 && (
        <div className="tsql-table-wrap">
          <h2 className="tsql-table-title">Tickets stockés dans SQLite ({sqliteRows.length})</h2>
          <table className="tsql-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Titre</th>
                <th>Statut</th>
                <th>Type</th>
                <th>Priorité</th>
                <th>Date modif.</th>
                <th>Synchronisé</th>
              </tr>
            </thead>
            <tbody>
              {sqliteRows.map(row => (
                <tr key={row.id}>
                  <td className="tsql-id">{row.id}</td>
                  <td className="tsql-name">{row.name || '—'}</td>
                  <td><span className="tsql-pill">{STATUS_LABELS[row.status] ?? row.status ?? '—'}</span></td>
                  <td>{TYPE_LABELS[row.type] ?? '—'}</td>
                  <td>{PRIORITY_LABELS[row.priority] ?? '—'}</td>
                  <td className="tsql-date">{fmt(row.date_mod)}</td>
                  <td className="tsql-date tsql-synced">{fmt(row.synced_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {health === true && sqliteRows.length === 0 && !syncing && (
        <div className="tsql-empty">
          SQLite est vide — cliquez sur "Sync GLPI → SQLite" pour copier les tickets.
        </div>
      )}
    </div>
  )
}
