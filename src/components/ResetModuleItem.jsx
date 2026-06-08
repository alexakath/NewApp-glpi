import './ResetModuleItem.css'

// Ligne d'un module dans la page de réinitialisation.
// Reprend la couleur déclarée dans resetConfig (même logique que les badges
// de modules de l'écran d'import) pour repérer le type de donnée d'un coup d'œil.
const ResetModuleItem = ({
  label,
  color      = '#64748b',
  count,
  countLabel = 'élément',
  note,
  selected   = true,
  onToggle,
  status     = null,   // 'loading' | 'success' | 'error'
  loadingLabel = 'Suppression…',
}) => {
  const getStatusBadge = () => {
    if (status === 'loading') return <span className="rmi-badge rmi-badge--loading">{loadingLabel}</span>
    if (status === 'success') return <span className="rmi-badge rmi-badge--success">Fait</span>
    if (status === 'error')   return <span className="rmi-badge rmi-badge--error">Erreur</span>
    return null
  }

  return (
    <div className={`rmi ${!selected ? 'rmi--off' : ''}`}>
      <label className="rmi-main">
        <input
          type="checkbox"
          className="rmi-checkbox"
          checked={selected}
          onChange={onToggle}
          disabled={status === 'loading' || count === 0}
        />
        <span className="rmi-dot" style={{ background: color }} />
        <span className="rmi-info">
          <span className="rmi-label">{label}</span>
          {note && <span className="rmi-note">{note}</span>}
        </span>
      </label>

      <div className="rmi-right">
        <span className="rmi-count" style={{ background: `${color}18`, color, border: `0.5px solid ${color}44` }}>
          {count.toLocaleString('fr-FR')} {countLabel}{count !== 1 ? 's' : ''}
        </span>
        {getStatusBadge()}
      </div>
    </div>
  )
}

export default ResetModuleItem
