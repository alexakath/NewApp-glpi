import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { isLoggedIn, login } from '../api/auth'
import FrontLayout from './components/FrontLayout'
import FrontHomePage from './pages/FrontHomePage'
import FrontComputerDetail from './pages/FrontComputerDetail'
import FrontMonitorDetail from './pages/FrontMonitorDetail'
import FrontTicketsPage from './pages/FrontTicketsPage'
import FrontTicketForm from './pages/FrontTicketForm'

const DEFAULT_CODE = import.meta.env.VITE_DEFAULT_CODE ?? ''

function FrontApp() {
  const [ready, setReady] = useState(isLoggedIn())

  // Authentification silencieuse — l'utilisateur ne voit pas de login
  useEffect(() => {
    if (isLoggedIn()) { setReady(true); return }
    login(DEFAULT_CODE)
      .then(() => setReady(true))
      .catch(() => setReady(true)) // on laisse les pages gérer l'erreur API
  }, [])

  if (!ready) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280', fontFamily: 'sans-serif' }}>Chargement…</div>
  }

  return (
    <FrontLayout>
      <Routes>
        <Route index                    element={<FrontHomePage />} />
        <Route path="computers/:id"     element={<FrontComputerDetail />} />
        <Route path="monitors/:id"      element={<FrontMonitorDetail />} />
        {/* Routes tickets — "new" avant ":id/edit" pour éviter toute ambiguïté */}
        <Route path="tickets"           element={<FrontTicketsPage />} />
        <Route path="tickets/new"       element={<FrontTicketForm />} />
        <Route path="tickets/:id/edit"  element={<FrontTicketForm />} />
        <Route path="*"                 element={<Navigate to="/front" replace />} />
      </Routes>
    </FrontLayout>
  )
}

export default FrontApp
