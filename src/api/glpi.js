import axios from 'axios'
import { getAccessToken, logout } from './auth'

// ═══════════════════════════════════════════════════════════════════
//  BLOC v2 — API HL GLPI  (/api.php/v2.3)
//  Auth : Bearer token OAuth2, renouvelé automatiquement via auth.js
//  Utilisé pour : Ticket, Computer, Monitor, Cost, TeamMember, etc.
// ═══════════════════════════════════════════════════════════════════

const BASE_URL = import.meta.env.VITE_GLPI_URL   // /api.php/v2.3

// Paramètres envoyés par défaut sur chaque requête GET de liste
const DEFAULT_PARAMS = {
  expand_dropdowns: true,   // retourne les dropdowns sous forme d'objets {id, name}
  range: '0-99',            // limite à 100 résultats (suffisant pour nos listes)
}

// Construit le header Authorization à partir du token OAuth2 stocké
const getHeaders = async () => {
  const token = await getAccessToken()
  if (!token) {
    logout()
    throw new Error('Session expirée — veuillez vous reconnecter.')
  }
  return { Authorization: `Bearer ${token}` }
}

// Récupère une liste d'items  ex: getItems('Assets/Computer', { sort: 'name' })
export const getItems = async (path, params = {}) => {
  const headers = await getHeaders()
  const res = await axios.get(`${BASE_URL}/${path}`, {
    headers,
    params: { ...DEFAULT_PARAMS, ...params },
  })
  // v2 peut retourner un tableau direct OU { data: [...], totalcount: N }
  return Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
}

// Récupère un seul item par son ID  ex: getItem('Assets/Computer', 3)
export const getItem = async (path, id) => {
  const headers = await getHeaders()
  const res = await axios.get(`${BASE_URL}/${path}/${id}`, {
    headers,
    params: { expand_dropdowns: true },
  })
  return res.data
}

// Récupère les sous-items d'une ressource  ex: getSubItems('Assistance/Ticket', 1, 'Cost')
export const getSubItems = async (path, id, subPath) => {
  const headers = await getHeaders()
  const res = await axios.get(`${BASE_URL}/${path}/${id}/${subPath}`, {
    headers,
    params: { expand_dropdowns: true },
  })
  return res.data
}

// Crée un sous-item  ex: postSubItem('Assistance/Ticket', 1, 'Cost', { ... })
export const postSubItem = async (path, id, subPath, body) => {
  const headers = await getHeaders()
  const res = await axios.post(
    `${BASE_URL}/${path}/${id}/${subPath}`,
    body,
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  )
  return res.data
}

// Modifie un sous-item existant (PATCH)
export const patchSubItem = async (path, id, subPath, subId, body) => {
  const headers = await getHeaders()
  const res = await axios.patch(
    `${BASE_URL}/${path}/${id}/${subPath}/${subId}`,
    body,
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  )
  return res.data
}

// Crée un item racine  ex: createItem('Assistance/Ticket', { name: '...' })
// Note : GLPI v2 n'utilise PAS de wrapper { input: {...} } — le body est direct
export const createItem = async (path, body) => {
  const headers = await getHeaders()
  const res = await axios.post(`${BASE_URL}/${path}`, body, {
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
  return res.data
}

// Modifie un item (PATCH — GLPI v2 utilise PATCH, pas PUT)
export const updateItem = async (path, id, body) => {
  const headers = await getHeaders()
  const res = await axios.patch(`${BASE_URL}/${path}/${id}`, body, {
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
  return res.data
}

// Supprime un item  — params permet de passer force_purge: 1 pour suppression définitive
export const deleteItem = async (path, id, params = {}) => {
  const headers = await getHeaders()
  await axios.delete(`${BASE_URL}/${path}/${id}`, { headers, params })
}

// Supprime un sous-item  ex: deleteSubItem('Assistance/Ticket', 1, 'Item_Ticket', 5)
export const deleteSubItem = async (path, id, subPath, subId) => {
  const headers = await getHeaders()
  await axios.delete(`${BASE_URL}/${path}/${id}/${subPath}/${subId}`, { headers })
}

// ═══════════════════════════════════════════════════════════════════
//  BLOC v1 — API Legacy GLPI  (/apirest.php)
//
//  Pourquoi v1 ici ? L'API HL v2 n'expose pas Item_Ticket
//  (confirmé via Swagger /api.php/v2.3/doc). La v1 le supporte.
//
//  Auth v1 : différente de v2
//    - nécessite un App-Token (configuré dans GLPI → API → Clients API)
//    - nécessite une session ouverte via initSession (Basic auth)
//    - la session est TEMPORAIRE : ouverte juste avant la requête,
//      fermée immédiatement après (killSession)
//
//  Utilisé UNIQUEMENT pour : getTicketItems (Item_Ticket)
// ═══════════════════════════════════════════════════════════════════

const V1_BASE = '/apirest.php'

// Wrapper qui gère le cycle de vie complet d'une session v1 :
//   1. Ouvre la session  (initSession)
//   2. Exécute fn(headers) avec les bons headers v1
//   3. Ferme la session  (killSession) — même en cas d'erreur (finally)
//
// fn reçoit les headers v1 prêts à l'emploi et doit retourner une Promise.
export const withV1Session = async (fn) => {
  // Encode les identifiants en Base64 pour le Basic auth
  const cred = btoa(
    `${import.meta.env.VITE_ADMIN_USERNAME}:${import.meta.env.VITE_DEFAULT_CODE}`
  )

  // Headers pour ouvrir la session (initSession)
  const initHeaders = { Authorization: `Basic ${cred}` }
  if (import.meta.env.VITE_APP_TOKEN) initHeaders['App-Token'] = import.meta.env.VITE_APP_TOKEN

  // Ouverture de session — GLPI retourne un session_token temporaire
  const initRes = await axios.get(`${V1_BASE}/initSession`, { headers: initHeaders })
  const session  = initRes.data.session_token

  // Headers à utiliser pour les requêtes suivantes
  const reqHeaders = { 'Session-Token': session }
  if (import.meta.env.VITE_APP_TOKEN) reqHeaders['App-Token'] = import.meta.env.VITE_APP_TOKEN

  try {
    // Exécute la fonction métier avec les headers v1
    return await fn(reqHeaders)
  } finally {
    // Ferme toujours la session, même si fn() a levé une erreur
    // .catch(() => {}) évite qu'une erreur de killSession masque l'erreur principale
    axios.get(`${V1_BASE}/killSession`, { headers: reqHeaders }).catch(() => {})
  }
}

// Récupère les sous-items d'une ressource via l'API v1.
// Sans expand_dropdowns : items_id reste un entier brut (ex: 3),
// ce qui permet ensuite de l'utiliser dans getItem() v2 pour l'enrichissement.
export const getV1SubItems = (path, id, subPath, params = {}) =>
  withV1Session(headers =>
    axios.get(`${V1_BASE}/${path}/${id}/${subPath}`, {
      headers,
      params,    // pas d'expand_dropdowns ici : on veut les IDs numériques bruts
    }).then(res => Array.isArray(res.data) ? res.data : [])
  )

// Crée un item via l'API v1.
// IMPORTANT : la v1 exige un wrapper { input: {...} } autour du body,
// contrairement à la v2 qui reçoit le body directement.
export const createV1Item = (path, body) =>
  withV1Session(headers =>
    axios.post(`${V1_BASE}/${path}`, { input: body }, {
      headers: { ...headers, 'Content-Type': 'application/json' },
    }).then(res => res.data)
  )

// Supprime un item par son ID via l'API v1.
export const deleteV1Item = (path, id) =>
  withV1Session(headers =>
    axios.delete(`${V1_BASE}/${path}/${id}`, { headers })
  )

// Upload un fichier comme Document GLPI v1 et le lie à un item.
// headers : headers de session v1 déjà ouverte (Session-Token + App-Token).
// Ne pas inclure Content-Type — le navigateur le set automatiquement pour multipart.
export const uploadAndLinkDocumentV1 = async (headers, file, itemtype, itemsId) => {
  const formData = new FormData()
  formData.append('uploadManifest', JSON.stringify({ input: { name: file.name, entities_id: 0 } }))
  formData.append('filename[0]', file, file.name)

  const uploadRes = await axios.post(`${V1_BASE}/Document`, formData, { headers })
  const docId = uploadRes.data?.id ?? (Array.isArray(uploadRes.data) ? uploadRes.data[0]?.id : null)
  if (!docId) throw new Error("Upload document échoué — pas d'ID retourné")

  // GLPI peut créer l'entrée en base sans stocker le fichier si le format n'est pas
  // dans la liste blanche (Configuration > Types de documents). On vérifie filepath.
  const verify = await axios.get(`${V1_BASE}/Document/${docId}`, { headers }).catch(() => null)
  if (verify?.data && !verify.data.filepath) {
    // Supprimer le record orphelin pour ne pas polluer GLPI
    await axios.delete(`${V1_BASE}/Document/${docId}`, { headers }).catch(() => {})
    const ext = file.name.split('.').pop() || file.type
    throw new Error(
      `Fichier refusé par GLPI — type "${ext}" absent de la liste blanche ` +
      `(GLPI > Configuration > Types de documents)`
    )
  }

  await axios.post(
    `${V1_BASE}/Document_Item`,
    { input: { documents_id: Number(docId), itemtype, items_id: Number(itemsId) } },
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  )
  return Number(docId)
}
