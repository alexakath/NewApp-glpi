import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { isLoggedIn, logout } from './api/auth'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import TicketsPage from './pages/TicketsPage'
import TicketCostsPage from './pages/TicketCostsPage'
import ComputersPage from './pages/ComputersPage'
import MonitorsPage from './pages/MonitorsPage'
import LoginPage from './pages/LoginPage'
import TicketDetail from './components/TicketDetail'
import ComputerDetail from './components/ComputerDetail'
import MonitorDetail from './components/MonitorDetail'
import FrontApp from './front/FrontApp'
import './App.css'

function Layout() {
  const navigate = useNavigate()

  if (!isLoggedIn()) return <Navigate to="/login" replace />

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <Sidebar onLogout={handleLogout} />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/front/*"  element={<FrontApp />} />
      <Route element={<Layout />}>
        <Route path="/"                element={<DashboardPage />} />
        <Route path="/tickets"         element={<TicketsPage />} />
        <Route path="/tickets/:id"     element={<TicketDetail />} />
        <Route path="/tickets/costs"   element={<TicketCostsPage />} />
        <Route path="/computers"       element={<ComputersPage />} />
        <Route path="/computers/:id"   element={<ComputerDetail />} />
        <Route path="/monitors"        element={<MonitorsPage />} />
        <Route path="/monitors/:id"    element={<MonitorDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
