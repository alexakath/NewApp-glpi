# Récapitulatif du projet — NewApp (interface GLPI)

> État au 2026-06-08, branche `j1-back/import`.
> Application React (Vite) qui vient se brancher sur une instance GLPI via son
> API REST (v2 HL `/api.php/v2.3` en priorité, v1 `/apirest.php` en complément
> pour ce que la v2 n'expose pas) — back-office interne + portail "front" pour
> les utilisateurs métier.

---

## 1. Où on en est

| Domaine | État |
|---|---|
| Authentification (OAuth2 ROPC + session GLPI) | ✅ fonctionnel |
| Dashboard | ✅ fonctionnel |
| Tickets (liste, détail, coûts, statuts) | ✅ fonctionnel |
| Ordinateurs / Moniteurs (liste, détail) | ✅ fonctionnel |
| Import CSV (assets, tickets, coûts, images) | ✅ fonctionnel |
| **Réinitialisation des données (corbeille → purge)** | ✅ fonctionnel — **vient d'être terminé et corrigé** (voir §4) |
| Portail "front" (utilisateurs métier) | ✅ fonctionnel — accueil, tickets, formulaire de création, détail des actifs |
| Documentation (`doc/`) | ✅ couvre admin, parc, assistance, config, architecture API, helpers GLPI |

Travail en cours / non committé sur la branche actuelle :
- `src/api/reset/` (nouveau module), `ResetPage`, `ResetModuleItem`,
  modifications de `App.jsx`, `Sidebar.jsx`, `glpi.js` — **prêt à committer**.

---

## 2. Grandes étapes réalisées (historique)

D'après l'historique Git (`j1-back/import` et branches mergées) :

1. **Initialisation** — squelette Vite + React Router, login, premières pages
   (tickets, ordinateurs).
2. **Dashboard** — vue d'ensemble simple du parc.
3. **Coût des tickets** — sous-module `Cost` lié aux tickets (lecture + ajout).
4. **CRUD Tickets** — création / modification / suppression, éléments associés
   (`Item_Ticket` via API v1, la v2 ne l'exposant pas).
5. **Statuts & filtres** — gestion des statuts d'ordinateurs/tickets.
6. **Import CSV** — détection de modules, validation, création en cascade
   (assets → modèles/fabricants/statuts/localisations → ordinateurs/moniteurs
   → tickets → coûts), puis **import avec images** (upload + liaison
   `Document_Item` via API v1).
7. **Généricité** — refactor des pages assets vers une logique commune
   (`useAssets`, configs partagées) côté front comme back-office.
8. **Réinitialisation des données** *(dernier chantier, objet du §4)*.

---

## 3. Structure exacte du projet (dossier `src/`)

```
src/
├── App.jsx                          # Routes principales + layout authentifié
├── App.css
├── index.css
├── main.jsx
│
├── assets/                          # images statiques (logo, icônes)
│
├── api/                             # Couche d'accès à l'API GLPI
│   ├── glpi.js                      # Coeur : helpers v2 (Bearer OAuth2) + v1 (session Basic)
│   ├── auth.js                      # Login, refresh token, logout
│   ├── assets.js                    # Statuts, localisations, fabricants, modèles…
│   ├── computers.js                 # CRUD Ordinateurs
│   ├── monitors.js                  # CRUD Moniteurs
│   ├── tickets.js                   # CRUD Tickets
│   ├── costs.js                     # Coûts de tickets (Cost)
│   ├── documents.js                 # Upload / liaison de documents (images)
│   │
│   ├── import/                      # Module d'import CSV
│   │   ├── modulesConfig.js         #   Registre des modules importables, ordre, dépendances
│   │   ├── detectModules.js         #   Détection du type de CSV
│   │   ├── validateImport.js        #   Validation des lignes avant import
│   │   └── importService.js         #   Création en cascade dans GLPI
│   │
│   └── reset/                       # Module de réinitialisation (NOUVEAU)
│       ├── resetConfig.js           #   Registre des modules réinitialisables, protection, ordre
│       └── resetService.js          #   Logique corbeille (trash) + purge définitive
│
├── components/                      # Composants partagés du back-office
│   ├── Sidebar.jsx / .css           # Navigation latérale (groupes Parc / Assistance / Données)
│   ├── TicketDetail.jsx / .css
│   ├── ComputerDetail.jsx / .css
│   ├── MonitorDetail.jsx / .css
│   ├── ResetModuleItem.jsx / .css   # Ligne de module dans la page de réinitialisation (NOUVEAU)
│   └── TestApi.jsx                  # Page de test technique de l'API
│
├── pages/                           # Pages du back-office (sous Layout authentifié)
│   ├── LoginPage.jsx / .css
│   ├── DashboardPage.jsx / .css
│   ├── TicketsPage.jsx / .css
│   ├── TicketCostsPage.jsx / .css
│   ├── ComputersPage.jsx / .css
│   ├── MonitorsPage.jsx / .css
│   ├── ImportPage.jsx / .css
│   └── ResetPage.jsx / .css         # Page de réinitialisation en 2 temps (NOUVEAU)
│
└── front/                           # Portail "front" — utilisateurs métier (hors back-office)
    ├── FrontApp.jsx                 # Routes du portail (/front/*)
    ├── front.css
    ├── icons.jsx
    ├── hooks/
    │   └── useAssets.js             #   Hook générique de récupération d'actifs
    ├── components/
    │   └── FrontLayout.jsx / .css
    └── pages/
        ├── FrontHomePage.jsx / .css
        ├── FrontTicketsPage.jsx / .css
        ├── FrontTicketForm.jsx / .css
        ├── FrontAssetDetail.jsx
        ├── FrontComputerDetail.jsx
        ├── FrontMonitorDetail.jsx
        └── FrontDetail.css
```

### Routes principales (`App.jsx`)

| Route | Page |
|---|---|
| `/login` | `LoginPage` |
| `/front/*` | `FrontApp` (portail séparé) |
| `/` | `DashboardPage` |
| `/tickets`, `/tickets/:id`, `/tickets/costs` | Tickets |
| `/computers`, `/computers/:id` | Ordinateurs |
| `/monitors`, `/monitors/:id` | Moniteurs |
| `/import` | `ImportPage` |
| `/reset` | `ResetPage` *(nouveau)* |

### Documentation (`doc/`)

`administration.md`, `api-architecture.md`, `assistance.md`, `config.md`,
`coutTicket.md`, `flux.md`, `gestion.md`, `parc.md`, `stucture.md`,
`GLPI_HELPERS.md` — couvrent respectivement la gestion des droits, l'archi
de la couche API, l'assistance/tickets, la configuration GLPI, les coûts,
les flux fonctionnels, la gestion globale, le parc, la structure du code et
les helpers d'accès à GLPI.

---

## 4. Dernier chantier : Réinitialisation des données (`/reset`)

### Objectif
Permettre de "remettre GLPI à zéro" en supprimant uniquement les données
**créées par cette application** (via import ou usage), sans toucher à ce qui
préexistait à l'installation : les comptes système GLPI (`glpi`, `post-only`,
`tech`, `normal`, `glpi-system`) et l'entité racine.

### Flux retenu — en deux temps, calqué sur la corbeille native de GLPI
1. **Étape 1 — Mise à la corbeille** (`is_deleted = 1`, réversible) : l'utilisateur
   choisit les modules, l'app met les éléments correspondants à la corbeille.
   Les types qui n'ont pas de corbeille côté GLPI (listes déroulantes : statuts,
   localisations, fabricants, modèles) sont signalés et passent directement à
   l'étape 2.
2. **Étape 2 — Suppression définitive** (`force_purge = true`, irréversible,
   confirmation par saisie de "SUPPRIMER") : purge les éléments de la corbeille
   (ou suppression directe pour les types sans corbeille).

### Fichiers livrés
- `src/api/reset/resetConfig.js` — registre des 10 modules réinitialisables
  (label, couleur, chemin API, ordre de suppression, protection, `trashable`)
- `src/api/reset/resetService.js` — `getResetStats`, `trashModule`, `purgeModule`,
  `trashAllSelected`, `purgeAllSelected`
- `src/components/ResetModuleItem.jsx/.css` — ligne de module avec compteur,
  badge de statut, indicateur "pas de corbeille"
- `src/pages/ResetPage.jsx/.css` — page en 2 étapes avec indicateur de
  progression, bandeaux contextuels (info / danger / succès), modales de
  confirmation différenciées (corbeille = orange/réversible, purge = rouge +
  saisie obligatoire)
- Intégration : route `/reset` dans `App.jsx`, entrée de menu dans `Sidebar.jsx`

### Bug détecté et corrigé pendant les tests
En testant le flux complet, les éléments restaient visibles dans la corbeille
GLPI malgré un message de succès. Diagnostic confirmé par appels directs à
l'API : **l'API v2 HL de GLPI ignore silencieusement le paramètre `force_purge`
sur DELETE** (elle réapplique juste la mise à la corbeille, sans purger). Seule
l'**API v1 legacy** honore réellement ce paramètre et supprime définitivement.

**Correctif** : `removeItem()` dans `resetService.js` route désormais
*systématiquement* les opérations de purge vers l'API v1 (`deleteV1Item`), en
dérivant le nom d'itemtype v1 à partir du dernier segment du chemin v2
(`'Assets/Computer'` → `'Computer'`). La mise à la corbeille (sans
`force_purge`) continue d'utiliser les chemins d'origine, qui fonctionnaient
déjà correctement.

Le correctif a été vérifié par appels API directs sur Ticket, Monitor, Computer
et User, et l'instance GLPI de test a été nettoyée des éléments restés bloqués
en corbeille suite au bug initial.

### Prochaine étape suggérée
Committer le module `reset` (actuellement non tracké) et re-tester le flux de
bout en bout après un nouvel import, pour valider visuellement les deux étapes
sur des données fraîches.
