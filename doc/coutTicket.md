Les coûts d'un ticket dans GLPI
Un ticket peut avoir plusieurs lignes de coût. Chaque ligne représente une intervention ou une dépense liée à ce ticket.

Ton CSV 3
Num_Ticket, Duration_second, Time_Cost, Fixed_Cost
1,          0,               0,         109
1,          600,             8.7,       50
Le ticket 1 a 2 lignes de coût.

Ce que signifie chaque champ
Duration_second — le temps passé sur l'intervention
0   → technicien n'a pas encore travaillé dessus
600 → technicien a travaillé 10 minutes
Time_Cost — le coût horaire du technicien (€/heure)
0   → gratuit / non renseigné
8.7 → 8,70€ par heure
Fixed_Cost — coût fixe indépendant du temps
109€ → ex: pièce achetée, déplacement...
50€  → ex: autre frais fixe

Le coût total d'une ligne
Coût total = (Duration_second / 3600 × Time_Cost) + Fixed_Cost

Ligne 1 : (0 / 3600 × 0) + 109     = 109€
Ligne 2 : (600 / 3600 × 8.7) + 50  = 1.45 + 50 = 51.45€

Total ticket 1 : 109 + 51.45 = 160.45€

Ce que tu afficheras dans la fiche ticket
DuréeCoût/hCoût fixeTotal ligne0h000€109€109€0h108,70€50€51,45€Total160,45€