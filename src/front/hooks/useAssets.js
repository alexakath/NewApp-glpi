import { useEffect, useState } from 'react'
import { getAssets, ASSET_TYPE_KEYS } from '../../api/assets'
import { buildAssetImageMap } from '../../api/documents'

// Charge tous les types d'actifs déclarés dans ASSET_TYPES (voir api/assets.js).
// Ajouter un type au registre suffit à le faire apparaître ici automatiquement.
function useAssets() {
  const [assetsByType, setAssetsByType] = useState({})
  const [imageMap,     setImageMap]     = useState(new Map())
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  useEffect(() => {
    Promise.all(ASSET_TYPE_KEYS.map(t => getAssets(t).catch(() => [])))
      .then((lists) => {
        const byType = {}
        ASSET_TYPE_KEYS.forEach((t, i) => { byType[t] = lists[i] })
        setAssetsByType(byType)

        // Chargement des images en arrière-plan — la page s'affiche d'abord avec les icônes
        const flat = ASSET_TYPE_KEYS.flatMap(t => byType[t].map(x => ({ id: x.id, itemtype: t })))
        buildAssetImageMap(flat).then(setImageMap)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { assetsByType, imageMap, loading, error }
}

export default useAssets
