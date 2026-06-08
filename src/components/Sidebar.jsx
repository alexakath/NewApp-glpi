import { NavLink } from 'react-router-dom'
import './Sidebar.css'

const SVG = ({ children }) => (
  <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const MENU_GROUPS = [
  {
    module: "Vue d'ensemble",
    items: [
      {
        to: '/', label: 'Tableau de bord', end: true,
        icon: <SVG><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></SVG>,
      },
    ],
  },
  {
    module: 'Assistance',
    items: [
      {
        to: '/tickets', label: 'Tickets',
        icon: <SVG><path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12"/><circle cx="3.75" cy="6.75" r="0.375" fill="currentColor" stroke="none"/><circle cx="3.75" cy="12" r="0.375" fill="currentColor" stroke="none"/><circle cx="3.75" cy="17.25" r="0.375" fill="currentColor" stroke="none"/></SVG>,
      },
      {
        to: '/tickets/costs', label: 'Coûts tickets',
        icon: <SVG><path d="M9 7h6M9 11h6M9 15h4"/><rect x="3" y="3" width="18" height="18" rx="2"/></SVG>,
      },
    ],
  },
  {
    module: 'Parc',
    items: [
      {
        to: '/computers', label: 'Ordinateurs',
        icon: <SVG><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M9 17.25v1.007a2 2 0 01-.586 1.414L7.5 21h9l-.914-.914A2 2 0 0115 18.257V17.25"/><line x1="9" y1="17" x2="15" y2="17"/></SVG>,
      },
      {
        to: '/monitors', label: 'Moniteurs',
        icon: <SVG><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></SVG>,
      },
    ],
  },
  {
    module: 'Données',
    items: [
      {
        to: '/import', label: 'Import CSV',
        icon: <SVG><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></SVG>,
      },
      {
        to: '/reset', label: 'Réinitialisation',
        icon: <SVG><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></SVG>,
      },
    ],
  },
]

function Sidebar({ onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-name">NewApp</span>
        <span className="sidebar-brand-sub">GLPI Dashboard</span>
      </div>

      <nav className="sidebar-nav">
        {MENU_GROUPS.map((group) => (
          <div className="sidebar-group" key={group.module}>
            <span className="sidebar-group-label">{group.module}</span>
            <ul className="sidebar-menu">
              {group.items.map(({ to, label, icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                  >
                    {icon}
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="sidebar-user-role">Administrateur</span>
          <span className="sidebar-user-ver">GLPI 11.0.7</span>
        </div>
        <button className="sidebar-logout" onClick={onLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
