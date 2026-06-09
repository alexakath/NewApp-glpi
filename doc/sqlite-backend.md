# Backend SQLite — Architecture et guide d'extension

## 1. Vue d'ensemble

NewApp dispose d'un **backend Node.js + SQLite** qui coexiste avec la connexion GLPI existante.
Les deux fonctionnent en parallèle — GLPI reste la source de vérité, SQLite est une couche additionnelle.

```
Navigateur React
    │
    ├──→  /api.php/v2.3/*   →  GLPI (source de vérité — inchangé)
    │
    └──→  /backend/api/*    →  Backend Express (port 3001)
                                      │
                                      └──→  server/data/newapp.db (SQLite)
```

Le proxy Vite (`vite.config.js`) redirige automatiquement `/backend/*` vers `localhost:3001`,
donc React n'a pas à connaître le port du backend.

---

## 2. Structure des fichiers

```
server/
├── index.js              # Point d'entrée — démarre Express, auto-enregistre les routes
├── db.js                 # Connexion SQLite + création automatique des tables
├── data/
│   └── newapp.db         # Fichier base de données (créé automatiquement, ignoré par git)
├── modules/
│   └── index.js          # ★ SOURCE DE VÉRITÉ — définit tous les modules
├── routes/
│   ├── resource.js       # Factory générique GET / GET/count / DELETE
│   └── sync.js           # Route générique POST /api/sync/:moduleKey
└── package.json

src/api/
└── backend.js            # Client HTTP React — fonctions génériques + raccourcis nommés
```

---

## 3. Principe de fonctionnement

### 3.1 Source de vérité : `server/modules/index.js`

Chaque module déclare :
| Champ | Description |
|---|---|
| `schema` | SQL `CREATE TABLE IF NOT EXISTS` |
| `columns` | Liste des colonnes pour le INSERT (sauf `synced_at`, ajouté auto) |
| `mapRow(item)` | Transforme un objet GLPI en ligne SQLite |
| `orderBy` | Clause ORDER BY pour le GET (défaut : `id DESC`) |

Au démarrage du serveur, `db.js` lit tous les modules et exécute les `CREATE TABLE` automatiquement.
`index.js` lit tous les modules et enregistre les routes `/api/<module>` automatiquement.

### 3.2 Démarrage

```bash
# Dans server/
npm run dev      # node --watch index.js — redémarre si un fichier change
```

### 3.3 Flux de synchronisation (GLPI → SQLite)

```
1. React appelle getTickets()              →  GLPI retourne les tickets
2. React appelle syncToSQLite('tickets', …) →  POST /backend/api/sync/tickets
3. sync.js lit MODULES['tickets'].mapRow   →  transforme chaque objet GLPI
4. Upsert en transaction SQLite            →  INSERT OR UPDATE
5. Réponse : { stored: N }
6. React appelle getFromSQLite('tickets')  →  GET /backend/api/tickets
7. resource.js lit la table               →  retourne les lignes
```

### 3.4 Upsert — pas de doublons

`INSERT … ON CONFLICT(id) DO UPDATE` : appuyer sur "Sync" plusieurs fois ne crée jamais de doublons.

---

## 4. Ajouter un nouveau module (copie depuis GLPI)

**Une seule étape : ajouter une entrée dans `server/modules/index.js`.**
Tout le reste (table, routes GET/DELETE, route sync) est créé automatiquement.

Exemple — `computers` :

```js
// Dans server/modules/index.js, dans l'objet MODULES :
computers: {
  orderBy: 'name ASC',
  schema: `
    CREATE TABLE IF NOT EXISTS computers (
      id           INTEGER PRIMARY KEY,
      name         TEXT,
      serial       TEXT,
      status       INTEGER,
      location     TEXT,
      manufacturer TEXT,
      data_json    TEXT,
      synced_at    TEXT DEFAULT (datetime('now'))
    )
  `,
  columns: ['id', 'name', 'serial', 'status', 'location', 'manufacturer', 'data_json'],
  mapRow: (c) => ({
    id:           Number(c.id),
    name:         c.name        ?? null,
    serial:       c.otherserial ?? null,
    status:       toInt(c.status),
    location:     toStr(c.location),
    manufacturer: toStr(c.manufacturer),
    data_json:    JSON.stringify(c),
  }),
},
```

Après redémarrage du serveur, ces routes existent automatiquement :
- `GET  /api/computers`        — lire tous
- `GET  /api/computers/count`  — compter
- `DELETE /api/computers`      — vider
- `POST /api/sync/computers`   — upsert depuis GLPI

Côté React, ajouter dans `src/api/backend.js` (optionnel, `getFromSQLite` suffit) :

```js
export const getComputersFromSQLite  = () => getFromSQLite('computers')
export const syncComputersToSQLite   = (data) => syncToSQLite('computers', data)
export const clearComputersFromSQLite = () => clearFromSQLite('computers')
```

---

## 5. Créer une table indépendante de GLPI

Pour des données qui n'existent pas dans GLPI (favoris, préférences…), il n'y a **pas de `mapRow`** —
React écrit directement. Les routes génériques GET/DELETE sont toujours créées, mais il faut
ajouter les routes POST/PATCH/DELETE custom dans un fichier dédié.

**Étape 1** — ajouter dans `server/modules/index.js` (sans `mapRow`, sans `columns`) :

```js
favorites: {
  orderBy: 'created_at DESC',
  schema: `
    CREATE TABLE IF NOT EXISTS favorites (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type  TEXT NOT NULL,
      item_id    INTEGER NOT NULL,
      label      TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(item_type, item_id)
    )
  `,
},
```

**Étape 2** — créer `server/routes/favorites.js` pour les opérations d'écriture :

```js
const express = require('express')
const router  = express.Router()
const db      = require('../db')

router.post('/', (req, res) => {
  const { item_type, item_id, label } = req.body
  db.prepare('INSERT OR IGNORE INTO favorites (item_type, item_id, label) VALUES (?, ?, ?)')
    .run(item_type, item_id, label ?? null)
  res.json({ ok: true })
})

router.delete('/:item_type/:item_id', (req, res) => {
  db.prepare('DELETE FROM favorites WHERE item_type = ? AND item_id = ?')
    .run(req.params.item_type, req.params.item_id)
  res.json({ ok: true })
})

module.exports = router
```

**Étape 3** — monter ce router dans `server/index.js` **après** les routes auto-enregistrées :

```js
// Routes custom (écriture) pour tables indépendantes
app.use('/api/favorites', require('./routes/favorites'))
```

> Le GET `/api/favorites` est déjà créé automatiquement par la factory — il ne faut pas le redéfinir.

---

## 6. API générique côté React

`src/api/backend.js` expose des fonctions génériques réutilisables :

```js
getFromSQLite('tickets')          // GET  /api/tickets
getCountFromSQLite('tickets')     // GET  /api/tickets/count
clearFromSQLite('tickets')        // DELETE /api/tickets
syncToSQLite('tickets', data)     // POST /api/sync/tickets
```

Même pattern pour n'importe quel module — remplacer `'tickets'` par la clé du module.

---

## 7. Résumé — checklist

### Copier depuis GLPI vers SQLite
- [ ] `server/modules/index.js` — ajouter l'entrée avec `schema`, `columns`, `mapRow`
- [ ] Redémarrer le serveur — table + routes créées automatiquement
- [ ] `src/api/backend.js` — ajouter les raccourcis nommés (optionnel)

### Table indépendante de GLPI
- [ ] `server/modules/index.js` — ajouter l'entrée avec `schema` seulement
- [ ] `server/routes/<nom>.js` — créer les routes d'écriture (POST, DELETE custom)
- [ ] `server/index.js` — monter le router custom
- [ ] `src/api/backend.js` — ajouter les fonctions correspondantes

---

## 8. Commandes utiles

```bash
# Lancer le backend
cd server && npm run dev

# Vérifier que le backend tourne (liste aussi les modules enregistrés)
curl http://localhost:3001/api/health

# Lire les tickets
curl http://localhost:3001/api/tickets

# Vider la table tickets
curl -X DELETE http://localhost:3001/api/tickets
```
