import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAssetFull, ASSET_TYPES } from '../../api/assets'
import { getItemImageUrl } from '../../api/documents'
import { IcoBack, IcoAsset } from '../icons'
import './FrontDetail.css'

const dd = (v) => (v !== null && typeof v === 'object') ? (v.name ?? v.id ?? null) : (v ?? null)

// Page de détail générique — utilisée pour tout type d'actif déclaré dans
// ASSET_TYPES qui n'a pas de page dédiée (Computer/Monitor en ont une, avec
// des sections spécifiques comme le stockage ou la connectique).
// N'affiche que les champs réellement présents sur l'objet GLPI renvoyé.
function FrontAssetDetail() {
  const { itemtype, id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset]       = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const cfg = ASSET_TYPES[itemtype]

  useEffect(() => {
    if (!cfg) { setError(`Type d'actif inconnu : ${itemtype}`); setLoading(false); return }
    getAssetFull(itemtype, id)
      .then(data => {
        setAsset(data)
        getItemImageUrl(itemtype, id).then(setImageUrl)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [itemtype, id])

  if (loading) return <div className="fd-state">Chargement…</div>
  if (error)   return <div className="fd-state fd-state--error">Erreur : {error}</div>

  const groupLabel = Array.isArray(asset.group) && asset.group.length
    ? asset.group.map(g => g.name ?? g).join(', ')
    : null

  return (
    <div className="fd-wrap">
      <button className="fd-back" onClick={() => navigate('/front')}>
        <IcoBack /> Retour à l'inventaire
      </button>

      <div className="fd-header">
        <div className="fd-header-icon">
          {imageUrl
            ? <img src={imageUrl} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
            : <IcoAsset />
          }
        </div>
        <div>
          <p className="fd-breadcrumb">Parc / {cfg.labelPlural}</p>
          <h1 className="fd-title">{asset.name}</h1>
          {dd(asset.status) && (
            <span className="fd-status-badge">{dd(asset.status)}</span>
          )}
        </div>
      </div>

      <div className="fd-grid">
        <div className="fd-card">
          <h3 className="fd-card-title">Identification</h3>
          <dl className="fd-dl">
            <div className="fd-dl-row"><dt>Numéro de série</dt><dd>{asset.serial || '—'}</dd></div>
            <div className="fd-dl-row"><dt>N° inventaire</dt><dd>{asset.otherserial || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Fabricant</dt><dd>{dd(asset.manufacturer) || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Modèle</dt><dd>{dd(asset.model) || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Type</dt><dd>{dd(asset.type) || '—'}</dd></div>
          </dl>
        </div>

        <div className="fd-card">
          <h3 className="fd-card-title">Affectation</h3>
          <dl className="fd-dl">
            <div className="fd-dl-row"><dt>Utilisateur</dt><dd>{dd(asset.user) || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Localisation</dt><dd>{dd(asset.location) || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Groupe</dt><dd>{groupLabel || '—'}</dd></div>
            <div className="fd-dl-row"><dt>Entité</dt><dd>{dd(asset.entity) || '—'}</dd></div>
          </dl>
        </div>
      </div>

      {asset.comment && (
        <div className="fd-card fd-card--full">
          <h3 className="fd-card-title">Commentaire</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--f-text)' }}>{asset.comment}</p>
        </div>
      )}
    </div>
  )
}

export default FrontAssetDetail
