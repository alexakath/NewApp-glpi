# Module Administration

## Sous-modules

**Utilisateurs**
Gestion de tous les comptes utilisateurs GLPI — création, modification, désactivation. Chaque utilisateur a un login, un email, un profil assigné et peut être rattaché à une entité. C'est ici qu'on génère aussi les User Tokens pour l'API.

**Groupes**
Permet de regrouper des utilisateurs par équipe (ex: "Équipe réseau", "Support N1"). Un ticket peut être assigné à un groupe entier plutôt qu'à une seule personne.

**Entités**
Structure hiérarchique de l'organisation. Ex: une entreprise avec plusieurs filiales/sites — chaque site est une entité. Les données (tickets, assets) sont cloisonnées par entité. C'est le concept organisationnel le plus important de GLPI.

**Règles**
Moteur de règles automatiques — ex: "Si un ticket contient le mot 'serveur', l'assigner automatiquement au groupe réseau". Permet d'automatiser le routage et la gestion.

**Dictionnaires**
Normalisation des données importées — ex: si l'inventaire remonte "Microsoft Windows 11" et "Win11", le dictionnaire unifie ça en une seule entrée propre.

**Profils**
Définit les droits et permissions d'un rôle (ex: Technicien, Admin, Observateur). Chaque utilisateur reçoit un profil qui détermine ce qu'il peut voir et faire dans GLPI.

**File d'attente des notifications**
Liste des emails/alertes en attente d'envoi (notifications de tickets, alertes d'expiration de contrat, etc.). Utile pour déboguer si les mails ne partent pas.

**Journaux**
Historique complet de toutes les actions faites dans GLPI — qui a fait quoi, quand. Indispensable pour l'audit et le débogage.

**Inventaire**
Configuration de l'agent d'inventaire automatique (GLPI Agent) qui scanne le réseau et remonte les équipements directement dans le module Parc.

**Formulaires**
Création de formulaires personnalisés pour les demandes utilisateurs — comme un formulaire "Demande de nouveau matériel" avec des champs spécifiques, accessible depuis le portail utilisateur.

---

## URLs API

| Action                   | Méthode  | URL                        |

| Lister les utilisateurs  | `GET`    | `/apirest.php/User`        |

| Voir un utilisateur      | `GET`    | `/apirest.php/User/{id}`   |

| Créer un utilisateur     | `POST`   | `/apirest.php/User`        |

| Modifier un utilisateur  | `PUT`    | `/apirest.php/User/{id}`   |

| Supprimer un utilisateur | `DELETE` | `/apirest.php/User/{id}`   |

| Lister les groupes       | `GET`    | `/apirest.php/Group`       |

| Voir un groupe           | `GET`    | `/apirest.php/Group/{id}`  |

| Lister les entités       | `GET`    | `/apirest.php/Entity`      |

| Voir une entité          | `GET`    | `/apirest.php/Entity/{id}` |

| Lister les profils       | `GET`    | `/apirest.php/Profile`     |

---

## Champs importants d'un utilisateur (réponse JSON)

| Champ | Signification |
|---|---|
| `id` | Identifiant unique |
| `name` | Login de l'utilisateur |
| `firstname` | Prénom |
| `realname` | Nom de famille |
| `email` | Adresse email (via sous-objet) |
| `profiles_id` | ID du profil assigné |
| `entities_id` | ID de l'entité de rattachement |
| `is_active` | `1` = actif, `0` = désactivé |
| `date_creation` | Date de création du compte |

---

## Valeurs importantes

### is_active
| Valeur | Signification |
|---|---|
| `1` | Utilisateur actif |
| `0` | Utilisateur désactivé |