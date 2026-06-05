# Module Gestion

## Sous-modules

**Licences**
Gestion des licences logicielles de l'entreprise — nombre de licences achetées, utilisées, expirées. Permet de suivre la conformité légale (ex: "On a 50 licences Office, 47 sont utilisées").

**Budgets**
Suivi des budgets IT — chaque achat de matériel ou logiciel peut être rattaché à un budget. Permet de voir combien a été dépensé vs ce qui était prévu.

**Fournisseurs**
Répertoire des fournisseurs (Dell, Microsoft, prestataires...). Liés aux contrats et aux équipements achetés. Permet de savoir à qui acheter quoi et qui contacter en cas de problème.

**Contacts**
Contacts humains chez les fournisseurs — nom, email, téléphone. Rattachés aux fournisseurs et aux contrats.

**Contrats**
Gestion des contrats de maintenance, de support ou d'achat. A une date de début, une date de fin, et peut déclencher des alertes à l'approche de l'expiration.

**Documents**
Espace de stockage de fichiers liés aux assets ou tickets — bons de commande, manuels, factures, photos. Tout document utile peut être attaché à n'importe quel objet GLPI.

**Lignes téléphoniques**
Gestion des lignes téléphoniques (fixes ou mobiles) de l'entreprise, assignées à des utilisateurs ou des lieux.

**Certificats**
Suivi des certificats SSL/TLS et autres certificats numériques — avec leur date d'expiration pour éviter les coupures de service.

**Data centers**
Représentation physique des salles serveurs — liste des datacenters avec leur localisation, capacité, consommation électrique.

**Clusters**
Gestion des clusters de serveurs (groupes de serveurs qui travaillent ensemble pour la haute disponibilité).

**Domaines**
Gestion des noms de domaine de l'entreprise (ex: monentreprise.com) avec dates d'expiration et registrar.

**Applicatifs**
Gestion des applications métier (ex: ERP, CRM, intranet) — différent des logiciels du Parc, ici c'est l'application en tant que service rendu, pas le logiciel installé sur un PC.

**Bases de données**
Inventaire des bases de données (MySQL, PostgreSQL, Oracle...) avec leur serveur d'hébergement, version et application associée.

---

## URLs API

| Action                    | Méthode | URL                                           |

| Lister les licences       | `GET`   | `/api.php/v2.3/Management/SoftwareLicense`      |

| Voir une licence          | `GET`   | `/api.php/v2.3/Management/SoftwareLicense/{id}` |

| Lister les budgets        | `GET`   | `/api.php/v2.3/Management/Budget`               |

| Voir un budget            | `GET`   | `/api.php/v2.3/Management/Budget/{id}`          |

| Créer un budget           | `POST`  | `/api.php/v2.3/Management/Budget`               |

| Modifier un budget        | `PUT`   | `/api.php/v2.3/Management/Budget/{id}`          |

| Lister les fournisseurs   | `GET`   | `/api.php/v2.3/Management/Supplier`             |

| Voir un fournisseur       | `GET`   | `/api.php/v2.3/Management/Supplier/{id}`        |

| Lister les contacts       | `GET`   | `/api.php/v2.3/Management/Contact`              |

| Lister les contrats       | `GET`   | `/api.php/v2.3/Management/Contract`             |

| Voir un contrat           | `GET`   | `/api.php/v2.3/Management/Contract/{id}`        |

| Lister les documents      | `GET`   | `/api.php/v2.3/Management/Document`             |

| Lister les certificats    | `GET`   | `/api.php/v2.3/Management/Certificate`          |

| Lister les domaines       | `GET`   | `/api.php/v2.3/Management/Domain`               |

| Lister les applicatifs    | `GET`   | `/api.php/v2.3/Management/SoftwareVersion`      |

---

## Champs importants d'un contrat (réponse JSON)

| Champ | Signification |
|---|---|
| `id` | Identifiant unique |
| `name` | Nom du contrat |
| `num` | Numéro de contrat |
| `suppliers_id` | ID du fournisseur lié |
| `begin_date` | Date de début |
| `duration` | Durée en mois |
| `notice` | Délai de préavis en mois |
| `budget_id` | ID du budget associé |
| `is_deleted` | `1` = archivé |

---

## Champs importants d'un budget (réponse JSON)

| Champ | Signification |
|---|---|
| `id` | Identifiant unique |
| `name` | Nom du budget |
| `value` | Montant total alloué |
| `begin_date` | Date de début |
| `end_date` | Date de fin |
| `entities_id` | Entité propriétaire du budget |