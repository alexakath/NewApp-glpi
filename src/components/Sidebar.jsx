import './Sidebar.css'

function IconTickets() {
  return (
    <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12" />
      <circle cx="3.75" cy="6.75"  r="0.375" fill="currentColor" stroke="none" />
      <circle cx="3.75" cy="12"    r="0.375" fill="currentColor" stroke="none" />
      <circle cx="3.75" cy="17.25" r="0.375" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconComputer() {
  return (
    <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="13" rx="2" />
      <path d="M9 17.25v1.007a2 2 0 01-.586 1.414L7.5 21h9l-.914-.914A2 2 0 0115 18.257V17.25" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

const MENU_GROUPS = [
  {
    module: 'Assistance',
    items: [
      { key: 'tickets', label: 'Tickets', Icon: IconTickets },
    ],
  },
  {
    module: 'Parc',
    items: [
      { key: 'computers', label: 'Ordinateurs', Icon: IconComputer },
    ],
  },
]

function Sidebar({ currentPage, onNavigate, onLogout }) {
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
              {group.items.map(({ key, label, Icon }) => (
                <li key={key}>
                  <button
                    className={`sidebar-item${currentPage === key ? ' active' : ''}`}
                    onClick={() => onNavigate(key)}
                  >
                    <Icon />
                    <span>{label}</span>
                  </button>
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
          <IconLogout />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
