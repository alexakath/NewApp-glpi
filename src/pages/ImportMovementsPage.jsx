import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { updateTicket, KANBAN_COLUMNS } from '../api/tickets'
import { getTicketsFromSQLite, addTicketCostToSQLite } from '../api/backend'
import { applyReopenCost, cancelLastFixedCost } from '../api/ticketCostActions'
import './ImportMovementsPage.css'

// ── 1. LA FONCTION MÉTIER — source de vérité ─────────────────────────────────
// Appelée à l'identique depuis la saisie manuelle ET l'import CSV.
// Elle ne sait pas d'où viennent refStr, mvt, valStr — elle fait juste son travail.
const processOneMovement = async (refStr, mvt, valStr, ticketsByRef, ticketsById) => {
  const ticket = ticketsByRef[refStr] ?? ticketsById[parseInt(refStr)]
  const label  = `"${refStr}" — ${mvt}`
  if (!ticket) return { row: label, status: 'error', msg: `Ticket "${refStr}" introuvable` }

  try {
    if (mvt === 'close') {
      const cost = parseFloat(valStr) || 0
      await updateTicket(ticket.id, { status: KANBAN_COLUMNS[5].dropStatus })
      if (cost > 0) await addTicketCostToSQLite(ticket.id, cost, 'fixed')
      return { row: label, status: 'ok', msg: `Terminé${cost > 0 ? ` — coût ${cost}` : ''}` }

    } else if (mvt === 'open' || mvt === 'reopen') {
      const pct = parseFloat(valStr) || 0
      await updateTicket(ticket.id, { status: KANBAN_COLUMNS[2].dropStatus })
      const { base, cost: reopenCost } = await applyReopenCost(ticket.id, pct)
      return { row: label, status: 'ok', msg: `Réouvert — ${pct}% de ${base.toFixed(2)} = ${reopenCost.toFixed(2)}` }

    } else if (mvt === 'cancel') {
      await updateTicket(ticket.id, { status: KANBAN_COLUMNS[2].dropStatus })
      await cancelLastFixedCost(ticket.id)
      return { row: label, status: 'ok', msg: 'Annulé — dernier coût fixe supprimé' }

    } else {
      return { row: label, status: 'warn', msg: `Mouvement inconnu : "${mvt}"` }
    }
  } catch (err) {
    return { row: label, status: 'error', msg: err.message }
  }
}

// Charge les tickets SQLite et construit les deux maps de résolution.
const loadTicketMaps = async () => {
  const tix = await getTicketsFromSQLite()
  const ticketsById  = {}
  const ticketsByRef = {}
  tix.forEach(t => {
    ticketsById[t.id] = t
    if (t.ref_user) ticketsByRef[t.ref_user] = t
  })
  return { ticketsById, ticketsByRef }
}

function ImportMovementsPage() {
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const fileRef = useRef(null)

  // Champs de la saisie manuelle
  const [ref,       setRef]       = useState('')
  const [mouvement, setMouvement] = useState('')
  const [valeur,    setValeur]    = useState('')

  // ── 2. APPEL DEPUIS L'INTERFACE (saisie manuelle) ────────────────────────
  const handleManuel = async () => {
    setRunning(true)
    try {
      const maps   = await loadTicketMaps()
      const result = await processOneMovement(
        ref.trim(), mouvement, valeur.trim(),
        maps.ticketsByRef, maps.ticketsById,
      )
      setResults(prev => [...prev, result])
    } catch {
      setResults(prev => [...prev, { row: '—', status: 'error', msg: 'Impossible de charger les tickets' }])
    }
    setRunning(false)
  }

  // ── 3. APPEL DEPUIS L'IMPORTATION (fichier) ──────────────────────────────
  // On récupère refStr, mvt, valStr depuis le CSV, puis on appelle
  // EXACTEMENT la même fonction que pour la saisie manuelle.
  const processMovements = async (rows) => {
    setRunning(true)
    setResults([])
    let maps
    try {
      maps = await loadTicketMaps()
    } catch {
      setResults([{ row: '—', status: 'error', msg: 'Impossible de charger les tickets' }])
      setRunning(false)
      return
    }
    const out = []
    for (const row of rows) {
      const [refStr, mvt, valStr] = row.map(s => (s ?? '').toString().trim())
      const result = await processOneMovement(refStr, mvt, valStr, maps.ticketsByRef, maps.ticketsById)
      out.push(result)
      setResults([...out])
    }
    setRunning(false)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (result) => processMovements(result.data.slice(1)),
    })
    e.target.value = ''
  }

  const needsValue = mouvement === 'open' || mouvement === 'close'
  const canSubmit  = !running && ref.trim() && mouvement && (!needsValue || valeur.trim())

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="page-breadcrumb">Données</p>
          <h1>Import mouvements Kanban</h1>
        </div>
      </div>

      {/* ── Saisie manuelle ── */}
      <div className="imv-card">
        <h2 className="imv-section-title">Saisie manuelle</h2>
        <div className="imv-manual-row">
          <input
            className="imv-input"
            placeholder="Réf. ticket"
            value={ref}
            onChange={e => setRef(e.target.value)}
            disabled={running}
          />
          <select
            className="imv-select"
            value={mouvement}
            onChange={e => { setMouvement(e.target.value); setValeur('') }}
            disabled={running}
          >
            <option value="">— mouvement —</option>
            <option value="open">open / reopen</option>
            <option value="close">close</option>
            <option value="cancel">cancel</option>
          </select>
          <input
            className="imv-input imv-input--valeur"
            type="number"
            placeholder={
              mouvement === 'close' ? 'Montant (€)' :
              mouvement === 'open'  ? 'Pourcentage (%)' : 'Valeur'
            }
            value={valeur}
            onChange={e => setValeur(e.target.value)}
            disabled={running || mouvement === 'cancel' || !mouvement}
            min="0"
            step="0.01"
          />
          <button
            className="imv-traiter-btn"
            onClick={handleManuel}
            disabled={!canSubmit}
          >
            Traiter
          </button>
        </div>
      </div>

      {/* ── Importation CSV ── */}
      <div className="imv-card" style={{ marginTop: '1rem' }}>
        <h2 className="imv-section-title">Importation CSV</h2>
        <p className="imv-desc">
          Format : <code>ref_ticket,mouvement,valeur</code><br />
          <code>open</code> / <code>reopen</code> + % &nbsp;·&nbsp;
          <code>close</code> + montant &nbsp;·&nbsp;
          <code>cancel</code>
        </p>
        <label className={`imv-upload-btn${running ? ' is-disabled' : ''}`}>
          {running ? 'Traitement en cours…' : 'Choisir un fichier CSV'}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleFile}
            disabled={running}
          />
        </label>
      </div>

      {/* ── Résultats (communs aux deux modes) ── */}
      {results.length > 0 && (
        <div className="table-card" style={{ marginTop: '1.5rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mouvement</th>
                <th>Statut</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className={`table-row imv-row--${r.status}`}>
                  <td>{r.row}</td>
                  <td className="imv-status-cell">
                    <span className={`imv-badge imv-badge--${r.status}`}>
                      {r.status === 'ok' ? '✓' : r.status === 'warn' ? '⚠' : '✕'}
                    </span>
                  </td>
                  <td>{r.msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ImportMovementsPage
