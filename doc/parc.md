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

| Lister les ordinateurs        | `GET`    | `/api.php/v2.3/Assets/Computer`         |

| Voir un ordinateur            | `GET`    | `/api.php/v2.3/Assets/Computer/{id}`    |

| Créer un ordinateur           | `POST`   | `/api.php/v2.3/Assets/Computer`         |

| Modifier un ordinateur        | `PUT`    | `/api.php/v2.3/Assets/Computer/{id}`    |

| Supprimer un ordinateur       | `DELETE` | `/api.php/v2.3/Assets/Computer/{id}`    |

| Lister les moniteurs          | `GET`    | `/api.php/v2.3/Assets/Monitor`          |

| Lister les logiciels          | `GET`    | `/api.php/v2.3/Assets/Software`         |

| Lister les matériels réseau   | `GET`    | `/api.php/v2.3/Assets/NetworkEquipment` |

| Lister les périphériques      | `GET`    | `/api.php/v2.3/Assets/Peripheral`       |

| Lister les imprimantes        | `GET`    | `/api.php/v2.3/Assets/Printer`          |

| Lister les téléphones         | `GET`    | `/api.php/v2.3/Assets/Phone`            |

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