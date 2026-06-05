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

| Lister tous les tickets | `GET`    | `/api.php/v2.3/Assistance/Ticket`                   |

| Voir un ticket précis   | `GET`    | `/api.php/v2.3/Assistance/Ticket/{id}`              |

| Créer un ticket         | `POST`   | `/api.php/v2.3/Assistance/Ticket`                   |

| Modifier un ticket      | `PUT`    | `/api.php/v2.3/Assistance/Ticket/{id}`              |

| Supprimer un ticket     | `DELETE` | `/api.php/v2.3/Assistance/Ticket/{id}`              |

| Lister les problèmes    | `GET`    | `/api.php/v2.3/Assistance/Problem`                  |

| Lister les changements  | `GET`    | `/api.php/v2.3/Assistance/Change`                   |

| Suivis d'un ticket      | `GET`    | `/api.php/v2.3/Assistance/Ticket/{id}/ITILFollowup` |

| Solutions d'un ticket   | `GET`    | `/api.php/v2.3/Assistance/Ticket/{id}/ITILSolution` |

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