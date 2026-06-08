# Guide des helpers `glpi.js`

Ce fichier documente les fonctions exposées par [`glpi.js`](./glpi.js), le module
central qui parle aux deux API GLPI utilisées dans ce projet :

- **API v2** (`/api.php/v2.3`) — API moderne, auth Bearer OAuth2. Utilisée pour
  presque tout (Computer, Monitor, Ticket, User, dropdowns, …).
- **API v1** (`/apirest.php`) — API legacy, auth par session temporaire.
  Utilisée uniquement pour ce que la v2 n'expose pas encore : `Item_Ticket`,
  upload/téléchargement de `Document`.

> Astuce générale : tous les chemins (`path`) passés aux helpers v2 sont
> relatifs à `BASE_URL` (`/api.php/v2.3`), par ex. `'Assets/Computer'`,
> `'Assistance/Ticket'`, `'Dropdowns/State'`. Pas de `/` au début.

---

## Bloc v2 — API moderne (Bearer OAuth2)

L'authentification est gérée automatiquement (`getHeaders` récupère/rafraîchit
le token via `auth.js`). Aucun helper v2 ne demande de token explicite.

### `getItems(path, params = {})`

Récupère une **liste** d'items.

```js
const computers = await getItems('Assets/Computer', { sort: 'name', order: 'ASC' })
```

- Ajoute automatiquement `expand_dropdowns: true` (les champs dropdowns comme
  `status`, `manufacturer`, `location` reviennent en objets `{ id, name }` au
  lieu de simples IDs) et `range: '0-99'`.
- Gère les deux formats de réponse possibles de la v2 (tableau direct **ou**
  `{ data: [...], totalcount }`) — retourne toujours un tableau.
- Pour récupérer plus de 100 résultats, passer `{ range: '0-999' }`.

### `getItem(path, id)`

Récupère **un seul** item par son ID, avec dropdowns développés.

```js
const computer = await getItem('Assets/Computer', 12)
```

### `getSubItems(path, id, subPath)`

Récupère les sous-ressources d'un item (ex. les coûts d'un ticket, les volumes
d'un ordinateur).

```js
const costs   = await getSubItems('Assistance/Ticket', 7, 'Cost')
const volumes = await getSubItems('Assets/Computer', 12, 'Volume')
```

### `postSubItem(path, id, subPath, body)`

Crée un sous-item. Le `body` est envoyé tel quel (pas de wrapper `{ input }` —
particularité de la v2, contrairement à la v1).

```js
await postSubItem('Assistance/Ticket', 7, 'Cost', { duration: 3600, cost_time: 50 })
```

### `patchSubItem(path, id, subPath, subId, body)`

Modifie un sous-item existant (PATCH).

```js
await patchSubItem('Assistance/Ticket', 7, 'Cost', 3, { cost_time: 75 })
```

### `createItem(path, body)`

Crée un item racine. Body direct, sans wrapper.

```js
const created = await createItem('Assets/Computer', { name: 'PC-001', status: 2 })
```

### `updateItem(path, id, body)`

Modifie un item existant. La v2 utilise **PATCH** (pas PUT).

```js
await updateItem('Assets/Computer', 12, { status: 3 })
```

### `deleteItem(path, id, params = {})`

Supprime un item. Passer `{ force_purge: 1 }` pour une suppression définitive
(sinon GLPI place l'item à la corbeille).

```js
await deleteItem('Assets/Computer', 12)                    // corbeille
await deleteItem('Assets/Computer', 12, { force_purge: 1 }) // suppression définitive
```

### `deleteSubItem(path, id, subPath, subId)`

Supprime un sous-item.

```js
await deleteSubItem('Assistance/Ticket', 7, 'Item_Ticket', 5)
```

---

## Bloc v1 — API legacy (session temporaire)

La v1 est nécessaire pour ce que la v2 ne couvre pas : liaison d'items à un
ticket (`Item_Ticket`), et tout ce qui touche aux `Document` (upload, lien,
téléchargement). L'authentification y est très différente : il faut **ouvrir
une session temporaire**, l'utiliser, puis la **fermer**.

### `withV1Session(fn)`

Le helper central du bloc v1 — gère le cycle de vie complet d'une session :

1. Ouvre une session (`initSession` avec Basic Auth + App-Token)
2. Exécute `fn(headers)` avec les headers v1 prêts à l'emploi
   (`Session-Token` + `App-Token`)
3. Ferme la session (`killSession`) **dans un `finally`** — donc même si `fn`
   lève une erreur

```js
const result = await withV1Session(async (headers) => {
  const res = await axios.get('/apirest.php/Document_Item', { headers, params: { range: '0-999' } })
  return res.data
})
```

> Utiliser ce wrapper dès qu'on a **plusieurs appels v1 à enchaîner** — ouvrir
> une seule session pour toute une opération est plus efficace que d'en ouvrir
> une par requête (voir `buildAssetImageMap` dans `documents.js` qui fait tout
> en une session : liste des documents + liste des liaisons + téléchargements).

### `getV1SubItems(path, id, subPath, params = {})`

Récupère des sous-items via v1, **sans** `expand_dropdowns` — les `_id`
restent des entiers bruts. Pratique pour ensuite enrichir via `getItem()` v2.

```js
const links = await getV1SubItems('Assistance/Ticket', 7, 'Item_Ticket')
// → [{ id: 1, tickets_id: 7, itemtype: 'Computer', items_id: 12 }, ...]
```

### `createV1Item(path, body)`

Crée un item via v1. **Important** : contrairement à la v2, la v1 exige un
wrapper `{ input: {...} }` autour du body — le helper s'en charge.

```js
await createV1Item('Item_Ticket', { tickets_id: 7, itemtype: 'Computer', items_id: 12 })
// envoie en réalité { input: { tickets_id: 7, itemtype: 'Computer', items_id: 12 } }
```

### `deleteV1Item(path, id)`

Supprime un item via v1.

```js
await deleteV1Item('Item_Ticket', 5)
```

### `uploadAndLinkDocumentV1(headers, file, itemtype, itemsId)`

Upload un fichier (`File`/`Blob`) comme `Document` GLPI et le lie à un item
existant — en **une seule fonction** qui combine 3 appels v1 :

1. `POST /Document` (multipart) → crée le document et stocke le fichier
2. **Vérifie** que GLPI a bien stocké le fichier (`filepath` non vide).
   Certains formats peuvent être rejetés silencieusement par la liste blanche
   GLPI (Configuration → Types de documents) : l'entrée DB est créée mais le
   fichier n'est jamais écrit sur disque. Si c'est le cas, le helper supprime
   le record orphelin et lève une erreur explicite.
3. `POST /Document_Item` → lie le document à l'item (`itemtype` + `itemsId`)

```js
await withV1Session(async (headers) => {
  await uploadAndLinkDocumentV1(headers, fileObj, 'Computer', 12)
})
```

> Ne pas appeler cette fonction directement avec des headers "maison" — elle
> attend les headers d'une session v1 déjà ouverte (passer par `withV1Session`).
> Ne jamais fixer `Content-Type` manuellement sur `headers` pour l'upload : le
> navigateur doit poser lui-même le boundary `multipart/form-data`.

---

## Quel bloc utiliser pour quoi ?

| Besoin                                                  | Bloc | Helper(s)                          |
|---------------------------------------------------------|------|-------------------------------------|
| Lister/lire/créer/modifier/supprimer un actif, ticket…  | v2   | `getItems`, `getItem`, `createItem`, `updateItem`, `deleteItem` |
| Sous-ressources standards (coûts, volumes, …)           | v2   | `getSubItems`, `postSubItem`, `patchSubItem`, `deleteSubItem` |
| Lier un actif à un ticket (`Item_Ticket`)               | v1   | `createV1Item`, `getV1SubItems`, `deleteV1Item` |
| Uploader/lier une image ou un fichier à un item         | v1   | `withV1Session` + `uploadAndLinkDocumentV1` |
| Télécharger un document (binaire/blob)                  | v1   | `withV1Session` (voir `documents.js`) |

---

## Ajouter le support d'un nouveau type d'actif GLPI

Aucun nouveau helper n'est nécessaire — les helpers v2 sont génériques par
chemin. Pour exposer un nouveau type d'actif (ex. `Peripheral`, `Printer`),
voir [`assets.js`](./assets.js) : il suffit d'ajouter une entrée au registre
`ASSET_TYPES` avec le bon `glpiPath` (`Assets/{Type}`), et tout le front-office
générique (liste, filtres, page de détail) le prend en charge automatiquement.
