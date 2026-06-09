import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useAssets from '../hooks/useAssets'
import { ASSET_TYPES } from '../../api/assets'
import { IcoComputer, IcoMonitor, IcoAsset, IcoSearch, IcoFilter, IcoX, IcoRefresh, IcoEmpty, IcoPin, IcoHash } from '../icons'
import './FrontHomePage.css'

const dd = (v) => (v !== null && typeof v === 'object') ? (v.name ?? v.id ?? null) : (v ?? null)

// Icône par type — Computer/Monitor ont une icône dédiée, les autres une icône générique
const ICONS_BY_TYPE = { Computer: IcoComputer, Monitor: IcoMonitor }
const iconFor = (itemtype) => ICONS_BY_TYPE[itemtype] ?? IcoAsset

// Construit la ligne secondaire de la carte : OS (ordinateur), taille (moniteur)
// ou type d'actif — premier champ pertinent disponible sur l'objet GLPI
const metaFor = (item) =>
  dd(item.operatingsystem)
  || (item.size > 0 ? `${item.size}"` : null)
  || dd(item.type)
  || null

// Route de détail : Computer/Monitor ont une page dédiée, les autres la page générique
const detailPath = (itemtype, id) => {
  if (itemtype === 'Computer') return `/front/computers/${id}`
  if (itemtype === 'Monitor')  return `/front/monitors/${id}`
  return `/front/assets/${itemtype}/${id}`
}

// ── Carte d'un équipement ──────────────────────────────────────────────────
function AssetCard({ itemtype, name, serial, meta, location, status, imageUrl, onClick }) {
  const Icon = iconFor(itemtype)
  return (
    <div className={`fh-card fh-card--${itemtype.toLowerCase()}`} onClick={onClick}>
      <div className="fh-card-img">
        {imageUrl
          ? <img src={imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          : <Icon />
        }
      </div>
      <div className="fh-card-body">
        <span className="fh-card-type">{ASSET_TYPES[itemtype]?.label ?? itemtype}</span>
        <h3 className="fh-card-name">{name || '—'}</h3>
        <p className="fh-card-serial">{serial || 'N° série non renseigné'}</p>
        {meta     && <p className="fh-card-meta">{meta}</p>}
        {location && <p className="fh-card-location">📍 {location}</p>}
        <p className={`fh-card-status ${status ? '' : 'fh-card-status--empty'}`}>
          {status || 'Statut non renseigné'}
        </p>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
function FrontHomePage() {
  const navigate = useNavigate()
  const { assetsByType, imageMap, loading, error } = useAssets()

  // États des filtres séparés
  const [searchName,        setSearchName]        = useState('')
  const [searchSerial,      setSearchSerial]      = useState('')
  const [manufacturerFilter, setManufacturerFilter] = useState('')
  const [locationFilter,    setLocationFilter]    = useState('')
  const [statusFilter,      setStatusFilter]      = useState('')
  const [typeFilter,        setTypeFilter]        = useState('')

  const hasFilters = searchName || searchSerial || manufacturerFilter || locationFilter || statusFilter || typeFilter

  const resetFilters = () => {
    setSearchName('')
    setSearchSerial('')
    setManufacturerFilter('')
    setLocationFilter('')
    setStatusFilter('')
    setTypeFilter('')
  }

  // Fusion normalisée de tous les types déclarés dans ASSET_TYPES — ajouter un
  // type au registre suffit à le faire apparaître ici, sans toucher à cette page
  const allAssets = useMemo(() =>
    Object.entries(assetsByType).flatMap(([itemtype, items]) =>
      items.filter(it => !it.is_deleted).map(it => ({
        id:           it.id,
        itemtype,
        name:         it.name,
        serial:       it.serial,
        manufacturer: dd(it.manufacturer),
        meta:         metaFor(it),
        location:     dd(it.location),
        status:       dd(it.status),
      }))
    )
  , [assetsByType])

  // Options dynamiques pour les selects (valeurs uniques, triées)
  const manufacturerOptions = useMemo(() =>
    [...new Set(allAssets.map(a => a.manufacturer).filter(Boolean))].sort()
  , [allAssets])

  const locationOptions = useMemo(() =>
    [...new Set(allAssets.map(a => a.location).filter(Boolean))].sort()
  , [allAssets])

  const statusOptions = useMemo(() =>
    [...new Set(allAssets.map(a => a.status).filter(Boolean))].sort()
  , [allAssets])

  // Types réellement présents dans le parc (pour ne pas afficher de filtre vide)
  const typeOptions = useMemo(() =>
    Object.keys(assetsByType).filter(t => assetsByType[t]?.some(it => !it.is_deleted))
  , [assetsByType])

  // Filtrage multi-critères
  const filtered = useMemo(() => {
    const qName   = searchName.toLowerCase()
    const qSerial = searchSerial.toLowerCase()

    return allAssets.filter(a => {
      const matchName         = !qName             || (a.name         || '').toLowerCase().includes(qName)
      const matchSerial       = !qSerial           || (a.serial       || '').toLowerCase().includes(qSerial)
      const matchManufacturer = !manufacturerFilter || a.manufacturer === manufacturerFilter
      const matchLocation     = !locationFilter     || a.location     === locationFilter
      const matchStatus       = !statusFilter       || a.status       === statusFilter
      const matchType         = !typeFilter         || a.itemtype     === typeFilter
      return matchName && matchSerial && matchManufacturer && matchLocation && matchStatus && matchType
    })
  }, [allAssets, searchName, searchSerial, manufacturerFilter, locationFilter, statusFilter, typeFilter])

  if (loading) return <p className="fh-status">Chargement du parc…</p>
  if (error)   return <p className="fh-status fh-status--error">Erreur : {error}</p>

  return (
    <div>
      {/* En-tête */}
      <div className="fh-header">
        <h1 className="fh-title">Parc informatique</h1>
        <span className="fh-count">{filtered.length} équipement{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Barre de filtres multi-critères */}
      <div className="fh-filters">
        {/* Nom */}
        <div className="ff-field ff-field--grow">
          <label className="ff-label">Nom</label>
          <div className="ff-wrap">
            <span className="ff-icon"><IcoSearch /></span>
            <input
              type="text"
              className="ff-input"
              placeholder="Nom de l'équipement…"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
            />
            {searchName && <button className="ff-clear" onClick={() => setSearchName('')}><IcoX /></button>}
          </div>
        </div>

        {/* Numéro de série */}
        <div className="ff-field ff-field--grow">
          <label className="ff-label">N° de série</label>
          <div className="ff-wrap">
            <span className="ff-icon"><IcoHash /></span>
            <input
              type="text"
              className="ff-input"
              placeholder="Numéro de série…"
              value={searchSerial}
              onChange={e => setSearchSerial(e.target.value)}
            />
            {searchSerial && <button className="ff-clear" onClick={() => setSearchSerial('')}><IcoX /></button>}
          </div>
        </div>

        {/* Fabricant */}
        <div className="ff-field">
          <label className="ff-label">Fabricant</label>
          <div className="ff-wrap">
            <span className="ff-icon"><IcoFilter /></span>
            <select className="ff-input ff-select" value={manufacturerFilter} onChange={e => setManufacturerFilter(e.target.value)}>
              <option value="">Tous</option>
              {manufacturerOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Localisation */}
        <div className="ff-field">
          <label className="ff-label">Localisation</label>
          <div className="ff-wrap">
            <span className="ff-icon"><IcoPin /></span>
            <select className="ff-input ff-select" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
              <option value="">Toutes</option>
              {locationOptions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
        </div>

        {/* Statut */}
        <div className="ff-field">
          <label className="ff-label">Statut</label>
          <div className="ff-wrap">
            <span className="ff-icon"><IcoFilter /></span>
            <select className="ff-input ff-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Tous</option>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Type */}
        <div className="ff-field">
          <label className="ff-label">Type</label>
          <div className="ff-wrap">
            <span className="ff-icon"><IcoFilter /></span>
            <select className="ff-input ff-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">Tous</option>
              {typeOptions.map(t => (
                <option key={t} value={t}>{ASSET_TYPES[t]?.labelPlural ?? t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Reset */}
        {hasFilters && (
          <div className="ff-field ff-field--reset">
            <label className="ff-label">&nbsp;</label>
            <button className="ff-reset" onClick={resetFilters}><IcoRefresh /> Réinitialiser</button>
          </div>
        )}
      </div>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="fh-empty">
          <IcoEmpty />
          <p>Aucun équipement ne correspond à votre recherche</p>
          {hasFilters && <button className="ff-reset" onClick={resetFilters}>Réinitialiser les filtres</button>}
        </div>
      ) : (
        <div className="fh-grid">
          {filtered.map(a => (
            <AssetCard
              key={`${a.itemtype}-${a.id}`}
              {...a}
              imageUrl={imageMap.get(`${a.itemtype}-${a.id}`)}
              onClick={() => navigate(detailPath(a.itemtype, a.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default FrontHomePage
