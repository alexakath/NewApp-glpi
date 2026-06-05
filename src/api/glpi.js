import axios from 'axios'

// Variables d'environnement définies dans .env (préfixe VITE_ obligatoire pour Vite)
const BASE_URL = import.meta.env.VITE_GLPI_URL
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN
const USER_TOKEN = import.meta.env.VITE_USER_TOKEN

// Paramètres appliqués à toutes les requêtes de liste par défaut
// expand_dropdowns : retourne le texte des listes déroulantes (ex: nom de catégorie) au lieu de leur ID numérique
// range : limite le nombre de résultats retournés (ici 100 max)
const DEFAULT_PARAMS = {
  expand_dropdowns: true,
  range: '0-99',
}

// Ouvre une session GLPI et retourne un session_token temporaire
// Ce token est ensuite requis pour tous les appels API suivants
// Utilise le user_token (lié à un compte GLPI) + l'app_token (identifie l'application)
export const initSession = async () => {
  const response = await axios.get(`${BASE_URL}/initSession`, {
    headers: {
      'Authorization': `user_token ${USER_TOKEN}`,
      'App-Token': APP_TOKEN,
    },
  })
  return response.data.session_token
}

// Construit les headers nécessaires pour tous les appels après initSession
// App-Token : identifie l'application cliente
// Session-Token : prouve que la session est ouverte (obtenu via initSession)
const getHeaders = (sessionToken) => ({
  'App-Token': APP_TOKEN,
  'Session-Token': sessionToken,
})

// Fonction générique pour récupérer une liste d'éléments GLPI
// itemType : nom du module GLPI (ex: 'Ticket', 'Computer', 'User'...)
// params : paramètres supplémentaires fusionnés avec DEFAULT_PARAMS (sort, order, etc.)
export const getItems = async (itemType, params = {}) => {
  const sessionToken = await initSession()
  const response = await axios.get(`${BASE_URL}/${itemType}`, {
    headers: getHeaders(sessionToken),
    params: { ...DEFAULT_PARAMS, ...params },
  })
  return response.data
}

// Fonction générique pour récupérer un seul élément GLPI par son ID
// itemType : nom du module GLPI (ex: 'Ticket', 'Computer'...)
// id : identifiant numérique de l'élément
export const getItem = async (itemType, id) => {
  const sessionToken = await initSession()
  const response = await axios.get(`${BASE_URL}/${itemType}/${id}`, {
    headers: getHeaders(sessionToken),
    params: { expand_dropdowns: true },
  })
  return response.data
}

// Fonction générique pour récupérer les sous-ressources d'un élément
// Ex: les utilisateurs liés à un ticket → getSubItems('Ticket', 42, 'Ticket_User')
// GLPI expose ces relations via /itemType/{id}/subItemType
export const getSubItems = async (itemType, id, subItemType) => {
  const sessionToken = await initSession()
  const response = await axios.get(`${BASE_URL}/${itemType}/${id}/${subItemType}`, {
    headers: getHeaders(sessionToken),
    params: { expand_dropdowns: true },
  })
  return response.data
}
