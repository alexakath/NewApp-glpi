// Icônes SVG partagées du front-office
// Utilisation : import { IcoSearch, IcoComputer, ... } from '../icons'

// Attributs communs à tous les SVG
const p = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' }

export const IcoComputer = () => (
  <svg {...p} strokeWidth="1.75">
    <rect x="3" y="3" width="18" height="13" rx="2"/>
    <path d="M9 17.25v1.007a2 2 0 01-.586 1.414L7.5 21h9l-.914-.914A2 2 0 0115 18.257V17.25"/>
    <line x1="9" y1="17" x2="15" y2="17"/>
  </svg>
)

export const IcoMonitor = () => (
  <svg {...p} strokeWidth="1.75">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
)

export const IcoSearch = () => (
  <svg {...p} strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

export const IcoFilter = () => (
  <svg {...p} strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
)

export const IcoX = () => (
  <svg {...p} strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

export const IcoRefresh = () => (
  <svg {...p} strokeWidth="2">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
  </svg>
)

export const IcoEmpty = () => (
  <svg {...p} strokeWidth="1.75">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 15s1.5-2 4-2 4 2 4 2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
)

export const IcoPin = () => (
  <svg {...p} strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

export const IcoHash = () => (
  <svg {...p} strokeWidth="2">
    <line x1="4" y1="9" x2="20" y2="9"/>
    <line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/>
    <line x1="16" y1="3" x2="14" y2="21"/>
  </svg>
)

export const IcoBack = () => (
  <svg {...p} strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
)
