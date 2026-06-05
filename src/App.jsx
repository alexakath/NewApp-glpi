import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TicketsPage from './pages/TicketsPage'
import ComputersPage from './pages/ComputersPage'
import './App.css'

// Correspondance clé → composant de page
const PAGES = {
  tickets:   <TicketsPage />,
  computers: <ComputersPage />,
}

function App() {
  // Page affichée par défaut au chargement
  const [currentPage, setCurrentPage] = useState('tickets')

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="app-main">
        {PAGES[currentPage]}
      </main>
    </div>
  )
}

export default App
