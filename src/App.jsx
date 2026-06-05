import { useState } from 'react'
import { isLoggedIn, logout } from './api/auth'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import TicketsPage from './pages/TicketsPage'
import ComputersPage from './pages/ComputersPage'
import MonitorsPage from './pages/MonitorsPage'
import LoginPage from './pages/LoginPage'
import './App.css'

const PAGES = {
  dashboard: <DashboardPage />,
  tickets:   <TicketsPage />,
  computers: <ComputersPage />,
  monitors:  <MonitorsPage />,
}

function App() {
  const [authenticated, setAuthenticated] = useState(isLoggedIn)
  const [currentPage, setCurrentPage]     = useState('dashboard')

  const handleLogin  = () => setAuthenticated(true)
  const handleLogout = () => { logout(); setAuthenticated(false) }

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />
      <main className="app-main">
        {PAGES[currentPage]}
      </main>
    </div>
  )
}

export default App
