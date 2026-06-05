import axios from 'axios'

// Token endpoint GLPI — non versionné, séparé de l'API data
const TOKEN_URL     = '/api.php/token'
const CLIENT_ID     = import.meta.env.VITE_CLIENT_ID
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET

const KEY = {
  ACCESS:  'glpi_access',
  REFRESH: 'glpi_refresh',
  EXPIRES: 'glpi_expires',
}

const persist = ({ access_token, refresh_token, expires_in }) => {
  localStorage.setItem(KEY.ACCESS,  access_token)
  localStorage.setItem(KEY.REFRESH, refresh_token ?? '')
  localStorage.setItem(KEY.EXPIRES, Date.now() + expires_in * 1_000)
}

// GLPI exige les client credentials en Basic auth header (pas dans le body)
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

// Connexion avec username / password — grant_type=password (ROPC)
export const login = async (username, password) => {
  const res = await tokenRequest({
    grant_type: 'password',
    username,
    password,
    scope: 'api user',
  })
  persist(res.data)
}

export const logout = () => Object.values(KEY).forEach((k) => localStorage.removeItem(k))

export const isLoggedIn = () => !!localStorage.getItem(KEY.ACCESS)

// Retourne un access_token valide, rafraîchit automatiquement si expiré
export const getAccessToken = async () => {
  const access  = localStorage.getItem(KEY.ACCESS)
  const refresh = localStorage.getItem(KEY.REFRESH)
  const expires = Number(localStorage.getItem(KEY.EXPIRES))

  if (!access) return null

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
