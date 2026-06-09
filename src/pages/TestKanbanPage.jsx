import { useState, useEffect } from 'react'
import { getKanbanColumns, updateKanbanColumn, checkBackendHealth, getKanbanLang, setKanbanLang } from '../api/backend'
import { KANBAN_STATUS_IDS, KANBAN_STATUS_LABELS } from '../api/tickets'
import './TestKanbanPage.css'

const DEFAULT_COLORS    = { 1: '#dbeafe', 2: '#fef9c3', 5: '#dcfce7' }
const DEFAULT_LABELS_FR = { 1: 'Nouveau', 2: 'In progress', 5: 'Terminé' }
const DEFAULT_LABELS_MG = { 1: 'Vaovao',  2: 'Efa manao',  5: 'Vita' }

export default function TestKanbanPage() {
  const [health,     setHealth]     = useState(null)
  const [columns,    setColumns]    = useState({})
  const [lang,       setLang]       = useState('fr')
  const [saving,     setSaving]     = useState(false)
  const [saveMsg,    setSaveMsg]    = useState(null) // { ok, text }
  const [resetting,  setResetting]  = useState(null) // 'colors' | 'fr' | 'mg' | null
  const [resetMsg,   setResetMsg]   = useState(null)
  const [langBusy,   setLangBusy]   = useState(false)

  useEffect(() => {
    checkBackendHealth()
      .then(() => {
        setHealth(true)
        getKanbanColumns().then(rows => {
          const map = {}
          rows.forEach(r => { map[r.status_id] = { color: r.color, label_mg: r.label_mg } })
          setColumns(map)
        })
        getKanbanLang().then(setLang).catch(() => {})
      })
      .catch(() => setHealth(false))
  }, [])

  const handleChange = (sid, field, value) =>
    setColumns(prev => ({ ...prev, [sid]: { ...prev[sid], [field]: value } }))

  // ── Un seul bouton "Enregistrer" pour les 3 colonnes ─────────────────────────
  const handleSaveAll = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      await Promise.all(KANBAN_STATUS_IDS.map(sid => updateKanbanColumn(sid, columns[sid])))
      setSaveMsg({ ok: true, text: 'Modifications enregistrées.' })
    } catch {
      setSaveMsg({ ok: false, text: 'Erreur lors de la sauvegarde.' })
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  // ── Langue ───────────────────────────────────────────────────────────────────
  const handleLangChange = async (newLang) => {
    setLangBusy(true)
    try { await setKanbanLang(newLang); setLang(newLang) }
    finally { setLangBusy(false) }
  }

  // ── Réinitialisation (3 cas simples, sans "tout réinitialiser") ───────────────
  const handleReset = async (type) => {
    setResetting(type)
    setResetMsg(null)
    try {
      await Promise.all(KANBAN_STATUS_IDS.map(sid => {
        const patch = {}
        if (type === 'colors') patch.color    = DEFAULT_COLORS[sid]
        if (type === 'fr')     patch.label_mg = DEFAULT_LABELS_FR[sid]
        if (type === 'mg')     patch.label_mg = DEFAULT_LABELS_MG[sid]
        return updateKanbanColumn(sid, patch)
      }))
      setColumns(prev => {
        const next = { ...prev }
        KANBAN_STATUS_IDS.forEach(sid => {
          next[sid] = { ...next[sid] }
          if (type === 'colors') next[sid].color    = DEFAULT_COLORS[sid]
          if (type === 'fr')     next[sid].label_mg = DEFAULT_LABELS_FR[sid]
          if (type === 'mg')     next[sid].label_mg = DEFAULT_LABELS_MG[sid]
        })
        return next
      })
      setResetMsg({ ok: true, text: 'Réinitialisation effectuée.' })
    } catch {
      setResetMsg({ ok: false, text: 'Erreur lors de la réinitialisation.' })
    } finally {
      setResetting(null)
      setTimeout(() => setResetMsg(null), 3000)
    }
  }

  return (
    <div className="tkan-page">

      {/* En-tête */}
      <div className="tkan-header">
        <div>
          <h1 className="tkan-title">Configuration Kanban</h1>
          <p className="tkan-sub">Personnaliser les colonnes affichées dans le frontoffice</p>
        </div>
        <div className={`tkan-badge ${health === true ? 'ok' : health === false ? 'err' : 'pending'}`}>
          {health === null ? 'Vérification backend…'
            : health ? '✓ Backend connecté'
            : '✗ Backend inaccessible'}
        </div>
      </div>

      {health === false && (
        <p className="tkan-backend-hint">Lancez <code>npm run dev</code> dans le dossier <code>server/</code></p>
      )}

      {health === true && (
        <>
          {/* ── Section 1 : Langue ── */}
          <section className="tkan-section">
            <h2 className="tkan-section-title">Langue du frontoffice</h2>
            <div className="tkan-lang-row">
              <div className="tkan-toggle">
                <button
                  className={`tkan-toggle-btn${lang === 'fr' ? ' active' : ''}`}
                  onClick={() => handleLangChange('fr')}
                  disabled={langBusy || lang === 'fr'}
                >
                  Français
                </button>
                <button
                  className={`tkan-toggle-btn${lang === 'mg' ? ' active' : ''}`}
                  onClick={() => handleLangChange('mg')}
                  disabled={langBusy || lang === 'mg'}
                >
                  Malgache
                </button>
              </div>
              <span className="tkan-lang-preview">
                Colonnes affichées :&nbsp;
                <strong>
                  {lang === 'fr' ? 'Nouveau · In progress · Terminé' : 'Vaovao · Efa manao · Vita'}
                </strong>
              </span>
            </div>
          </section>

          {/* ── Section 2 : Colonnes ── */}
          <section className="tkan-section">
            <h2 className="tkan-section-title">Colonnes</h2>

            <table className="tkan-table">
              <thead>
                <tr>
                  <th>Colonne</th>
                  <th>Couleur de fond</th>
                  <th>Nom affiché</th>
                </tr>
              </thead>
              <tbody>
                {KANBAN_STATUS_IDS.map(sid => {
                  const col = columns[sid] ?? { color: '#f1f5f9', label_mg: '' }
                  return (
                    <tr key={sid}>
                      <td>
                        <div className="tkan-col-label">
                          <span className="tkan-col-swatch" style={{ background: col.color }} />
                          {KANBAN_STATUS_LABELS[sid]}
                        </div>
                      </td>
                      <td>
                        <div className="tkan-color-cell">
                          <input
                            type="color"
                            className="tkan-color-input"
                            value={col.color}
                            onChange={e => handleChange(sid, 'color', e.target.value)}
                          />
                          <span className="tkan-color-hex">{col.color}</span>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="tkan-text-input"
                          value={col.label_mg}
                          placeholder="ex: Vaovao"
                          onChange={e => handleChange(sid, 'label_mg', e.target.value)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Aperçu miniature */}
            <div className="tkan-preview">
              {KANBAN_STATUS_IDS.map(sid => {
                const col = columns[sid] ?? { color: '#f1f5f9', label_mg: '' }
                return (
                  <div key={sid} className="tkan-preview-col" style={{ background: col.color }}>
                    <span className="tkan-preview-name">
                      {lang === 'mg' && col.label_mg ? col.label_mg : KANBAN_STATUS_LABELS[sid]}
                    </span>
                    <div className="tkan-preview-card" />
                    <div className="tkan-preview-card" />
                  </div>
                )
              })}
            </div>

            {/* Bouton de sauvegarde unique */}
            <div className="tkan-save-row">
              {saveMsg && (
                <span className={`tkan-msg ${saveMsg.ok ? 'tkan-msg--ok' : 'tkan-msg--err'}`}>
                  {saveMsg.ok ? '✓' : '✗'} {saveMsg.text}
                </span>
              )}
              <button className="tkan-save-btn" onClick={handleSaveAll} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
            </div>
          </section>

          {/* ── Section 3 : Réinitialisation ── */}
          <section className="tkan-section tkan-section--muted">
            <h2 className="tkan-section-title">Réinitialiser</h2>
            <div className="tkan-reset-row">
              <button
                className="tkan-reset-btn"
                onClick={() => handleReset('colors')}
                disabled={!!resetting}
              >
                {resetting === 'colors' ? '…' : 'Couleurs par défaut'}
              </button>
              <button
                className="tkan-reset-btn"
                onClick={() => handleReset('fr')}
                disabled={!!resetting}
                title="Nouveau · In progress · Terminé"
              >
                {resetting === 'fr' ? '…' : 'Noms FR/EN'}
              </button>
              <button
                className="tkan-reset-btn"
                onClick={() => handleReset('mg')}
                disabled={!!resetting}
                title="Vaovao · Efa manao · Vita"
              >
                {resetting === 'mg' ? '…' : 'Noms malgaches'}
              </button>
            </div>
            {resetMsg && (
              <p className={`tkan-msg ${resetMsg.ok ? 'tkan-msg--ok' : 'tkan-msg--err'}`}>
                {resetMsg.ok ? '✓' : '✗'} {resetMsg.text}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
