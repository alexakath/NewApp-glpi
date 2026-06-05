import axios from 'axios'

const TOKEN_URL      = '/api.php/token'
const CLIENT_ID      = import.meta.env.VITE_CLIENT_ID
const CLIENT_SECRET  = import.meta.env.VITE_CLIENT_SECRET
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME   // username fixe, caché

const KEY = {
  ACCESS:  'glpi_access',
  REFRESH: 'glpi_refresh',
  EXPIRES: 'glpi_expires',
}

const persist = ({ access_token, refresh_token, expires_in }) => {
  if (!access_token || typeof access_token !== 'string') {
    throw new Error('Réponse invalide — token manquant.')
  }
  localStorage.setItem(KEY.ACCESS,  access_token)
  localStorage.setItem(KEY.REFRESH, refresh_token ?? '')
  localStorage.setItem(KEY.EXPIRES, Date.now() + expires_in * 1_000)
}

const clientBasic = () => `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`

const tokenRequest = (bodyParams) =>
  axios.post(
    TOKEN_URL,
    new URLSearchParams(bodyParams),
    {
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': clientBasic(),
      },
    }
  )

// L'utilisateur entre uniquement un code — le username admin est fixe dans .env
export const login = async (code) => {
  const res = await tokenRequest({
    grant_type: 'password',
    username:   ADMIN_USERNAME,
    password:   code,
    scope:      'api user',
  })
  persist(res.data)
}

export const logout = () => Object.values(KEY).forEach((k) => localStorage.removeItem(k))

export const isLoggedIn = () => {
  const token = localStorage.getItem(KEY.ACCESS)
  return !!token && token !== 'undefined' && token !== ''
}

export const getAccessToken = async () => {
  const access  = localStorage.getItem(KEY.ACCESS)
  const refresh = localStorage.getItem(KEY.REFRESH)
  const expires = Number(localStorage.getItem(KEY.EXPIRES))

  if (!access || access === 'undefined') return null

  if (Date.now() < expires - 60_000) return access

  if (!refresh) { logout(); return null }

  try {
    const res = await tokenRequest({
      grant_type:    'refresh_token',
      refresh_token: refresh,
    })
    persist(res.data)
    return res.data.access_token
  } catch {
    logout()
    return null
  }
}
