Nous avons une evaluation qui consiste a reprendre le projet GLPI version 11.0.7, ne pas toucher a ce Existing App mais le relier a un NewApp qu'on fera avec react et qui sera connecte a glpi via un API pour s'echanger les donnees en format JSON
Voici le contexte :
Evaluation série 2 - J0 - 02 Juin 26 - P17
A faire

1. Prendre le projet GLPI 11.0.7 sur https://www.glpi-project.org/fr/downloads/ 
2. Le faire marcher en local
3. Compréhension des modules principaux
Todo à venir

1. NewAPP : Nouvelles pages sur autre techno de votre choix (React) , lié au projet existant (ExistingApp)
PS: Je ne veux surtout pas encore coder le newApp, on reste focus sur la GLPI d'abord, mais c'est juste pour le contexte pour l'echange de donnee API 

Ce que j'ai deja fait :

1. Prendre le projet GLPI 11.0.7 sur https://www.glpi-project.org/fr/downloads/ 
2. Le faire marcher en local
3. échange de données avec l’API en json teste via postman (user-token et app-token avec un session-token)

Pour la partie comprehension ce que j'ai deja compris :
L'API de GLPI 11
GLPI 11 introduit une nouvelle API REST v2 basée sur Swagger/OpenAPI, sécurisée via OAuth2. L'ancienne API legacy (apirest.php) reste disponible et maintenue. IT-Connect
Pour ce projet, on va utiliser l'API legacy (v1) qui est plus simple à prendre en main : elle est accessible via /apirest.php et utilise un App-Token (configuré côté GLPI) + un Session-Token obtenu à la connexion. Readthedocs

Deja fait :
Créer des données de test dans GLPI :

Quelques tickets (menu Assistance > Tickets > +)
Quelques assets (menu Actifs > Ordinateurs > +)
Quelques utilisateurs (Administration > Utilisateurs)


Activer l'API : Paramètres > Général > API

Activer l'API REST
Créer un client API → noter l'App-Token généré
Générer un token utilisateur depuis ton profil → noter le User-Token


Tester l'API avec un outil (Postman) : fait avec succes

   GET http://localhost/glpi/apirest.php/initSession
   Headers:
     Authorization: user_token VOTRE_USER_TOKEN
     App-Token: VOTRE_APP_TOKEN
→ récupères un session_token en JSON. C'est le point d'entrée.

INFO :
GLPI tourne bien en local sur mon navigateur via XAMPP
système d'exploitation : Windows

GLPI installé et fonctionnel en local
✅ Données de test créées (3 ordinateurs, 3 tickets, 5 utilisateurs)
✅ API Legacy activée
✅ User Token généré et sauvegardé
✅ App Token généré et sauvegardé
✅ initSession testé et fonctionnel → retourne un Session Token
✅ GET /Ticket testé → retourne les tickets en JSON
✅ GET /Computer testé → retourne les ordinateurs en JSON

📋 Tes 3 clés à garder précieusement
User Token  → dans Mes préférences (permanent)
App Token   → dans Configuration > API (permanent)
Session Token → obtenu via initSession (temporaire, expire)

ce qu'on va faire maintenant c'est bien apprendre les modules principaux de GLPI, et de voir tous les urls (api) necessaires 

On attaque pas encore new app on apprend bien les bases d'abord (theoriquement)  et puis a bien les manipuler dans l'app, raccorde sur ce qui doit l'etre et tout

Voici les 5 modules principaux de GLPI:
On va les couvrir dans cet ordre, du plus important au moins important pour ton éval :
#ModuleCe qu'il gère1AssistanceTickets, incidents, demandes2ParcOrdinateurs, matériels, logiciels3AdministrationUtilisateurs, profils, entités4GestionBudgets, contrats, fournisseurs5ConfigurationParamètres généraux, API

Assistance et Parc deja fait

Voici comment on va poursuivre pour le reste des modules
Je te donne le capture d'ecran de la liste des sous menus du module puis tu m'explique brievement mais bien complet chaque sous menus + url (api), etc

Ex : Assistance :
# Module Assistance (Helpdesk)

## Sous-modules

**Tableau de bord**
Vue d'ensemble du helpdesk — graphiques, statistiques en temps réel, nombre de tickets ouverts/résolus. C'est la première page qu'un chef d'équipe IT regarde le matin.

**Tickets**
Le cœur du module. Un ticket = un problème ou une demande signalé par un utilisateur. Il a un cycle de vie : `Nouveau → En cours → En attente → Résolu → Clos`

**Créer un ticket**
Raccourci direct vers le formulaire de création.

**Catalogue de services**
Liste des services disponibles que les utilisateurs peuvent demander (ex: "Installer un logiciel", "Demander un nouveau PC"). C'est comme un menu de services prédéfinis.

**Problèmes**
Un problème est différent d'un ticket — c'est la cause racine de plusieurs incidents. Ex: si 10 utilisateurs ont un ticket "pas de WiFi", on crée un Problème "Routeur défaillant" qui regroupe tous ces tickets.

**Changements**
Représente une modification planifiée du système IT (ex: mise à jour d'un serveur, changement de réseau). Nécessite une validation avant d'être exécuté.

**Planning**
Vue calendrier des interventions et tâches assignées aux techniciens.

**Statistiques**
Rapports détaillés — temps de résolution moyen, nombre de tickets par période, performance des techniciens.

**Tickets récurrents**
Tickets qui se créent automatiquement à intervalles réguliers (ex: "Vérifier les sauvegardes" tous les lundis).

**Changements récurrents**
Même principe mais pour les changements planifiés réguliers.

---

## URLs API

| Action                  | Méthode  | URL                                    |

| Lister tous les tickets | `GET`    | `/api.php/v1/Ticket`                   |

| Voir un ticket précis   | `GET`    | `/api.php/v1/Ticket/{id}`              |

| Créer un ticket         | `POST`   | `/api.php/v1/Ticket`                   |

| Modifier un ticket      | `PUT`    | `/api.php/v1/Ticket/{id}`              |

| Supprimer un ticket     | `DELETE` | `/api.php/v1/Ticket/{id}`              |

| Lister les problèmes    | `GET`    | `/api.php/v1/Problem`                  |

| Lister les changements  | `GET`    | `/api.php/v1/Change`                   |

| Suivis d'un ticket      | `GET`    | `/api.php/v1/Ticket/{id}/ITILFollowup` |

| Solutions d'un ticket   | `GET`    | `/api.php/v1/Ticket/{id}/ITILSolution` |

---

## Valeurs numériques importantes

### Status
| Valeur | Signification |

| 1 | Nouveau |
| 2 | En cours (attribué) |
| 3 | En cours (planifié) |
| 4 | En attente |
| 5 | Résolu |
| 6 | Clos |

### Urgence / Impact / Priorité
| Valeur | Signification |

| 1 | Très basse |
| 2 | Basse |
| 3 | Moyenne |
| 4 | Haute |
| 5 | Très haute |

### Type
| Valeur | Signification |

| 1 | Incident |
| 2 | Demande |
Parc:
# Module Parc

## Sous-modules

**Tableau de bord**
Vue d'ensemble du parc informatique — nombre total d'équipements, répartition par statut, par type. Permet de voir en un coup d'œil l'état de tout le matériel.

**Ordinateurs**
Le plus utilisé — gestion de tous les PC, laptops, serveurs. Chaque ordinateur a un numéro de série, un utilisateur assigné, un technicien responsable et un statut.

**Moniteurs**
Gestion des écrans. Liés généralement à un ordinateur ou un utilisateur.

**Logiciels**
Gestion des logiciels installés et de leurs licences. Permet de savoir combien de licences on a et sur quels ordinateurs elles sont installées.

**Matériels réseau**
Switchs, routeurs, points d'accès WiFi — tout ce qui gère le réseau.

**Périphériques**
Claviers, souris, webcams, scanners — tout ce qui se branche sur un ordinateur.

**Imprimantes**
Gestion des imprimantes réseau ou locales, avec suivi des cartouches associées.

**Cartouches**
Stock de cartouches d'encre liées aux imprimantes.

**Consommables**
Autres consommables IT (câbles, papier, piles...).

**Téléphones**
Téléphones fixes ou mobiles assignés aux utilisateurs.

**Baies**
Baies de serveurs (racks) — contient les serveurs et équipements réseau physiques dans une salle serveur.

**Châssis**
Boîtiers physiques qui contiennent plusieurs serveurs lames (blade servers).

**PDU**
Power Distribution Unit — les multiprises/onduleurs qui alimentent les équipements dans les baies.

**Équipements passifs**
Éléments réseau sans intelligence propre : panneaux de brassage, prises réseau murales.

**Actifs non gérés**
Équipements détectés sur le réseau mais pas encore enregistrés dans GLPI.

**Câbles**
Gestion et traçabilité des câbles réseau — quel câble relie quel équipement à quel autre.

**Carte SIM éléments**
Cartes SIM associées aux téléphones mobiles ou équipements connectés.

**Global**
Vue consolidée de tous les types d'actifs confondus — permet de chercher n'importe quel équipement sans savoir dans quelle catégorie il est.

---

## URLs API

| Action                        | Méthode  | URL                            |

| Lister les ordinateurs        | `GET`    | `/api.php/v1/Computer`         |

| Voir un ordinateur            | `GET`    | `/api.php/v1/Computer/{id}`    |

| Créer un ordinateur           | `POST`   | `/api.php/v1/Computer`         |

| Modifier un ordinateur        | `PUT`    | `/api.php/v1/Computer/{id}`    |

| Supprimer un ordinateur       | `DELETE` | `/api.php/v1/Computer/{id}`    |

| Lister les moniteurs          | `GET`    | `/api.php/v1/Monitor`          |

| Lister les logiciels          | `GET`    | `/api.php/v1/Software`         |

| Lister les matériels réseau   | `GET`    | `/api.php/v1/NetworkEquipment` |

| Lister les périphériques      | `GET`    | `/api.php/v1/Peripheral`       |

| Lister les imprimantes        | `GET`    | `/api.php/v1/Printer`          |

| Lister les téléphones         | `GET`    | `/api.php/v1/Phone`            |

---

## Champs importants d'un ordinateur (réponse JSON)

| Champ | Signification |

| `id` | Identifiant unique |
| `name` | Nom de l'ordinateur |
| `serial` | Numéro de série |
| `otherserial` | Numéro d'inventaire |
| `users_id` | ID de l'utilisateur propriétaire |
| `users_id_tech` | ID du technicien responsable |
| `states_id` | ID du statut (1 = En production) |
| `locations_id` | ID du lieu |
| `date_creation` | Date d'ajout dans GLPI |
| `last_boot` | Dernier démarrage |





Voici un projet newApp react qu'on doit relier a glpi 11.0.7 qui marche deja en local sur mon pc
On ne doit pas toucher le glpi
L'echange de donnees entre ce newApp et l'existing App qui est le glpi se fera via API en format json 
Voici les tokens que j'ai recupere :
jeton d'acces user token de l'utilisateur glpi : EHHswx4HzscM21YvbdEI7g0SLgSoovM7msIhLc5C

jeton app token : i1hqytrIHDfDX9Gqxov5zBizoo8WKrW8Z7AGXWG9

On doit implementer ce newApp mais on le fera petit a petit, on fait seulement d'abord la connexion entre les deux 
Voici le plan d'implemnetaion:

Étape 3 — Configurer les tokens dans un fichier .env
Le fichier .env se place à la racine du projet (même niveau que package.json).
NewApp/
├── .env          ← ici
├── package.json
├── src/
└── ...
envVITE_GLPI_URL=http://localhost/glpi/apirest.php
VITE_APP_TOKEN=TON_APP_TOKEN
VITE_USER_TOKEN=TON_USER_TOKEN
Pourquoi VITE_ devant chaque variable ?
Vite n'expose que les variables qui commencent par VITE_ au code React. Les autres sont ignorées pour des raisons de sécurité.
Comment on les utilise dans le code ?
jsimport.meta.env.VITE_GLPI_URL
import.meta.env.VITE_APP_TOKEN
import.meta.env.VITE_USER_TOKEN
Créer aussi .gitignore à la racine et y mettre :
.env
node_modules

Étape 4 — Créer le fichier API centralisé src/api/glpi.js
src/
├── api/
│   └── glpi.js    ← on crée ce dossier et ce fichier
├── components/
└── App.jsx
jsimport axios from 'axios'

const BASE_URL = import.meta.env.VITE_GLPI_URL
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN
const USER_TOKEN = import.meta.env.VITE_USER_TOKEN
On centralise tout ici — si demain les tokens changent ou l'URL change, on touche uniquement ce fichier, pas tous les composants.

Étape 5 — Implémenter initSession
Toujours dans src/api/glpi.js, on ajoute la fonction :
jsexport const initSession = async () => {
  const response = await axios.get(`${BASE_URL}/initSession`, {
    headers: {
      'Authorization': `user_token ${USER_TOKEN}`,
      'App-Token': APP_TOKEN,
    }
  })
  return response.data.session_token
}
Ce qui se passe ligne par ligne :

On appelle GET /apirest.php/initSession
On passe les 2 headers obligatoires (exactement comme dans Postman)
GLPI nous répond avec { "session_token": "xxx..." }
On retourne uniquement le token

On ajoute aussi une fonction utilitaire pour les appels suivants :
jsexport const getHeaders = (sessionToken) => ({
  'App-Token': APP_TOKEN,
  'Session-Token': sessionToken,
})

Cette fonction retourne les headers nécessaires pour tous les appels après initSession. On la réutilisera partout.


Étape 6 — Créer le composant de test src/components/TestApi.jsx
jsximport { useEffect, useState } from 'react'
import axios from 'axios'
import { initSession, getHeaders } from '../api/glpi'

const BASE_URL = import.meta.env.VITE_GLPI_URL

function TestApi() {
  const [tickets, setTickets] = useState(null)
  const [computers, setComputers] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. On ouvre la session
        const sessionToken = await initSession()

        // 2. On récupère les tickets
        const ticketsRes = await axios.get(`${BASE_URL}/Ticket`, {
          headers: getHeaders(sessionToken)
        })

        // 3. On récupère les ordinateurs
        const computersRes = await axios.get(`${BASE_URL}/Computer`, {
          headers: getHeaders(sessionToken)
        })

        setTickets(ticketsRes.data)
        setComputers(computersRes.data)

      } catch (err) {
        setError(err.message)
      }
    }

    fetchData()
  }, [])

  if (error) return <p>Erreur : {error}</p>

  return (
    <div>
      <h2>Tickets</h2>
      <pre>{JSON.stringify(tickets, null, 2)}</pre>

      <h2>Ordinateurs</h2>
      <pre>{JSON.stringify(computers, null, 2)}</pre>
    </div>
  )
}

export default TestApi
Points clés :

useEffect avec [] = s'exécute une seule fois au chargement de la page
JSON.stringify(data, null, 2) = affiche le JSON indenté et lisible
<pre> = respecte la mise en forme du JSON dans le navigateur
Le try/catch = si quelque chose échoue (mauvais token, CORS...) on affiche l'erreur

Puis dans src/App.jsx, on importe le composant :
jsximport TestApi from './components/TestApi'

function App() {
  return (
    <div>
      <h1>NewApp GLPI</h1>
      <TestApi />
    </div>
  )
}

export default App

okey on laisse comme ca d'abord
Maintenant on laisse le test et on va passer au vrai affichage des donnees pas en format json

On va traiter d'abord le Tickets
On va creer un service qui recuperera les donnees du ticket (on peut utiliser display=full si necessaire), puison cree la page