import { useEffect, useState } from 'react'
import axios from 'axios'
import { initSession, getHeaders } from '../api/glpi'

const BASE_URL = import.meta.env.VITE_GLPI_URL

function TestApi() {
  const [tickets, setTickets] = useState(null)
  const [computers, setComputers] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionToken = await initSession()

        const ticketsRes = await axios.get(`${BASE_URL}/Ticket`, {
          headers: getHeaders(sessionToken)
        })

        const computersRes = await axios.get(`${BASE_URL}/Computer`, {
          headers: getHeaders(sessionToken)
        })

        setTickets(ticketsRes.data)
        setComputers(computersRes.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (error) return <p>Erreur : {error}</p>
  if (loading) return <p>Chargement des données GLPI...</p>

  return (
    <div>
      <h2>Tickets</h2>
      <pre>{JSON.stringify(tickets, null, 2)}</pre>

      <h2>Ordinateurs</h2>
      <pre>{JSON.stringify(computers, null, 2)}</pre>
    </div>
  )
}

export default TestApi
