import axios from 'axios'
import { getAccessToken, logout } from './auth'

const BASE_URL = import.meta.env.VITE_GLPI_URL   // /api.php/v2.3

const DEFAULT_PARAMS = {
  expand_dropdowns: true,
  range: '0-99',
}

const getHeaders = async () => {
  const token = await getAccessToken()
  if (!token) {
    logout()
    throw new Error('Session expirée — veuillez vous reconnecter.')
  }
  return { Authorization: `Bearer ${token}` }
}

// path : chemin complet de la ressource, ex: 'Assistance/Ticket' ou 'Assets/Computer'
export const getItems = async (path, params = {}) => {
  const headers = await getHeaders()
  const res = await axios.get(`${BASE_URL}/${path}`, {
    headers,
    params: { ...DEFAULT_PARAMS, ...params },
  })
  // v2 peut retourner un tableau ou { data: [...], totalcount: N }
  return Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
}

export const getItem = async (path, id) => {
  const headers = await getHeaders()
  const res = await axios.get(`${BASE_URL}/${path}/${id}`, {
    headers,
    params: { expand_dropdowns: true },
  })
  return res.data
}

export const getSubItems = async (path, id, subPath) => {
  const headers = await getHeaders()
  const res = await axios.get(`${BASE_URL}/${path}/${id}/${subPath}`, {
    headers,
    params: { expand_dropdowns: true },
  })
  return res.data
}

export const postSubItem = async (path, id, subPath, body) => {
  const headers = await getHeaders()
  const res = await axios.post(
    `${BASE_URL}/${path}/${id}/${subPath}`,
    body,
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  )
  return res.data
}

export const patchSubItem = async (path, id, subPath, subId, body) => {
  const headers = await getHeaders()
  const res = await axios.patch(
    `${BASE_URL}/${path}/${id}/${subPath}/${subId}`,
    body,
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  )
  return res.data
}
