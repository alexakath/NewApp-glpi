## Le principe des coûts de ticket

Un ticket GLPI représente une **intervention** (une panne, une demande, etc.). Les coûts permettent de répondre à la question : **"Combien cette intervention a-t-elle coûté à l'entreprise ?"**

---

### Les 3 composantes d'un coût

**1. La durée**
Le temps passé sur l'intervention. Ex : un technicien a travaillé 1h30 sur le problème.

**2. Le coût horaire (€/h)**
Le tarif de la main d'œuvre. Ex : ce technicien coûte 50 €/h à l'entreprise.

**3. Le coût fixe (€)**
Une dépense unique indépendante du temps. Ex : une pièce achetée, un déplacement, une licence logicielle.

---

### La formule

```
Total d'une ligne = (durée en heures × coût horaire) + coût fixe
```

---

### Exemple concret

Imaginez un technicien qui intervient pour réparer un ordinateur :

| Ce qu'il fait | Durée | Coût/h | Coût fixe | Total |
|---|---|---|---|---|
| Main d'œuvre | 2h00 | 50 €/h | 0 € | **100 €** |
| Pièce de rechange achetée | 0h00 | 0 €/h | 35 € | **35 €** |
| **Total du ticket** | | | | **135 €** |

La pièce n'a pas de durée — c'est un achat, donc coût fixe. Le travail du technicien n'a pas de coût fixe — c'est du temps facturé à l'heure.

---

### Pourquoi plusieurs lignes ?

Parce qu'une intervention peut avoir **plusieurs natures de dépenses** en même temps. Vous pouvez en ajouter autant que nécessaire, et GLPI/NewApp additionne tout pour donner le coût total du ticket.
