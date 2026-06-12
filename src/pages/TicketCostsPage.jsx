import { Fragment, useEffect, useMemo, useState } from 'react'
import { getTickets, getTicketItems, STATUS_LABELS, TYPE_LABELS } from '../api/tickets'
import { getTicketCosts, addTicketCost, updateTicketCost } from '../api/costs'
import { getAssetFull, ASSET_TYPES } from '../api/assets'
import { getFromSQLite } from '../api/backend'
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

// Affichage monétaire au format français : 260.45 → "260,45"
const fmtMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

// liens Item_Ticket → clé unique "Itemtype:id"
const itemKey = (link) => {
  const rawId = typeof link.items_id === 'object' ? link.items_id?.id : link.items_id
  return { rawId, key: `${link.itemtype}:${rawId}` }
}

function TicketCostsPage() {
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState(null)

  // ticketId → [{ key, itemtype, id, name }]
  const [ticketItems, setTicketItems] = useState({})
  // ticketId → somme des coûts GLPI (import)
  const [importCosts, setImportCosts] = useState({})
  // ticketId → somme des coûts fixes saisis dans le kanban (SQLite)
  const [fixedCosts, setFixedCosts]   = useState({})
  // clé élément sélectionnée pour le filtre ("" = tous)
  const [elementFilter, setElementFilter] = useState('')
  // clés des lignes "Coût par élément" actuellement dépliées (détail par ticket)
  const [expandedElements, setExpandedElements] = useState(new Set())

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const tix = await getTickets()
        if (cancelled) return
        setTickets(tix)

        const [sqliteCosts, perTicket] = await Promise.all([
          getFromSQLite('ticket_costs').catch(() => []),
          Promise.all(tix.map(async (t) => {
            const [links, costs] = await Promise.all([
              getTicketItems(t.id).catch(() => []),
              getTicketCosts(t.id).catch(() => []),
            ])
            return {
              id:         t.id,
              links:      Array.isArray(links) ? links : [],
              importCost: (Array.isArray(costs) ? costs : []).reduce((sum, c) => sum + totalCost(c), 0),
            }
          })),
        ])
        if (cancelled) return

        // Coûts fixes (SQLite) — somme par ticket
        const fixedMap = {}
        ;(Array.isArray(sqliteCosts) ? sqliteCosts : []).forEach((row) => {
          fixedMap[row.ticket_id] = (fixedMap[row.ticket_id] || 0) + (row.fixed_cost || 0)
        })
        setFixedCosts(fixedMap)

        // Coûts import (GLPI) — somme par ticket
        const importMap = {}
        perTicket.forEach((r) => { importMap[r.id] = r.importCost })
        setImportCosts(importMap)

        // Noms des éléments associés — un appel GLPI par actif unique (pas par ticket)
        const uniqueElements = new Map()
        perTicket.forEach((r) => {
          r.links.forEach((link) => {
            const { rawId, key } = itemKey(link)
            if (!uniqueElements.has(key)) uniqueElements.set(key, { itemtype: link.itemtype, id: rawId })
          })
        })

        const nameEntries = await Promise.all(
          [...uniqueElements.entries()].map(async ([key, { itemtype, id }]) => {
            const cfg = ASSET_TYPES[itemtype]
            if (!cfg || !id) return [key, `#${id ?? '?'}`]
            try {
              const asset = await getAssetFull(itemtype, id)
              return [key, asset.name || `#${id}`]
            } catch {
              return [key, `#${id}`]
            }
          })
        )
        if (cancelled) return
        const nameMap = Object.fromEntries(nameEntries)

        const itemsMap = {}
        perTicket.forEach((r) => {
          itemsMap[r.id] = r.links.map((link) => {
            const { rawId, key } = itemKey(link)
            return { key, itemtype: link.itemtype, id: rawId, name: nameMap[key] }
          })
        })
        setTicketItems(itemsMap)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // Coût par élément — le coût total de chaque ticket (import + fixe) est divisé
  // à parts égales entre ses éléments associés, puis cumulé par élément.
  // Les tickets sans élément associé ne sont attribuables à aucun élément.
  // `details` garde la trace de la contribution de chaque ticket pour pouvoir
  // afficher le détail du calcul (déplié dans le tableau).
  const elementCosts = useMemo(() => {
    const map = new Map()
    tickets.forEach((t) => {
      const items = ticketItems[t.id] || []
      if (items.length === 0) return
      const ticketTotal = (importCosts[t.id] || 0) + (fixedCosts[t.id] || 0)
      const share = ticketTotal / items.length
      items.forEach((item) => {
        const entry = map.get(item.key) ?? { ...item, total: 0, ticketCount: 0, details: [] }
        entry.total += share
        entry.ticketCount += 1
        entry.details.push({
          ticketId:   t.id,
          ticketName: t.name,
          ticketTotal,
          itemCount:  items.length,
          share,
        })
        map.set(item.key, entry)
      })
    })
    return [...map.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [tickets, ticketItems, importCosts, fixedCosts])

  if (loading) return <div className="page-state">Chargement des tickets...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  // Options du filtre — un élément par actif distinct, trié par nom
  const elementOptions = [...new Map(
    Object.values(ticketItems).flat().map((item) => [item.key, item])
  ).values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const visibleTickets = elementFilter
    ? tickets.filter((t) => (ticketItems[t.id] || []).some((item) => item.key === elementFilter))
    : tickets

  const totalImport = visibleTickets.reduce((sum, t) => sum + (importCosts[t.id] || 0), 0)
  const totalFixed  = visibleTickets.reduce((sum, t) => sum + (fixedCosts[t.id]  || 0), 0)
  const grandTotal  = totalImport + totalFixed

  const elementCostsTotal = elementCosts.reduce((sum, e) => sum + e.total, 0)

  const toggleElement = (key) => setExpandedElements((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

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
        <span className="page-count">{visibleTickets.length} ticket{visibleTickets.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="cost-filter-bar">
        <label htmlFor="cost-element-filter">Filtrer par élément</label>
        <select
          id="cost-element-filter"
          value={elementFilter}
          onChange={(e) => setElementFilter(e.target.value)}
        >
          <option value="">Tous les éléments</option>
          {elementOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {(ASSET_TYPES[opt.itemtype]?.label ?? opt.itemtype)} — {opt.name}
            </option>
          ))}
        </select>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Titre</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Éléments associés</th>
              <th>Coût import</th>
              <th>Coût fixe</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleTickets.map((ticket) => {
              const items      = ticketItems[ticket.id] || []
              const importCost = importCosts[ticket.id] || 0
              const fixedCost  = fixedCosts[ticket.id]  || 0
              return (
                <tr key={ticket.id} className="table-row">
                  <td className="id-cell">#{ticket.id}</td>
                  <td className="title-cell">
                    <span className="row-title">{ticket.name}</span>
                  </td>
                  <td className="muted">{label(ticket.type, TYPE_LABELS)}</td>
                  <td className="muted">{label(ticket.status, STATUS_LABELS)}</td>
                  <td className="muted">
                    {items.length > 0 ? items.map((i) => i.name).join(', ') : '—'}
                  </td>
                  <td className="cost-cell">{fmtMoney(importCost)} €</td>
                  <td className="cost-cell">{fmtMoney(fixedCost)} €</td>
                  <td className="cost-cell cost-cell--total">{fmtMoney(importCost + fixedCost)} €</td>
                  <td className="cost-action-cell">
                    <button
                      className="cost-btn"
                      onClick={() => setSelected({ id: ticket.id, name: ticket.name })}
                    >
                      Coût
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {visibleTickets.length > 0 && (
            <tfoot>
              <tr className="cost-footer-row">
                <td colSpan="5" className="cost-footer-label">Total</td>
                <td className="cost-cell cost-cell--footer">{fmtMoney(totalImport)} €</td>
                <td className="cost-cell cost-cell--footer">{fmtMoney(totalFixed)} €</td>
                <td className="cost-cell cost-cell--footer cost-cell--total">{fmtMoney(grandTotal)} €</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
        {visibleTickets.length === 0 && <div className="table-empty">Aucun ticket trouvé.</div>}
      </div>

      <div className="cost-section-header">
        <h2>Coût par élément</h2>
        <span className="page-count">{elementCosts.length} élément{elementCosts.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="table-card">
        <table className="data-table cost-element-table">
          <thead>
            <tr>
              <th className="cost-expand-col"></th>
              <th>Type</th>
              <th>Élément</th>
              <th>Tickets</th>
              <th>Coût attribué</th>
            </tr>
          </thead>
          <tbody>
            {elementCosts.map((el) => {
              const isOpen = expandedElements.has(el.key)
              return (
                <Fragment key={el.key}>
                  <tr
                    className={`table-row cost-element-row ${isOpen ? 'is-open' : ''}`}
                    onClick={() => toggleElement(el.key)}
                  >
                    <td className="cost-expand-cell">
                      <span className={`cost-expand-icon ${isOpen ? 'is-open' : ''}`}>▸</span>
                    </td>
                    <td className="muted">{ASSET_TYPES[el.itemtype]?.label ?? el.itemtype}</td>
                    <td className="title-cell">
                      <span className="row-title">{el.name}</span>
                    </td>
                    <td className="muted">{el.ticketCount}</td>
                    <td className="cost-cell cost-cell--total">{fmtMoney(el.total)} €</td>
                  </tr>
                  {isOpen && (
                    <tr className="cost-detail-row">
                      <td colSpan="5">
                        <table className="cost-detail-table">
                          <thead>
                            <tr>
                              <th>Ticket</th>
                              <th>Coût total du ticket</th>
                              <th>Répartition</th>
                              <th>Part attribuée</th>
                            </tr>
                          </thead>
                          <tbody>
                            {el.details.map((d) => (
                              <tr key={d.ticketId}>
                                <td>#{d.ticketId} — {d.ticketName}</td>
                                <td className="cost-cell">{fmtMoney(d.ticketTotal)} €</td>
                                <td className="muted">
                                  {d.itemCount > 1
                                    ? `${fmtMoney(d.ticketTotal)} € ÷ ${d.itemCount} éléments`
                                    : 'Entièrement attribué'}
                                </td>
                                <td className="cost-cell cost-cell--total">{fmtMoney(d.share)} €</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
          {elementCosts.length > 0 && (
            <tfoot>
              <tr className="cost-footer-row">
                <td colSpan="4" className="cost-footer-label">Total</td>
                <td className="cost-cell cost-cell--footer cost-cell--total">{fmtMoney(elementCostsTotal)} €</td>
              </tr>
            </tfoot>
          )}
        </table>
        {elementCosts.length === 0 && <div className="table-empty">Aucun élément associé aux tickets.</div>}
      </div>
    </div>
  )
}

export default TicketCostsPage
