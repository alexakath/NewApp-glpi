# Architecture API — NewApp GLPI

## Pourquoi deux APIs ?

GLPI expose deux APIs sur le même serveur. La nouvelle (v2) est plus moderne
mais ne couvre pas tout. On utilise la v1 uniquement pour ce qu'elle fait et
que la v2 ne peut pas faire.

```
GLPI (localhost)
│
├── /api.php/v2.3/...     → API HL v2  (moderne, OAuth2)
│     Ticket, Computer, Monitor, Cost, TeamMember...
│     ✗ Item_Ticket non exposé
│
└── /apirest.php/...      → API v1 Legacy (session temporaire)
      Ticket/{id}/Item_Ticket
      ✓ Item_Ticket disponible ici
```

---

## Authentification — deux systèmes séparés

```
┌─────────────────────────────────────────────────────────────┐
│  API v2  (tout le reste de l'app)                           │
│                                                             │
│  POST /api.php/token  (OAuth2 ROPC)                         │
│    username: glpi  password: glpi                           │
│    → access_token  (Bearer, stocké en localStorage)         │
│                                                             │
│  Chaque requête v2 :                                        │
│    Authorization: Bearer <access_token>                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  API v1  (Item_Ticket uniquement)                           │
│                                                             │
│  GET /apirest.php/initSession                               │
│    Authorization: Basic base64(glpi:glpi)                   │
│    App-Token: <VITE_APP_TOKEN>                              │
│    → session_token  (temporaire, une seule requête)         │
│                                                             │
│  Requête v1 :                                               │
│    Session-Token: <session_token>                           │
│    App-Token: <VITE_APP_TOKEN>                              │
│                                                             │
│  GET /apirest.php/killSession  (nettoyage immédiat)         │
└─────────────────────────────────────────────────────────────┘
```

> Le token v2 et la session v1 sont **complètement indépendants**.
> Un token v2 ne fonctionne pas en v1 et inversement.

---

## Flux complet — affichage des éléments d'un ticket

```
TicketDetail.jsx
│
├── getTicketFull(id)      → v2  GET /Assistance/Ticket/{id}
├── getTicketCosts(id)     → v2  GET /Assistance/Ticket/{id}/Cost
│
└── getTicketItems(id)     → v1  (seule exception)
      │
      │  1. Ouvre session v1
      │     GET /apirest.php/initSession
      │     → session_token
      │
      │  2. Récupère les liens Item_Ticket
      │     GET /apirest.php/Ticket/{id}/Item_Ticket
      │     → [{ itemtype: "Computer", items_id: 3 }, ...]
      │        (IDs bruts — pas de noms)
      │
      │  3. Ferme session v1
      │     GET /apirest.php/killSession
      │
      └──► Enrichissement via v2 (TicketDetail.jsx)
             GET /api.php/v2.3/Assets/Computer/3
             → { name: "PC-001", serial: "SN-PC-001" }

Résultat affiché : Ordinateur | PC-001 | SN-PC-001
```

---

## Organisation des fichiers

```
src/api/
│
├── auth.js          Gestion OAuth2 (v2 uniquement)
│                    getAccessToken(), login(), logout()
│
├── glpi.js          Fonctions HTTP bas niveau
│   │
│   ├── BLOC v2 ──── getItems, getItem, getSubItems,
│   │                createItem, updateItem, deleteItem,
│   │                postSubItem, patchSubItem, deleteSubItem
│   │
│   └── BLOC v1 ──── withV1Session()   ← gestion session temporaire
│                    getV1SubItems()   ← seul export utilisé
│
└── tickets.js       Fonctions métier Ticket
    │
    ├── v2 ────────── getTickets, getTicket, createTicket,
    │                 updateTicket, deleteTicket,
    │                 addItemToTicket, removeItemFromTicket
    │
    └── v1 ────────── getTicketItems   ← seule fonction v1 exposée
```

---

## Règle de base pour la suite

| Besoin | Utiliser |
|---|---|
| Lire / créer / modifier / supprimer un ticket | v2 |
| Lire / créer / modifier / supprimer un actif | v2 |
| Coûts d'un ticket | v2 |
| Membres d'un ticket | v2 |
| **Lire les éléments associés à un ticket** | **v1** `getTicketItems` |
| **Ajouter un élément à un ticket** | **v1** `addItemToTicket` |
| **Retirer un élément d'un ticket** | **v1** `removeItemFromTicket` |

Si GLPI expose un jour Item_Ticket en v2, il suffit de remplacer
`getV1SubItems` par `getSubItems` dans `tickets.js` — rien d'autre ne change.
