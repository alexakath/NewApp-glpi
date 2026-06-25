import { useEffect, useState } from "react";
import { fetchAllCosts, updateReopenCost, updateFixedCost, fetchCancelledCosts, restoreCost, getReopenCap, setReopenCap } from "../api/ticketCostActions";

const fmtMoney = (n) => (n || 0).toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})

const MODE_LABELS = {1: 'Dernier cout', 2: 'Premier cout', 3: 'Moyenne', 4: 'Total'}

function CostManagementPage() {
    const [costs, setCosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState(null)
    const [editPct, setEditPct] = useState('')
    const [editMode, setEditMode] = useState(1)
    const [editAmount, setEditAmount] = useState('')
    const [saving, setSaving] = useState(false)

    const [cancelled, setCancelled] = useState([])
    const [capPct, setCapPct] = useState('')
    const [savingCap, setSavingCap] = useState(false)

    const load = async () => {
        setLoading(true)
        const [all, canc, cap] = await Promise.all([
            fetchAllCosts().catch(() => []),
            fetchCancelledCosts().catch(() => []),
            getReopenCap().catch(() => '')
        ])
        setCosts(Array.isArray(all) ? all: [])
        setCancelled(Array.isArray(canc) ? canc : [])
        setCapPct(cap || '')
        setLoading(false)

    }

    useEffect(() => { load() }, [])

    const reopens = costs.filter(c => c.type === 'reopen')
    const fixeds = costs.filter(c => (c.type || 'fixed') === 'fixed')

    const startEditReopen = (row) => {
        setEditId(row.id)
        setEditPct(row.pct ?? '')
        setEditMode(row.mode ?? 1)
    }

    const startEditFixed  = (row) => {
        setEditId(row.id)
        setEditAmount (row.fixed_cost ?? '')
    }

    const cancelEdit = () => {
        setEditId(null)
        setEditPct('')
        setEditMode(1)
        setEditAmount('')
    }

    const saveReopen = async (row) => {
        setSaving(true)
        await updateReopenCost(row.id, row.ticket_id, editPct || row.pct, editMode || row.mode)
        cancelEdit()
        await load()
        setSaving(false)
    } 

    const saveFixed = async (row) => {
        setSaving(true)
        await updateFixedCost(row.id,row.ticket_id, parseFloat(editAmount))
        cancelEdit()
        await load ()
        setSaving(false)
    }

    const handleRestore = async (row) => {
        setSaving(true)
        await restoreCost(row.id).catch(() => {})
        await load()
        setSaving(false)
    }

    const handleSaveCap = async () => {
        setSavingCap(true)
        await setReopenCap(capPct).catch(() => {})
        setSavingCap(false)
    }

    if(loading) return <div>Chargement...</div>

    return (
        <div style={{padding: '1.5rem'}}>
            <h1>Gestion des couts</h1>
            <div style={ {marginBottom: '1rem'}}>
                <label>Plafond reouverture (%)</label>
                <input type="number" value={capPct} onChange={e => setCapPct(e.target.value)} style={{width: 80}} />
                <button onClick={handleSaveCap} disabled={saving} style={{marginLeft: 8}}>
                    {savingCap ? '...' : 'Sauvegarder'}
                </button>
            </div>
            <h2>Reouvertures ({reopens.length})</h2>
            <table border="1" cellPadding="6">
                <thead>
                    <tr>
                        <th>Ticket</th>
                        <th>Cout calcule</th>
                        <th>Pourcentage</th>
                        <th>Mode</th>
                        <th>Dates</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {reopens.map(row => (
                        <tr key={row.id}>
                            <td>{row.ticket_id}</td>
                            <td>{fmtMoney(row.fixed_cost)}</td>
                            <td>
                                {editId === row.id
                                    ? <input type="number" value={editPct} onChange={e => setEditPct(e.target.value)} style={{width: 60}}/> 
                                    : `${row.pct ?? '-'} %`   
                                }
                            </td>
                            <td>
                                {editId === row.id
                                    ? <select value={editMode} onChange={e => setEditMode(Number(e.target.value))}>
                                        {Object.entries(MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                    : MODE_LABELS[row.mode] ?? '-'
                                }
                            </td>
                            <td>{row.created_at}</td>
                            <td>
                                {editId === row.id 
                                    ? <>
                                        <button onClick={() => saveReopen(row)} disabled={saving}>Valider</button>
                                        <button onClick={cancelEdit}>Annuler</button>                                   
                                      </>
                                    : <button onClick={() => startEditReopen(row)}>Modifier</button>
                                }
                            </td>
                        </tr>
                    ))}
                    {reopens.length === 0 && <tr><td colSpan="6">Aucune reouverture</td></tr>}
                </tbody>
            </table>

            <h2>Cout saisie ({fixeds.length})</h2>
            <table border="1" cellPadding="6">
                <thead>
                    <tr>
                        <th>Ticket</th>
                        <th>Montant</th>
                        <th>Dates</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {fixeds.map(row => (
                        <tr key={row.id}>
                            <td>{row.ticket_id}</td>
                            <td>
                                {editId === row.id
                                    ? <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{width: 80}} />
                                    : `${fmtMoney(row.fixed_cost)}`
                                }
                            </td>
                            <td>{row.created_at}</td>
                            <td>
                                {editId === row.id
                                    ? <>
                                        <button onClick={() => saveFixed(row)} disabled={saving}>Valider</button>
                                        <button onClick={cancelEdit}>Annuler</button>
                                      </>
                                    : <button onClick={() => startEditFixed(row)}>Modifier</button>
                                }
                            </td>
                        </tr>
                    ))}
                    {fixeds.length === 0 && <tr><td colSpan="4">Aucun cout</td></tr>}
                </tbody>
            </table>
            <h2>Annulations ({cancelled.length})</h2>
            <table border="1" cellPadding="6">
                <thead>
                    <tr>
                        <th>Ticket</th>
                        <th>Montant</th>
                        <th>Date annulation</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {cancelled.map(row => (
                        <tr key={row.id}>
                            <td>{row.ticket_id}</td>
                            <td>{fmtMoney(row.fixed_cost)}</td>
                            <td>{row.cancelled_at}</td>
                            <td><button onClick={() => handleRestore(row)} disabled={saving}>Restaurer</button></td>
                        </tr>
                    ))}
                    {cancelled.length === 0 && <tr><td colSpan="4">Aucune annulation</td></tr>}
                </tbody>
            </table>
        </div>
    )
}

export default CostManagementPage