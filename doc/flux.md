# Flux complet — NewApp GLPI

## 1. Démarrage de l'app

```
App.jsx charge
  → isLoggedIn() vérifie localStorage
      → token présent ? → affiche l'app
      → pas de token ?  → affiche LoginPage
```

`isLoggedIn()` dans `auth.js` lit simplement `localStorage.getItem('glpi_access')` — si vide, login requis.

---

## 2. Login (OAuth2 — grant_type=password)

```
Admin entre username + password
  → login(username, password) dans auth.js
      → POST /api.php/token
          Headers : Authorization: Basic base64(client_id:client_secret)
          Body    : grant_type=password & username & password & scope=api user
      → GLPI vérifie les credentials dans sa base
      → Retourne : { access_token, refresh_token, expires_in }
      → persist() stocke les 3 valeurs dans localStorage
  → App.jsx reçoit onLogin() → setAuthenticated(true)
  → Sidebar + pages s'affichent
```

Le `Basic base64(client_id:client_secret)` dans le header identifie **l'application** (NewApp).
Le `username/password` dans le body identifie **l'utilisateur**.
GLPI vérifie les deux.

---

## 3. Chaque appel API (tickets, ordinateurs...)

```
TicketsPage monte
  → getTickets() dans tickets.js
      → getItems('Assistance/Ticket', {...}) dans glpi.js
          → getHeaders()
              → getAccessToken() dans auth.js
                  → token encore valide (> 60s) ? retourne-le directement
                  → token expiré ? POST /api.php/token avec refresh_token
                                    → nouveau token stocké → retourné
                  → pas de token ? logout() → erreur "session expirée"
          → GET /api.php/v2.3/Assistance/Ticket
              Headers : Authorization: Bearer {access_token}
              Params  : expand_dropdowns=true, range=0-99, sort=date_mod
          → GLPI retourne le tableau de tickets
      → tickets.js reçoit le tableau → l'affiche
```

Le token Bearer prouve à GLPI que l'utilisateur est authentifié.
GLPI retourne uniquement les données que cet utilisateur a le droit de voir (selon son profil GLPI).

---

## 4. Rafraîchissement automatique du token

```
Token expire (typiquement après 1h)
  → Prochaine requête appelle getAccessToken()
      → Date.now() > expiresAt - 60s → token "mort"
      → POST /api.php/token avec grant_type=refresh_token
      → GLPI retourne un nouveau access_token + refresh_token
      → persist() met à jour localStorage
      → nouvelle requête repart avec le nouveau token
```

Tout ça est **transparent** — l'utilisateur ne voit rien, pas de déconnexion forcée.

---

## 5. Déconnexion

```
Clic sur "Déconnexion" dans Sidebar
  → handleLogout() dans App.jsx
      → logout() dans auth.js
          → supprime glpi_access, glpi_refresh, glpi_expires du localStorage
      → setAuthenticated(false)
  → LoginPage s'affiche
```

---

## 6. Structure des URLs API v2.3

| Ce qu'on appelle       | URL réelle                                              |
|---|---|
| Liste des tickets      | `GET /api.php/v2.3/Assistance/Ticket`                  |
| Détail ticket          | `GET /api.php/v2.3/Assistance/Ticket/{id}`             |
| Intervenants           | `GET /api.php/v2.3/Assistance/Ticket/{id}/TeamMember`  |
| Liste ordinateurs      | `GET /api.php/v2.3/Assets/Computer`                    |
| Détail ordinateur      | `GET /api.php/v2.3/Assets/Computer/{id}`               |
| Disques                | `GET /api.php/v2.3/Assets/Computer/{id}/Volume`        |
| Token OAuth2           | `POST /api.php/token`  *(non versionné)*               |

---

## 7. Proxy Vite (dev)

Le proxy Vite intercepte tout ce qui commence par `/api.php` et le redirige vers `http://localhost` — ce qui élimine le CORS puisque le navigateur ne voit qu'une requête vers `localhost:5173`.

```
Navigateur (localhost:5173)
    │
    ├── /api.php/token        → Vite proxy → localhost/api.php/token
    │       [Login OAuth2]
    │
    └── /api.php/v2.3/...     → Vite proxy → localhost/api.php/v2.3/...
            [Données GLPI]
```

---

## 8. Rôle de chaque fichier

| Fichier             | Rôle                                                      |
|---|---|
| `src/api/auth.js`   | Login, logout, gestion du token (cache + refresh)         |
| `src/api/glpi.js`   | Couche HTTP — ajoute le Bearer token à chaque requête     |
| `src/api/tickets.js`| Fonctions métier Tickets (chemins v2, mapping labels)     |
| `src/api/computers.js` | Fonctions métier Ordinateurs (chemins v2)              |
| `src/App.jsx`       | Routage login/app selon l'état d'auth                     |
| `src/pages/LoginPage.jsx` | Formulaire de connexion                           |
| `src/components/Sidebar.jsx` | Navigation + bouton déconnexion                |
| `vite.config.js`    | Proxy dev — redirige `/api.php` vers `localhost`          |
| `.env`              | Variables d'environnement (URL, client_id, client_secret) |
