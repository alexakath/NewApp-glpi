import { useState, useRef } from 'react'
import { parseCsvFile, detectDelimiter, importMultiModule, buildImportPlan, importImages } from '../api/import/importService'
import { detectModulesFromHeaders } from '../api/import/detectModules'
import { validateFile } from '../api/import/validateImport'
import { SUB_MODULE_META, SUB_MODULE_DEPS, SUB_MODULE_ORDER } from '../api/import/modulesConfig'
import './ImportPage.css'

// ─── Constantes UI ────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 20

// Labels raccourcis pour le plan (dépendances)
const subLabel = (key) => SUB_MODULE_META[key]?.label ?? key

// ─── Composant FileCard ───────────────────────────────────────────────────────

const FileCard = ({ entry, onRemove, onDelimiterChange, disabled }) => (
  <div className="file-card">
    <div className="file-card-main">
      <div className="file-card-icon csv">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <div className="file-card-info">
        <span className="file-card-name">{entry.file.name}</span>
        <span className="file-card-meta">
          {entry.rows?.length ?? 0} ligne{entry.rows?.length !== 1 ? 's' : ''} · {entry.headers?.length ?? 0} colonnes
        </span>

        <div className="file-card-badges">
          {entry.detectedModules.map(mk => (
            <span key={mk} className="module-badge" style={{ background: `${SUB_MODULE_META[mk]?.color ?? '#64748b'}18`, color: SUB_MODULE_META[mk]?.color ?? '#64748b', border: `0.5px solid ${SUB_MODULE_META[mk]?.color ?? '#64748b'}44` }}>
              {SUB_MODULE_META[mk]?.label ?? mk}
            </span>
          ))}
          {entry.detectedModules.length === 0 && (
            <span className="file-card-no-module">Aucun module détecté</span>
          )}
        </div>

        {entry.validation && (
          <div className="file-validation">
            {entry.validation.errors.length === 0 && entry.validation.warnings.length === 0 ? (
              <span className="val-ok">✓ Fichier valide</span>
            ) : (
              <>
                {entry.validation.errors.map((err, i) => (
                  <span key={`e${i}`} className="val-error">⚠ {err.message}</span>
                ))}
                {entry.validation.warnings.map((w, i) => (
                  <span key={`w${i}`} className="val-warning">· {w.message}</span>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>

    <div className="file-card-sep">
      <span className="sep-label">Séparateur :</span>
      {[';', ',', '|', '\t'].map(sep => (
        <button key={sep} className={`sep-btn ${entry.delimiter === sep ? 'active' : ''}`}
          onClick={() => !disabled && onDelimiterChange(entry.id, sep)} disabled={disabled}>
          {sep === '\t' ? 'TAB' : sep}
        </button>
      ))}
    </div>

    {!disabled && (
      <button className="file-card-remove" onClick={() => onRemove(entry.id)} title="Retirer ce fichier">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    )}
  </div>
)

// ─── Composant ZipCard ───────────────────────────────────────────────────────

const ZipCard = ({ file, onRemove, disabled }) => (
  <div className="file-card">
    <div className="file-card-main">
      <div className="file-card-icon" style={{ background: '#fff7ed', color: '#f97316' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="12" x2="12" y2="16"/><circle cx="12" cy="18" r=".5" fill="currentColor"/>
        </svg>
      </div>
      <div className="file-card-info">
        <span className="file-card-name">{file.name}</span>
        <span className="file-card-meta">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
        <div className="file-card-badges">
          <span className="module-badge" style={{ background: '#fff7ed', color: '#f97316', border: '0.5px solid #f9731644' }}>
            Images ZIP
          </span>
        </div>
      </div>
    </div>
    {!disabled && (
      <button className="file-card-remove" onClick={onRemove} title="Retirer ce fichier">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    )}
  </div>
)

// ─── Page principale ──────────────────────────────────────────────────────────

const ImportPage = () => {
  const [fileEntries, setFileEntries]       = useState([])
  const [zipFile, setZipFile]               = useState(null)
  const [zipProgress, setZipProgress]       = useState(0)
  const [fileError, setFileError]           = useState(null)
  const [importing, setImporting]           = useState(false)
  const [subModuleProgress, setSubModuleProgress] = useState({})
  const [subModuleDone, setSubModuleDone]   = useState({})
  const [globalReport, setGlobalReport]     = useState(null)
  const fileInputRef = useRef(null)
  const zipInputRef  = useRef(null)

  // ── Ajout d'un fichier ──────────────────────────────────────────────────────

  const processFile = async (file, delimiter) => {
    const rows = await parseCsvFile(file, delimiter)
    if (rows.length === 0) throw new Error('Le fichier CSV est vide')
    const headers = Object.keys(rows[0])
    const detectionResults = detectModulesFromHeaders(headers)
    const detectedModules  = detectionResults.filter(r => r.detected).map(r => r.moduleKey)
    const validation = validateFile(rows, headers, detectedModules)
    return { rows, headers, detectionResults, detectedModules, validation }
  }

  const handleAddFile = async (e) => {
    const file = e.target.files[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    setFileError(null)

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Seuls les fichiers .csv sont acceptés')
      return
    }
    if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
      setFileError(`Le fichier dépasse ${MAX_FILE_SIZE_MB} MB`)
      return
    }

    try {
      const { delimiter } = await detectDelimiter(file)
      const parsed = await processFile(file, delimiter)
      const id = `file_${Date.now()}_${Math.random().toString(36).slice(2)}`
      setFileEntries(prev => [...prev, { id, file, delimiter, ...parsed }])
    } catch (err) {
      setFileError(`Erreur de lecture : ${err.message}`)
    }
  }

  const handleDelimiterChange = async (id, newDelimiter) => {
    const entry = fileEntries.find(e => e.id === id)
    if (!entry) return
    try {
      const parsed = await processFile(entry.file, newDelimiter)
      setFileEntries(prev => prev.map(e => e.id === id ? { ...e, delimiter: newDelimiter, ...parsed } : e))
    } catch (err) {
      setFileError(`Erreur re-parsing : ${err.message}`)
    }
  }

  const removeFile = (id) => setFileEntries(prev => prev.filter(e => e.id !== id))

  const handleAddZip = (e) => {
    const file = e.target.files[0]
    if (zipInputRef.current) zipInputRef.current.value = ''
    if (!file) return
    setFileError(null)
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setFileError('Le fichier images doit être un .zip')
      return
    }
    setZipFile(file)
  }

  // ── Plan d'import ───────────────────────────────────────────────────────────

  const detectedEntries = fileEntries.flatMap(entry =>
    entry.detectedModules.map(moduleKey => ({
      moduleKey,
      rows: entry.rows,
      fileName: entry.file.name,
      fileId: entry.id,
    }))
  )

  const plan = buildImportPlan(detectedEntries)

  // Map subModuleKey → nom du fichier source (pour affichage)
  const subModuleFileMap = {}
  plan.forEach(slot => { subModuleFileMap[slot.subModuleKey] = slot.fileName })

  const hasBlockingErrors = fileEntries.some(e => e.validation?.errors?.length > 0)
  const canImport = !importing && !globalReport && (detectedEntries.length > 0 || !!zipFile) && !hasBlockingErrors

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    setImporting(true)
    setSubModuleProgress({})
    setSubModuleDone({})
    setZipProgress(0)
    setGlobalReport(null)

    try {
      let report = {}

      if (plan.length > 0) {
        report = await importMultiModule(
          plan,
          (smk, pct) => setSubModuleProgress(prev => ({ ...prev, [smk]: pct })),
          (smk, results) => setSubModuleDone(prev => ({ ...prev, [smk]: results }))
        )
      }

      if (zipFile) {
        const imageResults = await importImages(zipFile, (pct, partial) => {
          setZipProgress(pct)
          setSubModuleDone(prev => ({ ...prev, images: partial }))
        })
        report['images'] = imageResults
        setSubModuleDone(prev => ({ ...prev, images: imageResults }))
      }

      setGlobalReport(report)
    } catch (err) {
      setGlobalReport({ _error: err.message })
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setFileEntries([])
    setZipFile(null)
    setZipProgress(0)
    setFileError(null)
    setSubModuleProgress({})
    setSubModuleDone({})
    setGlobalReport(null)
    setImporting(false)
  }

  // ── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <div className="import-page">

      {/* En-tête */}
      <div className="import-header">
        <div className="import-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <h1>Import de données</h1>
          <p>Ajoutez vos fichiers CSV — un seul bouton pour tout importer dans GLPI dans le bon ordre</p>
        </div>
      </div>

      {/* ── Zone 1 : Fichiers ── */}
      <div className="import-section">
        <div className="import-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/>
          </svg>
          Fichiers à importer
        </div>

        {fileEntries.length === 0 && (
          <div className="import-drop-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <p>Aucun fichier ajouté</p>
            <span>Cliquez sur « Ajouter un fichier » pour commencer</span>
          </div>
        )}

        <div className="file-list">
          {fileEntries.map(entry => (
            <FileCard key={entry.id} entry={entry} onRemove={removeFile}
              onDelimiterChange={handleDelimiterChange} disabled={importing || !!globalReport} />
          ))}
        </div>

        {!importing && !globalReport && (
          <button className="import-add-btn" onClick={() => fileInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter un fichier
            <span className="import-add-hint">.csv</span>
          </button>
        )}

        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleAddFile} />

        {fileError && (
          <div className="import-file-error">⚠ {fileError}</div>
        )}
      </div>

      {/* ── Zone 1b : Fichier ZIP images ── */}
      <div className="import-section">
        <div className="import-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h6M3 15h6M15 9h6M15 15h6"/>
          </svg>
          Images (optionnel)
        </div>
        <p className="import-plan-desc">
          Un fichier .zip contenant des images nommées d'après les éléments GLPI — chaque image sera jointe comme Document à l'élément correspondant.
        </p>

        {!zipFile ? (
          <div className="import-drop-hint" style={{ padding: '1rem 0' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32" style={{ color: '#f97316' }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>
            </svg>
            <span>Aucune archive image ajoutée</span>
          </div>
        ) : (
          <ZipCard file={zipFile} onRemove={() => setZipFile(null)} disabled={importing || !!globalReport} />
        )}

        {!importing && !globalReport && !zipFile && (
          <button className="import-add-btn" onClick={() => zipInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter une archive images
            <span className="import-add-hint">.zip</span>
          </button>
        )}

        <input ref={zipInputRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={handleAddZip} />
      </div>

      {/* ── Zone 2 : Plan d'import ── */}
      {plan.length > 0 && !globalReport && (
        <div className="import-section">
          <div className="import-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Plan d'import — {plan.length} étape{plan.length > 1 ? 's' : ''}, dans cet ordre
          </div>
          <p className="import-plan-desc">
            Un registre partagé entre tous les fichiers — les IDs créés à une étape sont disponibles pour les suivantes.
          </p>
          <div className="import-plan">
            {plan.map((slot, idx) => {
              const meta = SUB_MODULE_META[slot.subModuleKey] ?? {}
              const deps = (SUB_MODULE_DEPS[slot.subModuleKey] ?? []).filter(d => subModuleFileMap[d])
              return (
                <div key={slot.subModuleKey} className="plan-row">
                  <span className="plan-num">{idx + 1}</span>
                  <span className="plan-dot" style={{ background: meta.color ?? '#64748b' }} />
                  <span className="plan-module">{meta.label ?? slot.subModuleKey}</span>
                  <span className="plan-source">{slot.fileName}</span>
                  {deps.length > 0 && (
                    <span className="plan-deps">
                      ← {deps.map((d, i) => (
                        <span key={d}>{i > 0 && ', '}<strong>{subLabel(d)}</strong></span>
                      ))}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Zone 3 : Bouton + Progression ── */}
      {!globalReport && (
        <div className="import-launch">
          <button className="btn-launch" onClick={handleImport} disabled={!canImport}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {importing ? 'Import en cours...' : (() => {
            const stepCount = plan.length + (zipFile ? 1 : 0)
            return `Lancer l'import (${stepCount} étape${stepCount > 1 ? 's' : ''})`
          })()}
          </button>
          {!canImport && !importing && fileEntries.length > 0 && (
            <p className="import-launch-hint">
              {hasBlockingErrors ? 'Corrigez les erreurs avant de lancer l\'import' : 'Ajoutez au moins un fichier CSV avec des modules détectés'}
            </p>
          )}
        </div>
      )}

      {/* Barres de progression */}
      {(importing || globalReport) && (plan.length > 0 || !!zipFile) && (
        <div className="import-section">
          <div className="import-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            {importing ? 'Import en cours...' : 'Import terminé'}
          </div>

          {plan.map(slot => {
            // Barres de progression CSV (inchangé)
            const meta    = SUB_MODULE_META[slot.subModuleKey] ?? {}
            const pct     = subModuleProgress[slot.subModuleKey] ?? 0
            const done    = subModuleDone[slot.subModuleKey]
            const hasErr  = done?.errors?.length > 0
            const hasWarn = done?.warnings?.length > 0
            return (
              <div key={`prog-${slot.subModuleKey}`} className="module-progress-row">
                <div className="module-progress-header">
                  <span className="prog-dot" style={{ background: meta.color ?? '#64748b' }} />
                  <span>{meta.label ?? slot.subModuleKey}</span>
                  <span className="prog-source">{slot.fileName}</span>
                  {done && (
                    <span className={`prog-result ${hasErr ? 'warn' : 'ok'}`}>
                      {done.success} ok{hasErr ? ` · ${done.errors.length} erreur${done.errors.length > 1 ? 's' : ''}` : ''}
                      {hasWarn && !hasErr ? ` · ${done.warnings.length} warning${done.warnings.length > 1 ? 's' : ''}` : ''}
                    </span>
                  )}
                  {!done && importing && pct > 0 && <span className="prog-pct">{pct}%</span>}
                </div>
                <div className="progress-bar-wrapper">
                  <div className="progress-bar" style={{
                    width: done ? '100%' : `${pct}%`,
                    background: done ? (hasErr ? '#f59e0b' : '#22c55e') : undefined,
                  }} />
                </div>
              </div>
            )
          })}

          {/* Barre de progression ZIP images */}
          {zipFile && (() => {
            const done    = subModuleDone['images']
            const hasErr  = done?.errors?.length > 0
            const hasWarn = done?.warnings?.length > 0
            return (
              <div className="module-progress-row">
                <div className="module-progress-header">
                  <span className="prog-dot" style={{ background: '#f97316' }} />
                  <span>Images</span>
                  <span className="prog-source">{zipFile.name}</span>
                  {done && (
                    <span className={`prog-result ${hasErr ? 'warn' : 'ok'}`}>
                      {done.success} ok
                      {hasErr ? ` · ${done.errors.length} erreur${done.errors.length > 1 ? 's' : ''}` : ''}
                      {hasWarn ? ` · ${done.warnings.length} warning${done.warnings.length > 1 ? 's' : ''}` : ''}
                    </span>
                  )}
                  {!done && importing && zipProgress > 0 && <span className="prog-pct">{zipProgress}%</span>}
                </div>
                <div className="progress-bar-wrapper">
                  <div className="progress-bar" style={{
                    width: done ? '100%' : `${zipProgress}%`,
                    background: done ? (hasErr ? '#f59e0b' : '#22c55e') : undefined,
                  }} />
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Zone 4 : Rapport final ── */}
      {globalReport && !importing && (
        <div className="import-section">
          {globalReport._error ? (
            <p className="report-global-error">⚠ {globalReport._error}</p>
          ) : (
            <>
              <div className="report-summary">
                {Object.entries(globalReport).map(([smk, res]) => {
                  const meta = SUB_MODULE_META[smk] ?? {}
                  return (
                    <div key={smk} className="report-stat">
                      <span className="report-stat-dot" style={{ background: meta.color ?? '#64748b' }} />
                      <strong>{meta.label ?? smk}</strong>
                      <span className="report-number success">{res.success}</span>
                      <span className="report-stat-label">ok</span>
                      {res.errors?.length > 0 && (
                        <span className="report-number error">{res.errors.length} erreur{res.errors.length > 1 ? 's' : ''}</span>
                      )}
                      {res.warnings?.length > 0 && (
                        <span className="report-number warn">{res.warnings.length} warning{res.warnings.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {Object.entries(globalReport).some(([, r]) => r.errors?.length > 0 || r.warnings?.length > 0) && (
                <div className="error-list">
                  <p className="error-list-title">Détail des erreurs et warnings</p>
                  {Object.entries(globalReport).flatMap(([smk, res]) => [
                    ...(res.errors ?? []).map((err, i) => (
                      <div key={`e-${smk}-${i}`} className="error-item error">
                        <span className="error-line">{SUB_MODULE_META[smk]?.label ?? smk} — Ligne {err.line}</span>
                        <span className="error-msg">{String(err.message).slice(0, 200)}</span>
                      </div>
                    )),
                    ...(res.warnings ?? []).map((w, i) => (
                      <div key={`w-${smk}-${i}`} className="error-item warning">
                        <span className="error-line">{SUB_MODULE_META[smk]?.label ?? smk}</span>
                        <span className="error-msg">{String(w.message).slice(0, 200)}</span>
                      </div>
                    )),
                  ])}
                </div>
              )}
            </>
          )}

          <button className="btn-primary" onClick={handleReset} style={{ marginTop: '1.25rem' }}>
            + Nouvel import
          </button>
        </div>
      )}
    </div>
  )
}

export default ImportPage
