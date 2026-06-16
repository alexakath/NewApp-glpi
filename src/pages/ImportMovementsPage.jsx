import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { updateTicket, KANBAN_COLUMNS } from '../api/tickets'
import { getTicketsFromSQLite, getTicketCostsForTicket, addTicketCostToSQLite, deleteTicketCostFromSQLite } from '../api/backend'
import './ImportMovementsPage.css'

function ImportMovementsPage() {
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const fileRef = useRef(null)

  const processMovements = async (rows) => {
    setRunning(true)
    setResults([])
    let ticketsById = {}
    let ticketsByRef = {}
    try {
      const tix = await getTicketsFromSQLite()
      tix.forEach(t => {
        ticketsById[t.id] = t
        if (t.ref_user) ticketsByRef[t.ref_user] = t
      })
    } catch {
      setResults([{ row: '—', status: 'error', msg: 'Impossible de charger les tickets' }])
      setRunning(false)
      return
    }

    const out = []
    for (const row of rows) {
      const [refStr, mvt, valStr] = row.map(s => (s ?? '').toString().trim())
      const ticket   = ticketsByRef[refStr] ?? ticketsById[parseInt(refStr)]
      const label    = `"${refStr}" — ${mvt}`

      if (!ticket) {
        out.push({ row: label, status: 'error', msg: `Ticket "${refStr}" introuvable` })
        setResults([...out])
        continue
      }

      try {
        if (mvt === 'close') {
          const cost = parseFloat(valStr) || 0
          await updateTicket(ticket.id, { status: KANBAN_COLUMNS[5].dropStatus })
          if (cost > 0) await addTicketCostToSQLite(ticket.id, cost, 'fixed')
          out.push({ row: label, status: 'ok', msg: `Terminé${cost > 0 ? ` — coût ${cost}` : ''}` })

        } else if (mvt === 'open' || mvt === 'reopen') {
          const pct      = parseFloat(valStr) || 0
          const costRows = await getTicketCostsForTicket(ticket.id).catch(() => [])
          const list     = Array.isArray(costRows) ? costRows : []
          const fixedOnly = list.filter(r => (r.type || 'fixed') === 'fixed')
          const lastFixed = fixedOnly[0]
          const lastFixedCost = lastFixed?.fixed_cost ?? 0
          const reopenCost = lastFixedCost * (pct / 100)
          await updateTicket(ticket.id, { status: KANBAN_COLUMNS[2].dropStatus })
          if (reopenCost > 0) await addTicketCostToSQLite(ticket.id, reopenCost, 'reopen')
          out.push({ row: label, status: 'ok', msg: `Réouvert — ${pct}% de ${lastFixedCost.toFixed(2)} = ${reopenCost.toFixed(2)}` })

        } else if (mvt === 'cancel') {
          const costRows  = await getTicketCostsForTicket(ticket.id).catch(() => [])
          const list      = Array.isArray(costRows) ? costRows : []
          const fixedOnly = list.filter(r => (r.type || 'fixed') === 'fixed')
          const lastFixed = fixedOnly[0]
          await updateTicket(ticket.id, { status: KANBAN_COLUMNS[2].dropStatus })
          if (lastFixed) await deleteTicketCostFromSQLite(lastFixed.id).catch(() => {})
          out.push({ row: label, status: 'ok', msg: 'Annulé — dernier coût fixe supprimé' })

        } else {
          out.push({ row: label, status: 'warn', msg: `Mouvement inconnu : "${mvt}"` })
        }
      } catch (err) {
        out.push({ row: label, status: 'error', msg: err.message })
      }
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

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="page-breadcrumb">Données</p>
          <h1>Import mouvements Kanban</h1>
        </div>
      </div>

      <div className="imv-card">
        <p className="imv-desc">
          Importe un fichier <code>.csv</code> représentant les mouvements kanban.<br />
          Format : <code>ref_ticket,mouvement,valeur</code><br />
          <code>open</code> / <code>reopen</code> + % → réouverture &nbsp;·&nbsp;
          <code>close</code> + montant → terminé avec coût &nbsp;·&nbsp;
          <code>cancel</code> → annulation
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

      {results.length > 0 && (
        <div className="table-card" style={{ marginTop: '1.5rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ligne</th>
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
