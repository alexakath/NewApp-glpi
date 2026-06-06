import { useEffect, useState } from 'react'
import { getComputers } from '../../api/computers'
import { getMonitors }  from '../../api/monitors'
import { buildAssetImageMap } from '../../api/documents'

function useAssets() {
  const [computers, setComputers] = useState([])
  const [monitors,  setMonitors]  = useState([])
  const [imageMap,  setImageMap]  = useState(new Map())
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    Promise.all([getComputers(), getMonitors()])
      .then(([c, m]) => {
        setComputers(c)
        setMonitors(m)
        // Chargement des images en arrière-plan — la page s'affiche d'abord avec les icônes
        const assets = [
          ...c.map(x => ({ id: x.id, itemtype: 'Computer' })),
          ...m.map(x => ({ id: x.id, itemtype: 'Monitor'  })),
        ]
        buildAssetImageMap(assets).then(setImageMap)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { computers, monitors, imageMap, loading, error }
}

export default useAssets
