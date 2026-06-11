import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getTickets, updateTicket,
  KANBAN_STATUS_IDS, KANBAN_STATUS_LABELS, KANBAN_COLUMNS, statusToColumn,
} from '../../api/tickets'
import { getKanbanColumns, getKanbanLang } from '../../api/backend'
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
  const [moving,     setMoving]     = useState(false)

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
    } else {
      doMove(ticket, fromSid, toSid)
    }
  }

  const doMove = async (ticket, fromSid, toSid) => {
    setMoving(true)
    const newStatus = KANBAN_COLUMNS[toSid].dropStatus
    try {
      await updateTicket(ticket.id, { status: newStatus })
      setGrouped(prev => {
        const next = Object.fromEntries(KANBAN_STATUS_IDS.map(cid => [cid, [...prev[cid]]]))
        KANBAN_STATUS_IDS.forEach(s => { next[s] = next[s].filter(t => t.id !== ticket.id) })
        next[toSid] = [...next[toSid], { ...ticket, status: newStatus }]
        return next
      })
    } catch (err) {
      alert(`Erreur lors du changement de statut : ${err.message}`)
    } finally {
      setMoving(false)
      setDialog(null)
      setResolution('')
    }
  }

  const confirmDialog = () => dialog && doMove(dialog.ticket, dialog.fromSid, dialog.toSid)

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
