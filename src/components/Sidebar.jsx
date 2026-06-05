import './Sidebar.css'

const MENU = [
  { key: 'tickets',   label: 'Tickets',      icon: '🎫' },
  { key: 'computers', label: 'Ordinateurs',  icon: '🖥️' },
]

function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">New<span>App</span></div>
      <nav>
        <div className="sidebar-section-label">Modules</div>
        <ul className="sidebar-menu">
          {MENU.map((item) => (
            <li key={item.key}>
              <button
                className={`sidebar-item ${currentPage === item.key ? 'active' : ''}`}
                onClick={() => onNavigate(item.key)}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
