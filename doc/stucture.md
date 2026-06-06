NewApp-glpi/
│
├── doc/                          ← Documentation (fichiers Markdown)
│   ├── coutTicket.md
│   └── ...
│
├── public/
│   └── favicon.svg
│
├── src/
│   │
│   ├── api/                      ← Couche API — communication avec GLPI
│   │   ├── auth.js               ← OAuth2, login, refresh token
│   │   ├── glpi.js               ← Client Axios de base
│   │   ├── tickets.js            ← Tickets + équipes
│   │   ├── computers.js          ← Ordinateurs + disques
│   │   ├── monitors.js           ← Moniteurs
│   │   └── costs.js              ← Coûts des tickets
│   │
│   ├── components/               ← Composants partagés du backoffice
│   │   ├── Sidebar.jsx / .css    ← Menu de navigation
│   │   ├── TicketDetail.jsx / .css
│   │   ├── ComputerDetail.jsx / .css
│   │   └── MonitorDetail.jsx / .css
│   │
│   ├── pages/                    ← Pages du backoffice
│   │   ├── LoginPage.jsx / .css
│   │   ├── DashboardPage.jsx / .css
│   │   ├── TicketsPage.jsx / .css
│   │   ├── TicketCostsPage.jsx / .css
│   │   ├── ComputersPage.jsx / .css
│   │   └── MonitorsPage.jsx / .css
│   │
│   ├── front/                    ← Front-office (/front)
│   │   ├── icons.jsx             ← Tous les SVG partagés du front
│   │   ├── front.css             ← Variables CSS + DM Sans
│   │   ├── FrontApp.jsx          ← Routes + auth silencieuse
│   │   ├── components/
│   │   │   ├── FrontLayout.jsx   ← Navbar blanche + conteneur
│   │   │   └── FrontLayout.css
│   │   ├── hooks/
│   │   │   └── useAssets.js      ← Chargement computers + monitors
│   │   └── pages/
│   │       ├── FrontHomePage.jsx / .css   ← Liste avec filtres + cartes
│   │       ├── FrontComputerDetail.jsx    ← Fiche ordinateur
│   │       ├── FrontMonitorDetail.jsx     ← Fiche moniteur
│   │       └── FrontDetail.css            ← CSS partagé des fiches
│   │
│   ├── App.jsx                   ← Routeur principal (back + front)
│   ├── App.css                   ← Layout backoffice
│   ├── index.css                 ← Variables CSS globales + typo
│   └── main.jsx                  ← Point d'entrée React
│
├── .env                          ← Credentials GLPI (non versionné)
├── vite.config.js                ← Config Vite + proxy GLPI
└── package.json
