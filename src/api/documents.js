import axios from 'axios'
import { withV1Session } from './glpi'

const V1_BASE = '/apirest.php'

// Cache module-level : documentId → blob URL (durée de vie = session navigateur)
const _blobCache = new Map()

// Télécharge un document comme image blob via v1 (dans une session déjà ouverte).
// Stocke null dans le cache pour les documents manquants/non-images → pas de retry.
const _downloadImageBlob = async (headers, documentId) => {
  if (_blobCache.has(documentId)) return _blobCache.get(documentId)
  try {
    const res = await axios.get(`${V1_BASE}/Document/${documentId}?alt=media`, {
      headers,
      responseType: 'blob',
    })
    const ct = res.headers['content-type'] || ''
    if (!ct.startsWith('image/')) {
      _blobCache.set(documentId, null)
      return null
    }
    const url = URL.createObjectURL(res.data)
    _blobCache.set(documentId, url)
    return url
  } catch {
    _blobCache.set(documentId, null) // fichier manquant ou erreur → pas de retry
    return null
  }
}

// Extrait le premier documents_id d'une liste de Document_Item
const _firstDocId = (items) => {
  for (const di of items) {
    const id = di.documents_id?.id ?? Number(di.documents_id)
    if (id > 0) return id
  }
  return null
}

// Récupère l'URL blob de la première image d'un élément (une seule session v1)
export const getItemImageUrl = (itemtype, itemId) =>
  withV1Session(async (headers) => {
    const res = await axios.get(`${V1_BASE}/${itemtype}/${itemId}/Document_Item`, { headers })
      .catch(() => ({ data: [] }))
    const docId = _firstDocId(Array.isArray(res.data) ? res.data : [])
    if (!docId) return null
    // Vérifie que c'est bien une image avant de télécharger le fichier
    const meta = await axios.get(`${V1_BASE}/Document/${docId}`, { headers }).catch(() => null)
    if (!meta?.data?.mime?.startsWith('image/')) return null
    return _downloadImageBlob(headers, docId)
  }).catch(() => null)

// Construit une Map { `${itemtype}-${id}` → blobUrl } pour une liste d'actifs,
// le tout en une seule session v1 (un seul initSession / killSession).
// assets : [{ id, itemtype: 'Computer'|'Monitor' }]
export const buildAssetImageMap = (assets) =>
  withV1Session(async (headers) => {
    const map = new Map()

    // 1. Récupère les métadonnées de tous les documents pour ne retenir que les images
    const docsRes = await axios.get(`${V1_BASE}/Document`, {
      headers,
      params: { range: '0-999' },
    }).catch(() => ({ data: [] }))
    const imageDocs = new Set(
      (Array.isArray(docsRes.data) ? docsRes.data : [])
        .filter(d => (d.mime || '').startsWith('image/'))
        .map(d => Number(d.id))
    )

    if (imageDocs.size === 0) return map

    // 2. Tous les Document_Item en un seul appel
    const res = await axios.get(`${V1_BASE}/Document_Item`, {
      headers,
      params: { range: '0-999' },
    }).catch(() => ({ data: [] }))
    const allDocItems = Array.isArray(res.data) ? res.data : []

    // 3. Première association par actif — uniquement si le document est une image connue
    const assetDocMap = new Map()
    for (const di of allDocItems) {
      if (!di.itemtype || !di.items_id || !di.documents_id) continue
      const docId = Number(di.documents_id?.id ?? di.documents_id)
      if (!imageDocs.has(docId)) continue // ignore les non-images
      const key = `${di.itemtype}-${Number(di.items_id)}`
      if (!assetDocMap.has(key)) assetDocMap.set(key, docId)
    }

    // 4. Téléchargement parallèle des images (dans la même session ouverte)
    await Promise.all(
      assets.map(async (a) => {
        const key   = `${a.itemtype}-${a.id}`
        const docId = assetDocMap.get(key)
        if (!docId) return
        const url = await _downloadImageBlob(headers, docId)
        if (url) map.set(key, url)
      })
    )

    return map
  }).catch(() => new Map())
