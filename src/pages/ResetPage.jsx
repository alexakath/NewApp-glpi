import { useState, useEffect, useMemo } from 'react'
import ResetModuleItem from '../components/ResetModuleItem'
import { getResetStats, trashAllSelected, purgeAllSelected } from '../api/reset/resetService'
import { RESET_MODULES, getResetOrder } from '../api/reset/resetConfig'
import { clearTicketCostsFromSQLite } from '../api/backend'
import './ResetPage.css'

// Page de réinitialisation — pendant "miroir" de ImportPage : au lieu de créer
// des données depuis un CSV, on supprime celles que l'app a créées.
//
// Déroulé en DEUX ÉTAPES, calqué sur la corbeille native de GLPI :
//   1. "select"       → sélection des modules, mise à la corbeille (réversible)
//   2. "review-purge" → relecture de ce qui va être supprimé, purge définitive
//   3. "done"         → résultat final
//
// Les listes déroulantes (statuts, localisations, fabricants, modèles) n'ont
// pas de corbeille côté GLPI : elles passent directement de "actif" à "purgé"
// — voir `trashable` dans resetConfig.js.
const ResetPage = () => {
  const order = getResetOrder()

  const [step,            setStep]            = useState('select') // 'select' | 'review-purge' | 'done'
  const [stats,           setStats]           = useState({})
  const [loadingStats,    setLoadingStats]    = useState(true)
  const [selected,        setSelected]        = useState({})
  const [statusPerModule, setStatusPerModule] = useState({})
  const [isProcessing,    setIsProcessing]    = useState(false)
  const [pendingAction,   setPendingAction]   = useState(null) // null | 'trash' | 'purge'
  const [confirmText,     setConfirmText]     = useState('')
  const [trashSummary,    setTrashSummary]    = useState(null)
  const [purgeResult,     setPurgeResult]     = useState(null)
  // Avancement en temps réel de l'opération en cours — alimenté par le
  // callback onProgress des fonctions de service, module par module.
  const [progress,        setProgress]        = useState({ done: 0, total: 0, label: '' })

  const loadStats = async (initSelection = false) => {
    setLoadingStats(true)
    try {
      const data = await getResetStats()
      setStats(data)
      if (initSelection) {
        const initial = {}
        order.forEach((key) => { initial[key] = true })
        setSelected(initial)
      }
    } catch (err) {
      console.error('Erreur chargement stats reset :', err)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => { loadStats(true) }, [])

  const toggleModule = (key) => {
    if (isProcessing) return
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Le nombre affiché dépend de l'étape : éléments actifs à mettre à la
  // corbeille (étape 1), ou éléments à purger définitivement (étape 2 — la
  // corbeille pour les types qui en ont une, sinon ce qui reste d'actif)
  const countFor = (key) => {
    const s = stats[key]
    if (!s) return 0
    if (step === 'review-purge') return s.trashable ? s.trashed : s.active
    return s.active
  }

  const targetModules = useMemo(
    () => order.filter((key) => selected[key] && countFor(key) > 0),
    [order, selected, stats, step]
  )
  const totalTarget = targetModules.reduce((sum, key) => sum + countFor(key), 0)

  const openConfirm = (action) => { setConfirmText(''); setPendingAction(action) }
  const closeConfirm = () => setPendingAction(null)

  const buildSelectedMap = () => {
    const map = {}
    order.forEach((key) => { map[key] = !!selected[key] })
    return map
  }

  // Pousse l'avancement courant vers la barre de progression et fait
  // transitionner la ligne du module concerné de "loading" vers son état final
  // — au fil de l'eau plutôt qu'en bloc à la toute fin, pour un retour visuel
  // qui colle au rythme réel des appels API (un module = un palier).
  const handleProgress = ({ done, total, module, label, status }) => {
    setProgress({ done, total, label })
    setStatusPerModule((prev) => ({ ...prev, [module]: status === 'skipped' ? null : status }))
  }

  // ── Étape 1 : mise à la corbeille ──────────────────────────────────────────
  const handleTrash = async () => {
    setPendingAction(null)
    setIsProcessing(true)
    setProgress({ done: 0, total: targetModules.length, label: '' })
    setStatusPerModule(() => {
      const initial = {}
      targetModules.forEach((key) => { initial[key] = 'loading' })
      return initial
    })

    try {
      const result = await trashAllSelected(buildSelectedMap(), handleProgress)
      setTrashSummary(result)
      await loadStats(false)
      setStep('review-purge')
    } catch (err) {
      console.error(err)
      alert("Une erreur grave est survenue pendant la mise à la corbeille.")
    } finally {
      setIsProcessing(false)
      setProgress({ done: 0, total: 0, label: '' })
    }
  }

  // ── Étape 2 : purge définitive ─────────────────────────────────────────────
  const handlePurge = async () => {
    setPendingAction(null)
    setIsProcessing(true)
    setProgress({ done: 0, total: targetModules.length, label: '' })
    setStatusPerModule(() => {
      const initial = {}
      targetModules.forEach((key) => { initial[key] = 'loading' })
      return initial
    })

    try {
      const result = await purgeAllSelected(buildSelectedMap(), handleProgress)
      // Les coûts fixes (table locale `ticket_costs`) ne sont pas gérés par
      // GLPI : la purge en cascade des tickets ne les efface pas. On les
      // supprime nous-mêmes dès que le module tickets est purgé.
      if (selected.tickets) {
        await clearTicketCostsFromSQLite().catch((err) => console.warn('Purge ticket_costs ignorée', err))
      }
      setPurgeResult(result)
      await loadStats(false)
      setStep('done')
    } catch (err) {
      console.error(err)
      alert('Une erreur grave est survenue pendant la suppression définitive.')
    } finally {
      setIsProcessing(false)
      setProgress({ done: 0, total: 0, label: '' })
    }
  }

  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  const confirmPurgeEnabled = confirmText.trim().toUpperCase() === 'SUPPRIMER'

  if (loadingStats && step === 'select') {
    return <div className="reset-page reset-page--loading">Chargement des statistiques…</div>
  }

  const stepMeta = {
    select:        { badge: 'Étape 1 / 2', title: 'Sélection — mise à la corbeille', verb: 'mis à la corbeille', countLabel: 'élément' },
    'review-purge':{ badge: 'Étape 2 / 2', title: 'Suppression définitive', verb: 'supprimés définitivement', countLabel: 'élément' },
    done:          { badge: 'Terminé',     title: 'Réinitialisation terminée', verb: '', countLabel: 'élément' },
  }[step]

  return (
    <div className="reset-page">
      {/* En-tête + repère d'étape, côte à côte sur grand écran */}
      <div className="reset-top">
        <div className="reset-header">
          <div className="reset-header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </div>
          <div>
            <h1>Réinitialisation des données</h1>
            <p>Supprime les données importées dans GLPI par cette application, en deux temps : corbeille puis suppression définitive.</p>
          </div>
        </div>

        <div className="reset-steps">
          <span className={`reset-step ${step === 'select' ? 'is-active' : (step !== 'select' ? 'is-done' : '')}`}>
            <span className="reset-step-num">1</span> Mise à la corbeille
          </span>
          <span className="reset-step-sep" />
          <span className={`reset-step ${step === 'review-purge' ? 'is-active' : (step === 'done' ? 'is-done' : '')}`}>
            <span className="reset-step-num">2</span> Suppression définitive
          </span>
        </div>
      </div>

      {/* Barre de progression — visible pendant le traitement, module par module */}
      {isProcessing && progress.total > 0 && (
        <div className={`reset-progress ${step === 'review-purge' ? 'reset-progress--danger' : 'reset-progress--amber'}`}>
          <div className="reset-progress-head">
            <span className="reset-progress-label">
              {step === 'review-purge' ? 'Suppression définitive en cours' : 'Mise à la corbeille en cours'}
              {progress.label && <span className="reset-progress-current"> · {progress.label}</span>}
            </span>
            <span className="reset-progress-count">{progress.done} / {progress.total} modules</span>
          </div>
          <div className="reset-progress-track">
            <div className="reset-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Bandeau d'info */}
      {step === 'select' && (
        <div className="reset-info-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p>
            Seules les données créées par l'import sont concernées. Les comptes système GLPI
            (<code>glpi</code>, <code>tech</code>, <code>normal</code>, <code>post-only</code>, <code>glpi-system</code>)
            et l'entité racine sont automatiquement protégés. La mise à la corbeille est
            <strong> réversible</strong> — vous pourrez restaurer les éléments depuis GLPI tant
            qu'ils n'auront pas été supprimés définitivement à l'étape 2.
          </p>
        </div>
      )}
      {step === 'review-purge' && (
        <div className="reset-info-banner reset-info-banner--danger">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p>
            Les éléments listés ci-dessous sont maintenant à la corbeille (ou, pour les listes
            déroulantes qui n'ont pas de corbeille côté GLPI, toujours actifs). L'étape suivante
            les supprime <strong>définitivement et sans retour possible</strong>.
          </p>
        </div>
      )}
      {step === 'done' && (
        <div className="reset-info-banner reset-info-banner--success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p>La réinitialisation est terminée. Vous pouvez relancer un import pour repeupler le parc.</p>
        </div>
      )}

      {/* Liste des modules */}
      <div className="reset-modules-head">
        <span className="reset-modules-title">Modules concernés</span>
        <span className="reset-modules-hint">
          {step === 'select'
            ? 'Décoche un module pour le conserver à cette étape'
            : 'La sélection est reprise telle quelle pour la suppression définitive'}
        </span>
      </div>
      <div className="reset-modules-list">
        {order.map((key) => {
          const cfg = RESET_MODULES[key]
          const stat = stats[key]
          if (!stat) return null
          const count = countFor(key)

          // En relecture-purge, le "note" prend tout son sens pour les types
          // sans corbeille : on précise qu'ils seront supprimés directement
          const note = step === 'review-purge' && cfg.trashable
            ? null
            : cfg.note

          return (
            <ResetModuleItem
              key={key}
              label={stat.label}
              color={cfg.color}
              count={count}
              countLabel={step === 'review-purge' ? 'élément à supprimer' : 'élément actif'}
              note={note}
              selected={!!selected[key]}
              onToggle={() => toggleModule(key)}
              status={statusPerModule[key]}
              loadingLabel={step === 'review-purge' ? 'Suppression…' : 'Mise à la corbeille…'}
            />
          )
        })}
      </div>

      {/* Récapitulatif + action */}
      {step !== 'done' && (
        <div className={`reset-action-bar ${step === 'review-purge' ? 'reset-action-bar--danger' : ''}`}>
          <div className="reset-action-summary">
            <span className="reset-action-badge">{stepMeta.badge}</span>
            <div>
              <div>
                <span className="reset-action-total">{totalTarget.toLocaleString('fr-FR')}</span>
                <span className="reset-action-label">
                  {' '}élément{totalTarget !== 1 ? 's' : ''} {step === 'select' ? 'à mettre à la corbeille' : 'à supprimer définitivement'}
                </span>
              </div>
              <div className="reset-action-sub">{targetModules.length} module{targetModules.length !== 1 ? 's' : ''} sélectionné{targetModules.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {step === 'select' ? (
            <button className="btn-reset-trash" onClick={() => openConfirm('trash')} disabled={isProcessing || totalTarget === 0}>
              {isProcessing ? 'Mise à la corbeille…' : 'Mettre à la corbeille'}
            </button>
          ) : (
            <button className="btn-reset-all" onClick={() => openConfirm('purge')} disabled={isProcessing || totalTarget === 0}>
              {isProcessing ? 'Suppression en cours…' : 'Supprimer définitivement'}
            </button>
          )}
        </div>
      )}

      {/* Modale de confirmation */}
      {pendingAction && (
        <div className="reset-modal-overlay" onClick={closeConfirm}>
          <div className="reset-modal" onClick={(e) => e.stopPropagation()}>
            {pendingAction === 'trash' ? (
              <>
                <h3>Mettre à la corbeille ?</h3>
                <p>
                  <strong>{totalTarget.toLocaleString('fr-FR')}</strong> élément{totalTarget !== 1 ? 's' : ''} {totalTarget !== 1 ? 'seront mis' : 'sera mis'} à la corbeille GLPI.
                  Cette action est <strong>réversible</strong> — vous pourrez les restaurer depuis GLPI tant qu'ils ne seront pas supprimés définitivement.
                </p>
                <div className="reset-modal-actions">
                  <button className="btn-cancel" onClick={closeConfirm}>Annuler</button>
                  <button className="btn-confirm-trash" onClick={handleTrash}>Mettre à la corbeille</button>
                </div>
              </>
            ) : (
              <>
                <h3>⚠️ Confirmation requise</h3>
                <p>
                  Vous êtes sur le point de supprimer <strong>{totalTarget.toLocaleString('fr-FR')} élément{totalTarget !== 1 ? 's' : ''}</strong> de
                  façon <strong>définitive et irréversible</strong>.
                </p>
                <p className="reset-modal-hint">Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous :</p>
                <input
                  type="text"
                  className="reset-modal-input"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  autoFocus
                />
                <div className="reset-modal-actions">
                  <button className="btn-cancel" onClick={closeConfirm}>Annuler</button>
                  <button className="btn-confirm-delete" onClick={handlePurge} disabled={!confirmPurgeEnabled}>
                    Supprimer définitivement
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Résultat final */}
      {step === 'done' && purgeResult && (
        <div className="reset-result">
          <h3>Résultat de la suppression définitive</h3>
          {purgeResult.success.length > 0 && (
            <div className="reset-result-list reset-result-list--success">
              <strong>Supprimés avec succès :</strong>
              <ul>
                {purgeResult.success.map((s) => (
                  <li key={s.module}>{s.label} — {s.count} élément{s.count !== 1 ? 's' : ''}</li>
                ))}
              </ul>
            </div>
          )}
          {purgeResult.errors.length > 0 && (
            <div className="reset-result-list reset-result-list--error">
              <strong>Erreurs :</strong>
              <ul>{purgeResult.errors.map((e) => <li key={e.module}>{e.label} — {e.error}</li>)}</ul>
            </div>
          )}
          <button className="btn-reset-restart" onClick={() => { setStep('select'); setPurgeResult(null); setTrashSummary(null); loadStats(true) }}>
            Revenir à la sélection
          </button>
        </div>
      )}
    </div>
  )
}

export default ResetPage
