import { Fragment, useEffect, useMemo, useState } from 'react'
import { getTickets, getTicketItems } from '../api/tickets'
import { getTicketCosts } from '../api/costs'
import { getAssetFull, ASSET_TYPES } from '../api/assets'
import { getFromSQLite } from '../api/backend'
import './TicketCostsPage.css'

// v2 retourne "duration" (secondes), pas "actiontime"
const totalCost = (cost) =>
  ((cost.duration || 0) / 3600) * (cost.cost_time || 0)
  + (cost.cost_fixed || 0)
  + (cost.cost_material || 0)

// Affichage monétaire au format français : 260.45 → "260,45"
const fmtMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// liens Item_Ticket → clé unique "Itemtype:id"
const itemKey = (link) => {
  const rawId = typeof link.items_id === 'object' ? link.items_id?.id : link.items_id
  return { rawId, key: `${link.itemtype}:${rawId}` }
}

function TicketCostsPage() {
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // ticketId → [{ key, itemtype, id, name }]
  const [ticketItems, setTicketItems] = useState({})
  // ticketId → somme des coûts GLPI (import)
  const [importCosts, setImportCosts] = useState({})
  // ticketId → somme des coûts fixes saisis dans le kanban (SQLite)
  const [fixedCosts, setFixedCosts]   = useState({})
  const [reopenCosts, setReopenCosts] = useState({})
  // clés des lignes "élément" actuellement dépliées (détail par ticket)
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
        const reopenMap = {}

        ;(Array.isArray(sqliteCosts) ? sqliteCosts : []).forEach((row) => {
          const map = row.type === 'reopen' ? reopenMap : fixedMap
          map[row.ticket_id] = (map[row.ticket_id] || 0) + (row.fixed_cost || 0)
        })
        setFixedCosts(fixedMap)
        setReopenCosts(reopenMap)

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

  // Coût par élément — le coût saisi (fixe, SQLite) et le coût import (GLPI) de
  // chaque ticket sont divisés à parts égales entre ses éléments associés, puis
  // cumulés par élément. `details` garde la trace de la contribution de chaque
  // ticket pour pouvoir afficher le détail du calcul (déplié dans le tableau).
  const elementCosts = useMemo(() => {
    const map = new Map()
    tickets.forEach((t) => {
      const items = ticketItems[t.id] || []
      if (items.length === 0) return
      const ticketImport = importCosts[t.id] || 0
      const ticketFixed  = fixedCosts[t.id] || 0
      const ticketReopen  = reopenCosts[t.id] || 0
      const importShare  = ticketImport / items.length
      const fixedShare   = ticketFixed / items.length
      const reopenShare   = ticketReopen / items.length
      items.forEach((item) => {
        const entry = map.get(item.key) ?? { ...item, fixedTotal: 0, importTotal: 0, reopenTotal: 0, ticketCount: 0, details: [] }
        entry.fixedTotal  += fixedShare
        entry.importTotal += importShare
        entry.reopenTotal += reopenShare
        entry.ticketCount += 1
        entry.details.push({
          ticketId:   t.id,
          ticketName: t.name,
          ticketImport,
          ticketFixed,
          ticketReopen,
          itemCount:  items.length,
          importShare,
          fixedShare,
          reopenShare,
        })
        map.set(item.key, entry)
      })
    })
    return [...map.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [tickets, ticketItems, importCosts, fixedCosts, reopenCosts])

  if (loading) return <div className="page-state">Chargement des tickets...</div>
  if (error)   return <div className="page-state page-state--error">Erreur : {error}</div>

  const totalFixedAll  = elementCosts.reduce((sum, e) => sum + e.fixedTotal, 0)
  const totalImportAll = elementCosts.reduce((sum, e) => sum + e.importTotal, 0)
  const totalReopenAll = elementCosts.reduce((sum, e) => sum + e.reopenTotal, 0)
  const grandTotalAll  = totalFixedAll + totalImportAll + totalReopenAll

  const toggleElement = (key) => setExpandedElements((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <p className="page-breadcrumb">Assistance</p>
          <h1>Coûts des tickets</h1>
        </div>
        <span className="page-count">{elementCosts.length} élément{elementCosts.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="table-card">
        <table className="data-table cost-element-table">
          <thead>
            <tr>
              <th className="cost-expand-col"></th>
              <th>Élément</th>
              <th>Coût saisi</th>
              <th>Coût import</th>
              <th>Frais de reouverture</th>
              <th>Total</th>
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
                    <td className="title-cell">
                      <span className="row-title">{ASSET_TYPES[el.itemtype]?.label ?? el.itemtype} — {el.name}</span>
                    </td>
                    <td className="cost-cell">{fmtMoney(el.fixedTotal)} €</td>
                    <td className="cost-cell">{fmtMoney(el.importTotal)} €</td>
                    <td className="cost-cell">{fmtMoney(el.reopenTotal)} €</td>
                    <td className="cost-cell cost-cell--total">{fmtMoney(el.fixedTotal + el.importTotal + el.reopenTotal)} €</td>
                  </tr>
                  {isOpen && (
                    <tr className="cost-detail-row">
                      <td colSpan="6">
                        <table className="cost-detail-table">
                          <thead>
                            <tr>
                              <th>Ticket</th>
                              <th>Coût saisi du ticket</th>
                              <th>Coût import du ticket</th>
                              <th>Frais de reouverture du ticket</th>
                              <th>Répartition</th>
                              <th>Part saisi attribuée</th>
                              <th>Part import attribuée</th>
                              <th>Part reouverture attribuée</th>
                            </tr>
                          </thead>
                          <tbody>
                            {el.details.map((d) => (
                              <tr key={d.ticketId}>
                                <td>#{d.ticketId} — {d.ticketName}</td>
                                <td className="cost-cell">{fmtMoney(d.ticketFixed)} €</td>
                                <td className="cost-cell">{fmtMoney(d.ticketImport)} €</td>
                                <td className="cost-cell">{fmtMoney(d.ticketReopen)} €</td>
                                <td className="muted">
                                  {d.itemCount > 1 ? `÷ ${d.itemCount} éléments` : 'Entièrement attribué'}
                                </td>
                                <td className="cost-cell">{fmtMoney(d.fixedShare)} €</td>
                                <td className="cost-cell">{fmtMoney(d.importShare)} €</td>
                                <td className="cost-cell">{fmtMoney(d.reopenShare)} €</td>
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
                <td colSpan="2" className="cost-footer-label">Total</td>
                <td className="cost-cell cost-cell--footer">{fmtMoney(totalFixedAll)} €</td>
                <td className="cost-cell cost-cell--footer">{fmtMoney(totalImportAll)} €</td>
                <td className="cost-cell cost-cell--footer">{fmtMoney(totalReopenAll)} €</td>
                <td className="cost-cell cost-cell--footer cost-cell--total">{fmtMoney(grandTotalAll)} €</td>
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
