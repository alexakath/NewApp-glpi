import { useState } from 'react'
import { isLoggedIn, logout } from './api/auth'
import Sidebar from './components/Sidebar'
import TicketsPage from './pages/TicketsPage'
import ComputersPage from './pages/ComputersPage'
import LoginPage from './pages/LoginPage'
import './App.css'

const PAGES = {
  tickets:   <TicketsPage />,
  computers: <ComputersPage />,
}

function App() {
  const [authenticated, setAuthenticated] = useState(isLoggedIn)
  const [currentPage, setCurrentPage]     = useState('tickets')

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
