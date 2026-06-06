import { useEffect, useState } from 'react'
import { getComputers } from '../../api/computers'
import { getMonitors }  from '../../api/monitors'

function useAssets() {
  const [computers, setComputers] = useState([])
  const [monitors,  setMonitors]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    Promise.all([getComputers(), getMonitors()])
      .then(([c, m]) => { setComputers(c); setMonitors(m) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { computers, monitors, loading, error }
}

export default useAssets
