import { NavLink, Link } from 'react-router-dom'
import '../front.css'
import './FrontLayout.css'

function FrontLayout({ children }) {
  return (
    <div className="fl-shell">
      <nav className="fl-nav">
        <div className="fl-nav-left">
          <Link to="/front" className="fl-logo">NewApp</Link>
          <div className="fl-nav-links">
            <NavLink
              to="/front"
              end
              className={({ isActive }) => `fl-nav-link${isActive ? ' active' : ''}`}
            >
              Parc informatique
            </NavLink>
            <NavLink
              to="/front/tickets"
              className={({ isActive }) => `fl-nav-link${isActive ? ' active' : ''}`}
            >
              Tickets
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="fl-main">{children}</main>
    </div>
  )
}

export default FrontLayout
