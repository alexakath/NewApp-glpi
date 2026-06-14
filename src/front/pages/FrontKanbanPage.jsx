import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getTickets, updateTicket,
  KANBAN_STATUS_IDS, KANBAN_STATUS_LABELS, KANBAN_COLUMNS, statusToColumn,
} from '../../api/tickets'
import { getKanbanColumns, getKanbanLang, addTicketCostToSQLite, getTicketCostsForTicket, deleteTicketCostFromSQLite } from '../../api/backend'
import KanbanTicketModal from '../components/KanbanTicketModal'
import './FrontKanbanPage.css'

const FALLBACK_COLORS  = { 1: '#dbeafe', 2: '#fef9c3', 5: '#dcfce7' }

// Extrait l'ID numérique d'un champ GLPI (int, string, ou {id, name})
const toId = (val) => Number(typeof val === 'object' ? val?.id : val)

// Une entrée vide par colonne Kanban (ex: { 1: [], 2: [], 5: [] })
const emptyGroups = () => Object.fromEntries(KANBAN_STATUS_IDS.map(cid => [cid, []]))

export default function FrontKanbanPage() {
  const navigate = useNavigate()
  const [grouped,    setGrouped]    = useState(emptyGroups)
  const [kanbanCols, setKanbanCols] = useState({})  // { [sid]: { color, label_mg } }
  const [lang,       setLang]       = useState('fr')
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(null)  // { ticket, fromSid }
  const [dragOver, setDragOver] = useState(null)

  // ── Dialogue résolution (→ Terminé) ─────────────────────────────────────────
  const [dialog,     setDialog]     = useState(null)
  const [resolution, setResolution] = useState('')
  const [fixedCost, setFixedCost] = useState('')
  const [moving,     setMoving]     = useState(false)

  const [reopenDialog, setReopenDialog] = useState(null)
  const [reopenPercent, setReopenPercent] = useState('')
  const [reopenBusy, setReopenBusy] = useState(false)


  // ── Détail ticket (clic) ─────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    Promise.all([
      getTickets(),
      getKanbanColumns().catch(() => null),
      getKanbanLang().catch(() => 'fr'),
    ]).then(([tickets, cols, fetchedLang]) => {
      const groups = emptyGroups()
      tickets.forEach(t => {
        const sid = toId(t.status)
        const col = statusToColumn(sid)
        if (col != null) groups[col].push(t)
      })
      setGrouped(groups)
      setLang(fetchedLang)

      if (cols?.length) {
        const map = {}
        cols.forEach(r => { map[r.status_id] = { color: r.color, label_mg: r.label_mg } })
        setKanbanCols(map)
      }
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false))
  }, [])

  // Titre d'une colonne selon la langue
  const colTitle = (sid) =>
    lang === 'mg' && kanbanCols[sid]?.label_mg
      ? kanbanCols[sid].label_mg
      : KANBAN_STATUS_LABELS[sid]

  const colColor = (sid) => kanbanCols[sid]?.color ?? FALLBACK_COLORS[sid]

  // ── DnD ──────────────────────────────────────────────────────────────────────
  const onDragStart = (e, ticket, fromSid) => {
    setDragging({ ticket, fromSid })
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragEnd = () => { setDragging(null); setDragOver(null) }

  const onDragOver = (e, sid) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOver !== sid) setDragOver(sid)
  }

  const onDrop = (e, toSid) => {
    e.preventDefault()
    setDragOver(null)
    if (!dragging) return
    const { ticket, fromSid } = dragging
    setDragging(null)
    if (fromSid === toSid) return

    if (toSid === 5) {
      setDialog({ ticket, fromSid, toSid })
      setResolution('')
      setFixedCost('')
    } else if ( fromSid === 5 && toSid === 2) {
      openReopenDialog(ticket, fromSid, toSid)
    } else {
      doMove(ticket, fromSid, toSid)
    }
  }

  const moveTicketStatus = async (ticket, fromSid, toSid) => {
    const newStatus = KANBAN_COLUMNS[toSid].dropStatus
    await updateTicket(ticket.id, { status: newStatus})
    setGrouped(prev => {
      const next = Object.fromEntries(KANBAN_STATUS_IDS.map(cid => [cid, [...prev[cid]]]))
      KANBAN_STATUS_IDS.forEach(s => { next[s] = next[s].filter(t => t.id !==ticket.id)})
      next[toSid] = [...next[toSid], {...ticket, status: newStatus}]
      return next
    })
  }  

  const doMove = async (ticket, fromSid, toSid) => {
    setMoving(true)
    try {
      await moveTicketStatus(ticket, fromSid, toSid)
      if (toSid === 5 && fixedCost) {
        await addTicketCostToSQLite(ticket.id, parseFloat(fixedCost)).catch(() => {})
      }
    } catch (err) {
      alert(`Erreur lors du changement de statut : ${err.message}`)
    } finally {
      setMoving(false)
      setDialog(null)
      setResolution('')
      setFixedCost('')
    }
  }

  const confirmDialog = () => dialog && doMove(dialog.ticket, dialog.fromSid, dialog.toSid)

  const openReopenDialog = async (ticket, fromSid, toSid) => {
    setReopenPercent('')
    let totalSum = 0
    let lastFixedId =null
    try {
      const rows = await getTicketCostsForTicket(ticket.id)
      const list = Array.isArray(rows) ? rows : []
      totalSum = list.reduce((sum, r) => sum + (r.fixed_cost || 0), 0)
      const lastFixed = list.find(r => (r.type || 'fixed') === 'fixed')
      lastFixedId = lastFixed?.id ?? null
    } catch {/* aucun coût enregistré */ }
    setReopenDialog({ticket, fromSid, toSid, totalSum, lastFixedId})
  }

  const cancelReopenDialog = () => {
    if (reopenBusy) return
    setReopenDialog(null)
    setReopenPercent('')
  }

  const cancelReopen = async () => {
    if(!reopenDialog) return
    const { ticket, fromSid, toSid, lastFixedId} = reopenDialog
    setReopenBusy(true)
    try{
      await moveTicketStatus(ticket, fromSid, toSid)
      if (lastFixedId) await deleteTicketCostFromSQLite(lastFixedId).catch(() => {})
    } catch(err) {
      alert(`Erreur lors du changement de statut : ${err.message}`)
    } finally {
      setReopenBusy(false)
      setReopenDialog(null)
      setReopenPercent('')
    }
  }

  const confirmReopen = async () => {
    if (!reopenDialog) return
    const pct = parseFloat(reopenPercent)
    if(!pct) return
    const { ticket, fromSid, toSid, totalSum } = reopenDialog
    setReopenBusy(true)
    try {
      await moveTicketStatus(ticket, fromSid, toSid)
      const reopenCost = totalSum * (pct / 100)
      await addTicketCostToSQLite(ticket.id, reopenCost, 'reopen').catch(() => {})
    } catch (err) {
      alert (`Erreur lors du changement de statut : ${err.message}`)
    } finally {
      setReopenBusy(false)
      setReopenDialog(null)
      setReopenPercent('')
    }
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────
  if (loading) return <p className="fk-state">Chargement…</p>
  if (error)   return <p className="fk-state fk-state--error">Erreur : {error}</p>

  return (
    <div className="fk-page">
      <div className="fk-header">
        <h1 className="fk-title">Tickets</h1>
      </div>

      <div className="fk-board">
        {KANBAN_STATUS_IDS.map(sid => {
          const tickets = grouped[sid] ?? []
          const isOver  = dragOver === sid && dragging?.fromSid !== sid
          return (
            <div
              key={sid}
              className={`fk-col${isOver ? ' fk-col--over' : ''}`}
              style={{ background: colColor(sid) }}
              onDragOver={e => onDragOver(e, sid)}
              onDrop={e => onDrop(e, sid)}
            >
              <div className="fk-col-header">
                <span className="fk-col-title">{colTitle(sid)}</span>
                <span className="fk-count">{tickets.length}</span>
              </div>

              <div className="fk-cards">
                {tickets.map(t => (
                  <div
                    key={t.id}
                    className={`fk-card${dragging?.ticket.id === t.id ? ' fk-card--dragging' : ''}`}
                    draggable
                    onDragStart={e => onDragStart(e, t, sid)}
                    onDragEnd={onDragEnd}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <span className="fk-card-id">#{t.id}</span>
                    <span className="fk-card-name">{t.name}</span>
                  </div>
                ))}
              </div>

              {sid === 1 && (
                <button className="fk-add-btn" onClick={() => navigate('/front/tickets/new')}>
                  <span className="fk-add-btn-plus">+</span>
                  Ajouter 1 ticket
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Dialogue résolution ── */}
      {dialog && (
        <div className="fk-overlay" onClick={() => !moving && setDialog(null)}>
          <div className="fk-dialog" onClick={e => e.stopPropagation()}>
            <h2 className="fk-dialog-title">Marquer comme Terminé</h2>
            <p className="fk-dialog-sub">
              <strong>{dialog.ticket.name}</strong> va passer dans la colonne <strong>{colTitle(5)}</strong>.
            </p>
            <label className="fk-dialog-label">
              Description de la solution
              <span className="fk-dialog-opt"> (optionnel)</span>
            </label>
            <textarea
              className="fk-dialog-textarea"
              rows={4}
              placeholder="Décrivez comment le ticket a été résolu…"
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              autoFocus
              disabled={moving}
            />
            <label className="fk-dialog-label">
              Cout fixed
              <span className="fk-dialog-opt">(optionnel)</span>
            </label>
            <input
              type="number"
              className="fk-dialog-input"
              min="0"
              step="0.01"
              placeholder="0"
              value={fixedCost}
              onChange={e => setFixedCost(e.target.value)}
              disabled={moving}
            ></input>
            <div className="fk-dialog-actions">
              <button className="fk-dialog-btn fk-dialog-btn--cancel" onClick={() => setDialog(null)} disabled={moving}>
                Annuler
              </button>
              <button className="fk-dialog-btn fk-dialog-btn--confirm" onClick={confirmDialog} disabled={moving}>
                {moving ? 'Mise à jour…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reopenDialog && (
        <div className="fk-overlay" onClick={cancelReopenDialog}>
          <div className="fk-dialog" onClick={e => e.stopPropagation()}>
            <h2 className="fk-dialog-title">Reouverture du ticket</h2>
            <p className="fk-dialog-sub"><strong>{reopenDialog.ticket.name}</strong> va repasser dans la colonne <strong>{colTitle(2)}</strong></p>
            <p className="fk-dialog-sub">
              Dernier cout : <strong>{reopenDialog.totalSum.toFixed(2)} €</strong>
            </p>
            <label className="fk-dialog-label">
              Pourcentage de Reouverture
              <span className="fk-dialog-opt">(ex : 10) </span>
            </label>
            <input type="number" 
            className="fk-dialog-input"
            min="0"
            step="0.01"
            placeholder="0"
            value={reopenPercent}
            onChange={e => setReopenPercent(e.target.value)}
            disabled={reopenBusy}
            />
            {reopenPercent && (
              <p className="fk-dialog-sub">
                Cout de reouverture : <strong>{reopenPercent} %</strong>
              </p>
            )}
            <div className=" fk-dialog-actions">
              <button className="fk-dialog-btn fk-dialog-btn--cancel" onClick={cancelReopen} disabled={reopenBusy}>
                {reopenBusy ? '...' : 'Annulation'}
              </button>
              <button className="fk-dialog-btn fk-dialog-btn--confirm" onClick={confirmReopen} disabled={reopenBusy || !reopenPercent}>
                {reopenBusy ? '...' : 'Reouverture'}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ── Détail ticket (drawer latéral) ── */}
      {selectedId && (
        <KanbanTicketModal
          ticketId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
