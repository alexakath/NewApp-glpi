# Récapitulatif du projet — NewApp (interface GLPI)

> État au 2026-06-09, branche `generalisation-import` (1 commit en avance sur `main`).
> Application React (Vite) qui se branche sur une instance GLPI via son API REST —
> API v2 HL (`/api.php/v2.3`, Bearer OAuth2 ROPC) en priorité, API v1 legacy
> (`/apirest.php`, session Basic + App-Token) en complément pour ce que la v2
> n'expose pas (purge forcée, Item_Ticket, upload Document).
> Deux espaces distincts : **back-office** (gestion interne) + **portail front**
> (utilisateurs métier).

---

## 1. Où on en est

| Domaine | État |
|---|---|
| Authentification (OAuth2 ROPC + session GLPI v1) | ✅ fonctionnel |
| Dashboard | ✅ fonctionnel |
| Tickets — liste, détail, coûts, création/modification | ✅ fonctionnel |
| Ordinateurs / Moniteurs — liste, détail | ✅ fonctionnel |
| Import CSV (assets, tickets, coûts, images ZIP) | ✅ fonctionnel |
| Import — architecture généralisée (KNOWN_ITEM_TYPES) | ✅ refactorisé — **dernier chantier** (voir §5) |
| Réinitialisation des données (corbeille → purge) | ✅ fonctionnel + bugs corrigés (voir §4) |
| Portail front (accueil, tickets, formulaire, détail actifs) | ✅ fonctionnel — bug FrontTicketForm corrigé |
| Documentation (`doc/`) | ✅ couvre admin, parc, assistance, config, architecture API, helpers GLPI |

Branche courante `generalisation-import` : travail committé, propre.

---

## 2. Grandes étapes réalisées (historique Git)

1. **Initialisation** — squelette Vite + React Router, login, premières pages
   (tickets, ordinateurs).
2. **Dashboard** — vue d'ensemble simple du parc.
3. **Coût des tickets** — sous-module `Cost` lié aux tickets (lecture + ajout).
4. **CRUD Tickets** — création / modification / suppression, éléments associés
   (`Item_Ticket` via API v1 — la v2 ne l'exposant pas).
5. **Statuts & filtres** — gestion des statuts d'ordinateurs/tickets.
6. **Import CSV** — détection de modules, validation, création en cascade
   (assets → modèles/fabricants/statuts/localisations → ordinateurs/moniteurs
   → tickets → coûts), puis **import avec images** (upload + liaison
   `Document_Item` via API v1).
7. **Généricité front** — refactor des pages assets vers une logique commune
   (`useAssets`, configs `ASSET_TYPES` partagées) côté front comme back-office.
8. **Réinitialisation des données** — module `/reset` en deux temps
   (corbeille réversible puis purge définitive), incluant correction de deux
   bugs critiques GLPI (voir §4).
9. **Généricité import** — refactoring de `modulesConfig.js` / `importService.js`
   pour que l'ajout d'un type d'actif ne nécessite plus qu'une entrée dans
   `KNOWN_ITEM_TYPES` (voir §5).

---

## 3. Structure exacte du projet (`src/`)

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
│   ├── glpi.js                      # Cœur : helpers v2 (Bearer OAuth2) + v1 (session Basic)
│   ├── auth.js                      # Login, refresh token, logout
│   ├── assets.js                    # Registre ASSET_TYPES + statuts, localisations, fabricants, modèles
│   ├── computers.js                 # CRUD Ordinateurs
│   ├── monitors.js                  # CRUD Moniteurs
│   ├── tickets.js                   # CRUD Tickets + constantes STATUS/TYPE/URGENCY
│   ├── costs.js                     # Coûts de tickets (Cost)
│   ├── documents.js                 # Upload / liaison de documents (images)
│   │
│   ├── import/                      # Module d'import CSV
│   │   ├── modulesConfig.js         #   SOURCE DE VÉRITÉ : KNOWN_ITEM_TYPES + config dérivée
│   │   ├── detectModules.js         #   Détection du type de CSV par scoring d'en-têtes
│   │   ├── validateImport.js        #   Validation des colonnes obligatoires
│   │   └── importService.js         #   Création en cascade dans GLPI (fonctions génériques)
│   │
│   └── reset/                       # Module de réinitialisation
│       ├── resetConfig.js           #   Registre des 10 modules réinitialisables + protection
│       └── resetService.js          #   getResetStats, trashModule, purgeModule, *AllSelected
│
├── components/                      # Composants partagés du back-office
│   ├── Sidebar.jsx / .css           # Navigation (groupes Parc / Assistance / Données)
│   ├── TicketDetail.jsx / .css
│   ├── ComputerDetail.jsx / .css
│   ├── MonitorDetail.jsx / .css
│   ├── ResetModuleItem.jsx / .css   # Ligne de module (compteur, badge statut, "pas de corbeille")
│   └── TestApi.jsx                  # Page de test technique de l'API
│
├── pages/                           # Pages du back-office (sous layout authentifié)
│   ├── LoginPage.jsx / .css
│   ├── DashboardPage.jsx / .css
│   ├── TicketsPage.jsx / .css
│   ├── TicketCostsPage.jsx / .css
│   ├── ComputersPage.jsx / .css
│   ├── MonitorsPage.jsx / .css
│   ├── ImportPage.jsx / .css
│   └── ResetPage.jsx / .css         # Page de réinitialisation en 2 étapes + barre de progression
│
└── front/                           # Portail "front" — utilisateurs métier
    ├── FrontApp.jsx                 # Routes du portail (/front/*)
    ├── front.css
    ├── icons.jsx
    ├── hooks/
    │   └── useAssets.js             #   Hook — retourne { assetsByType, imageMap, loading, error }
    ├── components/
    │   └── FrontLayout.jsx / .css
    └── pages/
        ├── FrontHomePage.jsx / .css
        ├── FrontTicketsPage.jsx / .css
        ├── FrontTicketForm.jsx / .css  # Création + modification de ticket avec éléments associés
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
| `/reset` | `ResetPage` |

### Routes portail front (`FrontApp.jsx`)

| Route | Page |
|---|---|
| `/front` | `FrontHomePage` — tableau de bord actifs + tickets récents |
| `/front/tickets` | `FrontTicketsPage` — liste avec recherche/filtres |
| `/front/tickets/new` | `FrontTicketForm` — création |
| `/front/tickets/:id/edit` | `FrontTicketForm` — modification |
| `/front/assets/:type/:id` | `FrontAssetDetail` → `FrontComputerDetail` / `FrontMonitorDetail` |

### Documentation (`doc/`)

`administration.md`, `api-architecture.md`, `assistance.md`, `config.md`,
`coutTicket.md`, `flux.md`, `gestion.md`, `parc.md`, `stucture.md`,
`GLPI_HELPERS.md` — couvrent respectivement la gestion des droits,
l'architecture de la couche API, l'assistance/tickets, la configuration GLPI,
les coûts, les flux fonctionnels, la gestion globale, le parc, la structure
du code et les helpers d'accès à GLPI.

---

## 4. Réinitialisation des données (`/reset`)

### Objectif
Remettre GLPI à zéro en supprimant uniquement les données créées par
l'application (import ou usage), sans toucher à ce qui préexistait : comptes
système GLPI (`glpi`, `post-only`, `tech`, `normal`, `glpi-system`) et entité
racine.

### Flux en deux temps
1. **Étape 1 — Mise à la corbeille** (`is_deleted = 1`, réversible) : l'utilisateur
   choisit les modules ; les types sans corbeille GLPI (statuts, localisations,
   fabricants, modèles) sont signalés et passent directement à l'étape 2.
2. **Étape 2 — Suppression définitive** (`force_purge = true`, irréversible,
   confirmation par saisie de "SUPPRIMER") : purge les éléments de la corbeille,
   ou suppression directe pour les types sans corbeille.

### Fichiers
- `src/api/reset/resetConfig.js` — 10 modules réinitialisables (tickets,
  computers, monitors, users, images/documents, states, locations, manufacturers,
  computerModels, monitorModels), chacun avec label, couleur, chemin API, ordre
  de suppression, protection, flag `trashable`
- `src/api/reset/resetService.js` — `getResetStats`, `trashModule`,
  `purgeModule`, `trashAllSelected(selectedModules, onProgress)`,
  `purgeAllSelected(selectedModules, onProgress)` — le callback `onProgress`
  alimente la barre de progression en temps réel
- `src/components/ResetModuleItem.jsx/.css` — ligne de module : compteur
  d'éléments actifs/en corbeille, badge de statut (loading/success/error),
  indicateur "pas de corbeille"
- `src/pages/ResetPage.jsx/.css` — design "soft" (CSS custom properties,
  palette pastel, progression visuelle neutre → orange/réversible → rouge/
  irréversible), barre de progression temps réel, modales différenciées

### Bugs détectés et corrigés

**Bug 1 — `force_purge` ignoré par l'API v2 GLPI**
L'API v2 HL ignore silencieusement ce paramètre sur DELETE : elle réapplique
le soft-delete sans purger (vérifié par appels directs, l'item reste
`is_deleted: true`). Seule l'API v1 legacy l'honore.
Correctif : `removeItem()` dans `resetService.js` route systématiquement les
purges vers l'API v1 (`deleteV1Item`), en dérivant le nom d'itemtype v1 du
dernier segment du chemin v2 (`'Assets/Computer'` → `'Computer'`).

**Bug 2 — L'API v1 filtre les résultats par `is_deleted`**
Contrairement à la v2 (qui renvoie tout et utilise `is_deleted` comme simple
indicateur), la v1 filtre par défaut sur `is_deleted = 0`. Pour les modules
v1 + trashable (Document/images), une requête sans paramètre renvoie une liste
vide quand tous les éléments sont déjà en corbeille.
Correctif : `fetchModuleItems()` interroge les deux états (`is_deleted=0` et
`is_deleted=1`) en parallèle et fusionne les résultats pour les modules
`isV1 && trashable`.

---

## 5. Import — architecture généralisée (`KNOWN_ITEM_TYPES`)

### Problème
L'import CSV prenait en charge Ordinateur et Moniteur mais le code était
dupliqué et hardcodé à 10 endroits distincts : 4 fonctions d'import séparées
(`importComputers`, `importMonitors`, `importComputerModels`,
`importMonitorModels`), des strings littérales `'computer'`/`'monitor'`
dispersées, et les tableaux de config (`SUB_MODULE_META`, `SUB_MODULE_ORDER`,
`SUB_MODULE_DEPS`, `expandModule`) maintenus manuellement en parallèle.

### Solution — `KNOWN_ITEM_TYPES` comme source de vérité unique

`src/api/import/modulesConfig.js` déclare maintenant chaque type d'actif avec
tous ses paramètres :

```js
export const KNOWN_ITEM_TYPES = {
  Computer: {
    csvType: 'computer',           // valeur CSV (insensible à la casse)
    glpiPath: 'Assets/Computer',
    modelGlpiPath: 'Dropdowns/ComputerModel',
    modelModule: 'computerModels',
    registryModule: 'computers',
    label: 'Ordinateurs',
    modelLabel: 'Modèles Ordinateurs',
    color: '#3b82f6',  modelColor: '#0ea5e9',
    icon: 'ti-device-laptop',  modelIcon: 'ti-cpu',
  },
  Monitor: { ... },
  // ← ajouter un type ici = c'est tout
}
```

`SUB_MODULE_META`, `SUB_MODULE_ORDER`, `SUB_MODULE_DEPS` et `expandModule()`
sont **dérivés automatiquement** via `Object.values(KNOWN_ITEM_TYPES)` — aucune
donnée dupliquée.

Dans `src/api/import/importService.js`, les 4 fonctions hardcodées sont
remplacées par 2 fonctions génériques paramétrées par `itemTypeCfg` :
- `importAssetModels(itemTypeCfg, rows, registry, onProgress)` — importe les
  modèles du type (filtre les lignes par `csvType`, upsert vers `modelGlpiPath`)
- `importAssetType(itemTypeCfg, itemType, rows, registry, onProgress, { isLast })`
  — importe les actifs du type (upsert, mapping des champs FK via registre,
  écriture dans `registryModule` + `'assets'`)

`importImages` itère sur `Object.entries(KNOWN_ITEM_TYPES)` pour construire la
map actif-nom→id au lieu des deux requêtes Computer/Monitor en dur.

Le routeur `SUB_MODULE_IMPORTERS` est entièrement dérivé :
```js
const SUB_MODULE_IMPORTERS = {
  states, locations, manufacturers,  // statiques
  ...Object.fromEntries(_assetTypeEntries.map(([, t]) => [t.modelModule, ...])),
  users,
  ...Object.fromEntries(_assetTypeEntries.map(([type, t], i) => [t.registryModule, ...])),
  tickets, ticketCosts,              // statiques
}
```

### Résultat
Ajouter `Printer`, `Peripheral`, `NetworkEquipment` ou `Phone` (qui existent
déjà dans `ASSET_TYPES` côté front) ne nécessite plus qu'**une seule entrée**
dans `KNOWN_ITEM_TYPES` — zero autre fichier à toucher.

---

## 6. Points techniques notables

### Double API GLPI
| Besoin | API utilisée | Raison |
|---|---|---|
| Lecture/création/mise à jour d'assets, tickets… | v2 HL (`/api.php/v2.3`) | Interface REST standard |
| Purge forcée (`force_purge=true`) | v1 (`/apirest.php`) | La v2 ignore silencieusement ce paramètre |
| Création de liens `Item_Ticket` | v1 | Non exposé en v2 |
| Upload et liaison de documents | v1 | Non exposé en v2 |

`glpi.js` expose `withV1Session(fn)` pour ouvrir/fermer la session v1 autour
d'un bloc asynchrone, limitant le nombre d'initSession/killSession.

### Hook `useAssets` (portail front)
Retourne `{ assetsByType, imageMap, loading, error }`.
`assetsByType` est indexé par le nom GLPI du type (`'Computer'`, `'Monitor'`…),
à utiliser comme `assetsByType.Computer` — **pas** `assetsByType.computers`.

### Registre d'import (`ImportRegistry`)
Clé partagée `'assets'` : chaque actif créé est enregistré à la fois sous
`registryModule` (ex: `'computers'`) ET sous `'assets'`, pour que les tickets
puissent le retrouver sans connaître son type.
