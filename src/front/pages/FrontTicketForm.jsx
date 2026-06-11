import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  createTicket, updateTicket, getTicket,
  getTicketItems, addItemToTicket, removeItemFromTicket,
  TYPE_LABELS, KANBAN_STATUS_LABELS, URGENCY_LABELS,
} from '../../api/tickets'
import { ASSET_TYPES, ASSET_TYPE_KEYS } from '../../api/assets'
import useAssets from '../hooks/useAssets'
import { IcoBack } from '../icons'
import './FrontTicketForm.css'

const today   = () => new Date().toISOString().split('T')[0]
const nowTime = () => new Date().toTimeString().slice(0, 5)

const emptyForm = () => ({
  name: '', content: '',
  date: today(), time: nowTime(),
  type: '1', status: '1', urgency: '3',
})

// Extrait l'ID numérique d'un champ GLPI (int, string, ou objet {id, name})
const extractId = (val, fallback) => {
  if (val === null || val === undefined) return String(fallback)
  if (typeof val === 'object')           return String(val.id ?? fallback)
  return String(val)
}

// GLPI peut renvoyer "2026-06-04 16:26:09" ou "2026-06-04T16:26:09+02:00"
const parseGlpiDate = (glpiDate) => {
  if (!glpiDate) return null
  const normalized = glpiDate.replace('T', ' ').replace(/[+-]\d{2}:\d{2}$/, '').trim()
  const [datePart, timePart = ''] = normalized.split(' ')
  return { date: datePart, time: timePart.slice(0, 5) || nowTime() }
}

// GLPI stocke le contenu en HTML — on l'affiche en texte brut dans le textarea
const stripHtml = (html) => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

// ── Composant principal ────────────────────────────────────────────────────
function FrontTicketForm() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const isEdit    = Boolean(id)

  // Chargement des ordinateurs et moniteurs pour les selects d'éléments
  const { assetsByType } = useAssets()

  // État du formulaire principal
  const [form,             setForm]             = useState(emptyForm())
  // Lignes d'éléments associés : { assetType: 'computer'|'monitor'|'', assetId: '' }
  const [items,            setItems]            = useState([{ assetType: '', assetId: '' }])
  // En mode édition : IDs des Item_Ticket existants (pour les supprimer avant re-création)
  const [originalItemIds,  setOriginalItemIds]  = useState([])

  const [loading,          setLoading]          = useState(isEdit)
  const [loadError,        setLoadError]        = useState(null)
  const [submitting,       setSubmitting]       = useState(false)
  const [submitError,      setSubmitError]      = useState(null)
  const [success,          setSuccess]          = useState(null) // { id, name }

  // Chargement des données existantes en mode édition
  useEffect(() => {
    if (!isEdit) return
    // allSettled : si getTicketItems échoue, on affiche quand même le formulaire
    Promise.allSettled([getTicket(id), getTicketItems(id)])
      .then(([ticketRes, itemsRes]) => {
        if (ticketRes.status === 'rejected') {
          setLoadError(ticketRes.reason.message)
          return
        }
        const ticket = ticketRes.value
        // En édition : on affiche date_mod (modification), pas date (création)
        const modDate = parseGlpiDate(ticket.date_mod) ?? { date: today(), time: nowTime() }
        setForm({
          name:    ticket.name    || '',
          content: stripHtml(ticket.content),
          date:    modDate.date,
          time:    modDate.time,
          type:    extractId(ticket.type,    1),
          status:  extractId(ticket.status,  1),
          urgency: extractId(ticket.urgency, 3),
        })
        // Si l'API Item_Ticket est disponible, on pré-remplit les éléments
        const rows = itemsRes.status === 'fulfilled' && Array.isArray(itemsRes.value)
          ? itemsRes.value
          : []
        setOriginalItemIds(rows.map(i => i.id))
        setItems(rows.length
          ? rows.map(i => ({
              assetType: i.itemtype,
              assetId:   String(i.items_id),
            }))
          : [{ assetType: '', assetId: '' }]
        )
      })
      .finally(() => setLoading(false))
  }, [id])

  // ── Helpers formulaire principal ────────────────────────────────────────
  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  // ── Helpers lignes d'éléments ───────────────────────────────────────────
  const addItemRow = () =>
    setItems(prev => [...prev, { assetType: '', assetId: '' }])

  const removeItemRow = (idx) =>
    setItems(prev => prev.filter((_, i) => i !== idx))

  const updateItemRow = (idx, field, value) =>
    setItems(prev => prev.map((row, i) =>
      i !== idx ? row
        // Quand on change le type, on remet à zéro l'équipement choisi
        : { ...row, [field]: value, ...(field === 'assetType' ? { assetId: '' } : {}) }
    ))

  // ── Types d'équipements ayant au moins un actif disponible ─────────────
  const presentAssetTypes = ASSET_TYPE_KEYS.filter(t => (assetsByType[t]?.length ?? 0) > 0)

  // ── Options d'équipements selon le type sélectionné ────────────────────
  const assetOptions = (assetType) =>
    (assetsByType[assetType] ?? []).map(a => ({ value: String(a.id), label: a.name }))

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.name.trim()) return 'Le titre est obligatoire.'
    // En création uniquement : au moins un élément complet requis
    if (!isEdit && !items.some(i => i.assetType && i.assetId))
      return 'Ajoutez au moins un élément complet (type + équipement).'
    return null
  }

  // ── Soumission ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setSubmitError(err); return }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const payload = {
        name:    form.name.trim(),
        content: form.content.trim(),
        type:    Number(form.type),
        status:  Number(form.status),
        urgency: Number(form.urgency),
        // En création : date d'ouverture ; en édition : date de modification
        ...(isEdit
          ? { date_mod: `${form.date} ${form.time}:00` }
          : { date:     `${form.date} ${form.time}:00` }
        ),
      }

      let ticketId
      if (isEdit) {
        await updateTicket(id, payload)
        ticketId = Number(id)
      } else {
        const res = await createTicket(payload)
        ticketId = res.id
      }

      // Association des éléments — non bloquante (l'endpoint peut être indisponible)
      const validItems = items.filter(i => i.assetType && i.assetId)
      if (isEdit && originalItemIds.length > 0) {
        await Promise.allSettled(originalItemIds.map(iid => removeItemFromTicket(ticketId, iid)))
      }
      if (validItems.length > 0) {
        await Promise.allSettled(
          validItems.map(i =>
            addItemToTicket(ticketId, i.assetType, Number(i.assetId))
          )
        )
      }

      setSuccess({ id: ticketId, name: form.name })
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── États de chargement ─────────────────────────────────────────────────
  if (loading)   return <p className="ftf-state">Chargement…</p>
  if (loadError) return <p className="ftf-state ftf-state--error">Erreur : {loadError}</p>

  // ── Écran de confirmation après succès ──────────────────────────────────
  if (success) {
    return (
      <div className="ftf-success">
        <div className="ftf-success-icon">✓</div>
        <h2>Ticket #{success.id} {isEdit ? 'mis à jour' : 'créé'}</h2>
        <p className="ftf-success-name">{success.name}</p>
        <div className="ftf-success-actions">
          <button className="ftf-btn-secondary" onClick={() => navigate('/front/tickets')}>
            Voir les tickets
          </button>
          {!isEdit && (
            <button
              className="ftf-btn-primary"
              onClick={() => { setForm(emptyForm()); setItems([{ assetType: '', assetId: '' }]); setSuccess(null) }}
            >
              Créer un autre ticket
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Formulaire ──────────────────────────────────────────────────────────
  return (
    <div className="ftf-wrap">
      {/* En-tête de page */}
      <div className="ftf-header">
        <button className="ftf-back" onClick={() => navigate('/front/tickets')}>
          <IcoBack /> Retour aux tickets
        </button>
        <h1 className="ftf-title">
          {isEdit ? `Modifier le ticket #${id}` : 'Créer un ticket'}
        </h1>
      </div>

      <form className="ftf-form" onSubmit={handleSubmit}>

        {/* ── Section 1 : Informations générales ── */}
        <section className="ftf-section">
          <h2 className="ftf-section-title">Informations générales</h2>
          <div className="ftf-row">
            {/* Titre — prend tout l'espace disponible */}
            <div className="ftf-field ftf-field--grow">
              <label className="ftf-label">Titre <span className="ftf-required">*</span></label>
              <input
                type="text"
                className="ftf-input"
                placeholder="Titre du ticket…"
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
              />
            </div>
            <div className="ftf-field">
              <label className="ftf-label">Type</label>
              <select className="ftf-input ftf-select" value={form.type} onChange={e => updateField('type', e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="ftf-field">
              <label className="ftf-label">Statut</label>
              <select className="ftf-input ftf-select" value={form.status} onChange={e => updateField('status', e.target.value)}>
                {Object.entries(KANBAN_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* ── Section 2 : Description ── */}
        <section className="ftf-section">
          <h2 className="ftf-section-title">Description</h2>
          <textarea
            className="ftf-textarea"
            rows={5}
            placeholder="Décrivez le problème ou la demande…"
            value={form.content}
            onChange={e => updateField('content', e.target.value)}
          />
        </section>

        {/* ── Section 3 : Paramètres ── */}
        <section className="ftf-section">
          <h2 className="ftf-section-title">Paramètres</h2>
          <div className="ftf-row">
            <div className="ftf-field">
              <label className="ftf-label">
                {isEdit ? 'Date de modification' : "Date d'ouverture"}
              </label>
              <input
                type="date"
                className="ftf-input"
                value={form.date}
                onChange={e => updateField('date', e.target.value)}
              />
            </div>
            <div className="ftf-field">
              <label className="ftf-label">Heure</label>
              <input
                type="time"
                className="ftf-input"
                value={form.time}
                onChange={e => updateField('time', e.target.value)}
              />
            </div>
            <div className="ftf-field">
              <label className="ftf-label">Urgence</label>
              <select className="ftf-input ftf-select" value={form.urgency} onChange={e => updateField('urgency', e.target.value)}>
                {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* ── Section 4 : Éléments associés ── */}
        <section className="ftf-section">
          <h2 className="ftf-section-title">
            Éléments associés <span className="ftf-required">*</span>
          </h2>

          <div className="ftf-items">
            {items.map((row, idx) => (
              <div key={idx} className="ftf-item-row">
                {/* Choix du type d'équipement */}
                <select
                  className="ftf-input ftf-select"
                  value={row.assetType}
                  onChange={e => updateItemRow(idx, 'assetType', e.target.value)}
                >
                  <option value="">— Type d'équipement —</option>
                  {presentAssetTypes.map(t => (
                    <option key={t} value={t}>{ASSET_TYPES[t].label}</option>
                  ))}
                </select>

                {/* Choix de l'équipement (activé seulement si un type est choisi) */}
                <select
                  className="ftf-input ftf-select"
                  value={row.assetId}
                  onChange={e => updateItemRow(idx, 'assetId', e.target.value)}
                  disabled={!row.assetType}
                >
                  <option value="">— Choisir un équipement —</option>
                  {assetOptions(row.assetType).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {/* Supprimer cette ligne (seulement si plusieurs lignes) */}
                {items.length > 1 && (
                  <button
                    type="button"
                    className="ftf-item-remove"
                    onClick={() => removeItemRow(idx)}
                    title="Supprimer cet élément"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="button" className="ftf-item-add" onClick={addItemRow}>
            + Ajouter un élément
          </button>
        </section>

        {/* ── Erreur de soumission ── */}
        {submitError && <p className="ftf-error">{submitError}</p>}

        {/* ── Pied du formulaire ── */}
        <div className="ftf-footer">
          <button
            type="button"
            className="ftf-btn-secondary"
            onClick={() => navigate('/front/tickets')}
          >
            Annuler
          </button>
          <button type="submit" className="ftf-btn-primary" disabled={submitting}>
            {submitting
              ? 'En cours…'
              : isEdit ? 'Enregistrer les modifications' : 'Créer le ticket'
            }
          </button>
        </div>

      </form>
    </div>
  )
}

export default FrontTicketForm
