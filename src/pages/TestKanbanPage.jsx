import { useState, useEffect } from 'react'
import { getKanbanColumns, updateKanbanColumn, checkBackendHealth } from '../api/backend'
import './TestKanbanPage.css'

const STATUS_FR = { 1: 'Nouveau', 2: 'En cours', 5: 'Fermé' }
const KANBAN_STATUS_IDS = [1, 2, 5]

export default function TestKanbanPage() {
  const [health,  setHealth]  = useState(null)
  const [columns, setColumns] = useState({})   // { [status_id]: { color, label_mg } }
  const [saving,  setSaving]  = useState({})   // { [status_id]: 'idle' | 'saving' | 'ok' | 'err' }

  useEffect(() => {
    checkBackendHealth()
      .then(() => { setHealth(true); load() })
      .catch(() => setHealth(false))
  }, [])

  const load = () =>
    getKanbanColumns().then(rows => {
      const map = {}
      rows.forEach(r => { map[r.status_id] = { color: r.color, label_mg: r.label_mg } })
      setColumns(map)
    })

  const handleChange = (statusId, field, value) =>
    setColumns(prev => ({ ...prev, [statusId]: { ...prev[statusId], [field]: value } }))

  const handleSave = async (statusId) => {
    setSaving(prev => ({ ...prev, [statusId]: 'saving' }))
    try {
      await updateKanbanColumn(statusId, columns[statusId])
      setSaving(prev => ({ ...prev, [statusId]: 'ok' }))
      setTimeout(() => setSaving(prev => ({ ...prev, [statusId]: 'idle' })), 2000)
    } catch {
      setSaving(prev => ({ ...prev, [statusId]: 'err' }))
    }
  }

  return (
    <div className="tkan-page">
      <div className="tkan-header">
        <h1>Configuration Kanban</h1>
        <p className="tkan-sub">Couleurs et noms malgaches des 3 colonnes — stockés dans SQLite</p>
      </div>

      <div className={`tkan-badge ${health === true ? 'ok' : health === false ? 'err' : 'pending'}`}>
        {health === null ? '⏳ Vérification backend…'
          : health ? '✓ Backend connecté'
          : '✗ Backend inaccessible — lancez npm run dev dans server/'}
      </div>

      {health === true && (
        <div className="tkan-cards">
          {KANBAN_STATUS_IDS.map(sid => {
            const col  = columns[sid] ?? { color: '#f1f5f9', label_mg: '' }
            const st   = saving[sid] ?? 'idle'
            return (
              <div key={sid} className="tkan-card" style={{ borderTopColor: col.color }}>
                <div className="tkan-card-preview" style={{ background: col.color }} />

                <div className="tkan-card-title">{STATUS_FR[sid]}</div>

                <label className="tkan-label">Couleur de fond</label>
                <div className="tkan-color-row">
                  <input
                    type="color"
                    className="tkan-color-input"
                    value={col.color}
                    onChange={e => handleChange(sid, 'color', e.target.value)}
                  />
                  <span className="tkan-color-hex">{col.color}</span>
                </div>

                <label className="tkan-label">Nom en malgache</label>
                <input
                  type="text"
                  className="tkan-text-input"
                  value={col.label_mg}
                  placeholder="ex: Vaovao"
                  onChange={e => handleChange(sid, 'label_mg', e.target.value)}
                />

                <button
                  className={`tkan-btn ${st === 'ok' ? 'tkan-btn--ok' : st === 'err' ? 'tkan-btn--err' : ''}`}
                  onClick={() => handleSave(sid)}
                  disabled={st === 'saving'}
                >
                  {st === 'saving' ? 'Enregistrement…'
                    : st === 'ok'   ? '✓ Enregistré'
                    : st === 'err'  ? '✗ Erreur'
                    : 'Enregistrer'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {health === true && Object.keys(columns).length > 0 && (
        <div className="tkan-preview-section">
          <h2 className="tkan-preview-title">Aperçu des colonnes</h2>
          <div className="tkan-preview-board">
            {KANBAN_STATUS_IDS.map(sid => {
              const col = columns[sid] ?? { color: '#f1f5f9', label_mg: '' }
              return (
                <div key={sid} className="tkan-preview-col" style={{ background: col.color }}>
                  <div className="tkan-preview-col-header">
                    <span className="tkan-preview-col-mg">{col.label_mg || '—'}</span>
                    <span className="tkan-preview-col-fr">{STATUS_FR[sid]}</span>
                  </div>
                  <div className="tkan-preview-card">Ticket exemple</div>
                  <div className="tkan-preview-card">Ticket exemple</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
