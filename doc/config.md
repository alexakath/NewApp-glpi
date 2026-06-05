# Module Configuration

## Sous-modules

**Actifs personnalisés**
Permet de créer des types d'actifs sur mesure qui n'existent pas nativement dans GLPI (ex: "Badge d'accès", "Véhicule de société"). Très utile pour adapter GLPI aux besoins spécifiques de l'entreprise.

**Intitulés**
Gestion de toutes les listes déroulantes de GLPI — statuts, catégories, types, localisations, systèmes d'exploitation, etc. C'est ici qu'on personnalise les valeurs disponibles dans les formulaires.

**Composants**
Référentiel des composants matériels (processeurs, RAM, disques durs, cartes réseau...) qui peuvent être associés aux ordinateurs du Parc.

**Notifications**
Configuration des alertes automatiques envoyées par email — ex: "Notifier le technicien quand un ticket lui est assigné", "Alerter l'admin 30 jours avant l'expiration d'un contrat". Définit quoi envoyer, à qui, et quand.

**Webhooks**
Configuration d'appels HTTP automatiques vers des systèmes externes lors d'événements GLPI (ex: envoyer une notification dans Slack quand un ticket prioritaire est créé). Clé pour les intégrations avec d'autres outils.

**Niveaux de services (SLA)**
Définition des SLA (Service Level Agreements) — délais maximaux de prise en charge et de résolution selon la priorité d'un ticket. Ex: ticket haute priorité = réponse en 1h, résolution en 4h.

**Générale**
Paramètres globaux de l'instance GLPI — nom du helpdesk, fuseau horaire, langue par défaut, configuration de l'URL, et surtout **activation et configuration de l'API REST** (App-Token, accès).

**Unicité des champs**
Définit des règles d'unicité pour éviter les doublons — ex: deux ordinateurs ne peuvent pas avoir le même numéro de série.

**Actions automatiques**
Tâches planifiées qui tournent en arrière-plan — nettoyage des sessions expirées, envoi des notifications en attente, calcul des SLA, synchronisation LDAP. Équivalent d'un cron job dans GLPI.

**Authentification**
Configuration des méthodes de connexion — login local GLPI, LDAP/Active Directory, SSO, CAS. Permet de connecter GLPI à l'annuaire d'entreprise.

**Clients OAuth**
Gestion des clients OAuth2 pour l'API v2 de GLPI — création des applications tierces autorisées à se connecter à GLPI via OAuth (la nouvelle méthode d'authentification API de GLPI 11).

**Collecteurs**
Configuration des boîtes mail que GLPI surveille pour créer automatiquement des tickets depuis les emails reçus (ex: support@monentreprise.com → chaque email crée un ticket).

**Liens externes**
Création de liens rapides vers des outils externes accessibles depuis une fiche d'actif (ex: lien vers l'interface d'administration d'un serveur directement depuis sa fiche GLPI).

**Plugins**
Gestion des extensions GLPI — installation, activation, désactivation des plugins qui ajoutent des fonctionnalités (ex: plugin FusionInventory pour l'inventaire automatique).

---

## URLs API

| Action                                    | Méthode | URL                               |

| Lister les intitulés (catégories tickets) | `GET`   | `/api.php/v2.3/ITILCategory`       |

| Voir un intitulé                          | `GET`   |  `/api.php/v2.3/ITILCategory/{id}` |

| Lister les localisations                  | `GET`   | `/api.php/v2.3/Location`           |

| Voir une localisation                     | `GET`   | `/api.php/v2.3/Location/{id}`      |

| Lister les statuts d'actifs               | `GET`   | `/api.php/v2.3/State`              |

| Lister les composants (CPU)               | `GET`   | `/api.php/v2.3/DeviceProcessor`    |

| Lister les composants (RAM)               | `GET`   | `/api.php/v2.3/DeviceMemory`       |

| Lister les notifications                  | `GET`   | `/api.php/v2.3/Notification`       |

| Lister les SLA                            | `GET`   | `/api.php/v2.3/SLA`                |

| Voir un SLA                               | `GET`   | `/api.php/v2.3/SLA/{id}`           |

---

## Champs importants — Paramètres Générale (API)

C'est dans **Configuration > Générale > onglet API** que se trouvent les réglages critiques pour notre projet :

| Paramètre | Rôle |

| Activer l'API REST | Active/désactive tout accès API |
| URL de l'API | `http://localhost/glpi/apirest.php` |
| Activer la connexion avec credentials | Permet le login via user/password |
| Clients API | Liste des App-Tokens autorisés |

---

## Valeurs importantes — SLA

| Champ | Signification |

| `id` | Identifiant unique |
| `name` | Nom du SLA |
| `type` | `1` = Délai de prise en charge, `2` = Délai de résolution |
| `number_time` | Durée |
| `definition_time` | Unité : `minute`, `hour`, `day` |