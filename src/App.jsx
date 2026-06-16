import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { isLoggedIn, logout } from './api/auth'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import TicketsPage from './pages/TicketsPage'
import TicketCostsPage from './pages/TicketCostsPage'
import ComputersPage from './pages/ComputersPage'
import MonitorsPage from './pages/MonitorsPage'
import PhonesPage from './pages/PhonesPage'
import LoginPage from './pages/LoginPage'
import TicketDetail from './components/TicketDetail'
import ComputerDetail from './components/ComputerDetail'
import MonitorDetail from './components/MonitorDetail'
import PhoneDetail from './components/PhoneDetail'
import ImportPage from './pages/ImportPage'
import ResetPage from './pages/ResetPage'
import TestSQLitePage from './pages/TestSQLitePage'
import TestKanbanPage from './pages/TestKanbanPage'
import FrontApp from './front/FrontApp'
import ImportMovementsPage   from './pages/ImportMovementsPage'
import TicketCostElementPage from './pages/TicketCostElementPage'
import TicketCostDetailPage  from './pages/TicketCostDetailPage'
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
        <Route path="/tickets/costs"                          element={<TicketCostsPage />} />
        <Route path="/tickets/costs/type/:itemtype"           element={<TicketCostElementPage />} />
        <Route path="/tickets/costs/item/:itemtype/:id"       element={<TicketCostDetailPage />} />
        <Route path="/computers"       element={<ComputersPage />} />
        <Route path="/computers/:id"   element={<ComputerDetail />} />
        <Route path="/monitors"        element={<MonitorsPage />} />
        <Route path="/phones"        element={<PhonesPage />} />
        <Route path="/monitors/:id"    element={<MonitorDetail />} />
        <Route path="/phones/:id"    element={<PhoneDetail />} />
        <Route path="/import"           element={<ImportPage />} />
        <Route path="/import-movements" element={<ImportMovementsPage />} />
        <Route path="/reset"           element={<ResetPage />} />
        <Route path="/test-sqlite"     element={<TestSQLitePage />} />
        <Route path="/test-kanban"     element={<TestKanbanPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
