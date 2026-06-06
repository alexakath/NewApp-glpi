import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useAssets from '../hooks/useAssets'
import { IcoComputer, IcoMonitor, IcoSearch, IcoFilter, IcoX, IcoRefresh, IcoEmpty, IcoPin, IcoHash } from '../icons'
import './FrontHomePage.css'

const dd = (v) => (v !== null && typeof v === 'object') ? (v.name ?? v.id ?? null) : (v ?? null)

// ── Carte d'un équipement ──────────────────────────────────────────────────
function AssetCard({ type, name, serial, os, size, location, status, imageUrl, onClick }) {
  const isComputer = type === 'computer'
  return (
    <div className={`fh-card fh-card--${type}`} onClick={onClick}>
      <div className="fh-card-img">
        {imageUrl
          ? <img src={imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          : (isComputer ? <IcoComputer /> : <IcoMonitor />)
        }
      </div>
      <div className="fh-card-body">
        <span className="fh-card-type">{isComputer ? 'Ordinateur' : 'Moniteur'}</span>
        <h3 className="fh-card-name">{name || '—'}</h3>
        <p className="fh-card-serial">{serial || 'N° série non renseigné'}</p>
        {(os || size) && <p className="fh-card-meta">{os || size}</p>}
        {location    && <p className="fh-card-location">📍 {location}</p>}
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
  const { computers, monitors, imageMap, loading, error } = useAssets()

  // États des filtres séparés
  const [searchName,      setSearchName]      = useState('')
  const [searchSerial,    setSearchSerial]    = useState('')
  const [locationFilter,  setLocationFilter]  = useState('')
  const [statusFilter,    setStatusFilter]    = useState('')
  const [typeFilter,      setTypeFilter]      = useState('')

  const hasFilters = searchName || searchSerial || locationFilter || statusFilter || typeFilter

  const resetFilters = () => {
    setSearchName('')
    setSearchSerial('')
    setLocationFilter('')
    setStatusFilter('')
    setTypeFilter('')
  }

  // Fusion normalisée des deux listes
  const allAssets = useMemo(() => [
    ...computers.map(c => ({
      id:       c.id,
      itemtype: 'Computer',
      type:     'computer',
      name:     c.name,
      serial:   c.serial,
      os:       dd(c.operatingsystem),
      location: dd(c.location),
      status:   dd(c.status),
    })),
    ...monitors.map(m => ({
      id:       m.id,
      itemtype: 'Monitor',
      type:     'monitor',
      name:     m.name,
      serial:   m.serial,
      size:     m.size > 0 ? `${m.size}"` : null,
      location: dd(m.location),
      status:   dd(m.status),
    })),
  ], [computers, monitors])

  // Options dynamiques pour les selects (valeurs uniques, triées)
  const locationOptions = useMemo(() =>
    [...new Set(allAssets.map(a => a.location).filter(Boolean))].sort()
  , [allAssets])

  const statusOptions = useMemo(() =>
    [...new Set(allAssets.map(a => a.status).filter(Boolean))].sort()
  , [allAssets])

  // Filtrage multi-critères
  const filtered = useMemo(() => {
    const qName   = searchName.toLowerCase()
    const qSerial = searchSerial.toLowerCase()
    return allAssets.filter(a => {
      const matchName     = !qName     || (a.name   || '').toLowerCase().includes(qName)
      const matchSerial   = !qSerial   || (a.serial || '').toLowerCase().includes(qSerial)
      const matchLocation = !locationFilter || a.location === locationFilter
      const matchStatus   = !statusFilter   || a.status   === statusFilter
      const matchType     = !typeFilter     || a.type      === typeFilter
      return matchName && matchSerial && matchLocation && matchStatus && matchType
    })
  }, [allAssets, searchName, searchSerial, locationFilter, statusFilter, typeFilter])

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
              <option value="computer">Ordinateurs</option>
              <option value="monitor">Moniteurs</option>
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
              key={`${a.type}-${a.id}`}
              {...a}
              imageUrl={imageMap.get(`${a.itemtype}-${a.id}`)}
              onClick={() => navigate(`/front/${a.type}s/${a.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default FrontHomePage
