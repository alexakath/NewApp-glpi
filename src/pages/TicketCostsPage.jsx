import { useEffect, useState } from 'react'
import { getTickets, STATUS_LABELS, TYPE_LABELS } from '../api/tickets'
import { getTicketCosts, addTicketCost, updateTicketCost } from '../api/costs'
import './TicketCostsPage.css'

const fmtDuration = (seconds) => {
  const s = parseInt(seconds) || 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h${m.toString().padStart(2, '0')}`
}

const label = (val, map) => {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'object') return val.name ?? '—'
  return map?.[val] ?? String(val)
}

// v2 retourne "duration" (secondes), pas "actiontime"
const totalCost = (cost) =>
  ((cost.duration || 0) / 3600) * (cost.cost_time || 0)
  + (cost.cost_fixed || 0)
  + (cost.cost_material || 0)

const emptyForm = (name = '') => ({ name, hours: '0', minutes: '0', hourlyRate: '', fixedCost: '' })

// actiontime (secondes) → heures + minutes pour le formulaire
const costToForm = (cost) => {
  const s = parseInt(cost.duration) || 0   // v2 → "duration" pas "actiontime"
  return {
    name:       cost.name ?? '',
    hours:      Math.floor(s / 3600).toString(),
    minutes:    Math.floor((s % 3600) / 60).toString(),
    hourlyRate: (cost.cost_time  || 0).toString(),
    fixedCost:  (cost.cost_fixed || 0).toString(),
  }
}

/* ── Formulaire réutilisable ─────────────────── */

function CostForm({ initial, onSave, onCancel, submitLabel = 'Enregistrer' }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await onSave(form)
    } catch (error) {
      const data = error.response?.data
      setErr(data?.message ?? data?.detail ?? 'Erreur lors de l\'enregistrement.')
      setSaving(false)
    }
  }

  return (
    <form className="cost-form" onSubmit={handleSubmit}>
      <div className="cost-form-grid">
        <div className="cost-field cost-field--full">
          <label>Nom <span className="cost-field-optional">(optionnel)</span></label>
          <input type="text" value={form.name} onChange={set('name')} placeholder="ex : Intervention, Pièce achetée..." />
        </div>
        <div className="cost-field cost-field--duration">
          <label>Durée</label>
          <div className="duration-inputs">
            <div className="duration-part">
              <input type="number" min="0" step="1" placeholder="0"
                value={form.hours} onChange={set('hours')} />
              <span className="duration-unit">h</span>
            </div>
            <div className="duration-part">
              <input type="number" min="0" max="59" step="1" placeholder="00"
                value={form.minutes} onChange={set('minutes')} />
              <span className="duration-unit">min</span>
            </div>
          </div>
        </div>
        <div className="cost-field">
          <label>Coût horaire (€/h)</label>
          <input type="number" min="0" step="0.01" placeholder="ex : 50.00"
            value={form.hourlyRate} onChange={set('hourlyRate')} />
        </div>
        <div className="cost-field">
          <label>Coût fixe (€)</label>
          <input type="number" min="0" step="0.01" placeholder="ex : 100.00"
            value={form.fixedCost} onChange={set('fixedCost')} />
        </div>
      </div>
      {err && <div className="login-error">{err}</div>}
      <div className="cost-form-footer">
        {onCancel && (
          <button type="button" className="cost-cancel-btn" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button type="submit" className="login-btn" disabled={saving}>
          {saving ? 'Enregistrement…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

/* ── Modal ───────────────────────────────────── */

function CostModal({ ticket, onClose }) {
  const [costs, setCosts]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId]   = useState(null)

  const reload = () =>
    getTicketCosts(ticket.id)
      .then((data) => setCosts(Array.isArray(data) ? data : []))
      .catch(() => setCosts([]))
      .finally(() => setLoading(false))

  useEffect(() => { reload() }, [ticket.id])

  const hasCosts = costs && costs.length > 0

  const handleAdd = async (form) => {
    await addTicketCost(ticket.id, form)
    setShowAddForm(false)
    setLoading(true)
    reload()
  }

  const handleEdit = async (costId, form) => {
    await updateTicketCost(ticket.id, costId, form)
    setEditingId(null)
    setLoading(true)
    reload()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="page-breadcrumb">Assistance / Tickets</p>
            <h2 className="modal-title">#{ticket.id} — {ticket.name}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p className="modal-loading">Chargement des coûts...</p>

          ) : !hasCosts && !showAddForm ? (
            /* ── Aucun coût — formulaire direct ── */
            <>
              <p className="modal-empty">Aucun coût enregistré — ajoutez-en un ci-dessous.</p>
              <CostForm
                initial={emptyForm(ticket.name)}
                onSave={handleAdd}
                submitLabel="Enregistrer le coût"
              />
            </>

          ) : (
            /* ── Liste des coûts existants ──────── */
            <>
              <div className="costs-list">
                {costs.map((cost) =>
                  editingId === cost.id ? (
                    /* Formulaire de modification inline */
                    <div key={cost.id} className="cost-item cost-item--editing">
                      <div className="cost-item-name">Modification — {cost.name}</div>
                      <CostForm
                        initial={costToForm(cost)}
                        onSave={(form) => handleEdit(cost.id, form)}
                        onCancel={() => setEditingId(null)}
                        submitLabel="Mettre à jour"
                      />
                    </div>
                  ) : (
                    /* Affichage normal */
                    <div key={cost.id} className="cost-item">
                      <div className="cost-item-header">
                        <span className="cost-item-name">{cost.name || '(sans nom)'}</span>
                        <button
                          className="cost-edit-btn"
                          onClick={() => { setEditingId(cost.id); setShowAddForm(false) }}
                        >
                          Modifier
                        </button>
                      </div>
                      <div className="cost-item-meta">
                        <span>Durée : <strong>{fmtDuration(cost.duration)}</strong></span>
                        <span>Horaire : <strong>{(cost.cost_time || 0).toFixed(2)} €/h</strong></span>
                        <span>Fixe : <strong>{(cost.cost_fixed || 0).toFixed(2)} €</strong></span>
                      </div>
                      <div className="cost-item-total">
                        Total : <span className="cost-total-value">{totalCost(cost).toFixed(2)} €</span>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Formulaire d'ajout (togglable) */}
              {showAddForm ? (
                <div className="cost-add-form-wrap">
                  <div className="cost-add-form-title">Nouveau coût</div>
                  <CostForm
                    initial={emptyForm(ticket.name)}
                    onSave={handleAdd}
                    onCancel={() => setShowAddForm(false)}
                    submitLabel="Ajouter"
                  />
                </div>
              ) : (
                <button
                  className="cost-add-btn"
                  onClick={() => { setShowAddForm(true); setEditingId(null) }}
                >
                  + Ajouter un coût
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Page principale ────────────────────────── */

function TicketCostsPage() {
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getTickets()
      .then(setTickets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-state">Chargement des tickets...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  return (
    <div className="page-wrap">
      {selected && (
        <CostModal ticket={selected} onClose={() => setSelected(null)} />
      )}

      <div className="page-header">
        <div>
          <p className="page-breadcrumb">Assistance</p>
          <h1>Coûts des tickets</h1>
        </div>
        <span className="page-count">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Titre</th>
              <th>Type</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="table-row">
                <td className="id-cell">#{ticket.id}</td>
                <td className="title-cell">
                  <span className="row-title">{ticket.name}</span>
                </td>
                <td className="muted">{label(ticket.type, TYPE_LABELS)}</td>
                <td className="muted">{label(ticket.status, STATUS_LABELS)}</td>
                <td className="cost-action-cell">
                  <button
                    className="cost-btn"
                    onClick={() => setSelected({ id: ticket.id, name: ticket.name })}
                  >
                    Coût
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && <div className="table-empty">Aucun ticket trouvé.</div>}
      </div>
    </div>
  )
}

export default TicketCostsPage
