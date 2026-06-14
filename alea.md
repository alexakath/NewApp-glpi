mamindra makany am termine dia manampy cout amle boite de dialogue : cout fixe, dia stockena anaty sqlite

page pour afficher cout : liste item (Asset) ou filtre , cout anaty import , cout fixe (vaovao) : ra ticket ray associe am elements roa dia zaraina  selon anle nbr (ra roa dia zaraina roa ra telo dia zaraina telo) le cout na le fixe, 


ticket afaka ahembotra : ao am in progress 
refa averina
boite de dialogue mipotra dia misy bouton ray : annulation : diso tam nandefa anazy, fafana le cout nataony sasie farany (le tam closed) : super cost (le dernier)

aussi un bouton reouverture qui permet de mettre une pourcentage par rapport au dernier cout : supercost qui sera le cout de reouverture, par exemple si je mets 10% dans le champ pour la reouverture, le cout de reouverture sera 10% par rapport au supercost
ex: si dernier cout = 95 et dans le champ reouverture je mets 10% alors le cout de reouverture est 9,5

Scénarios de gestion des tickets
🟢 Scénario 1 — Résolution initiale
TicketStatut initialStatut finalCoûtTicket "ne fonctionne pas"NouveauTerminé100Ticket "surchauffe"NouveauTerminé150

🔄 Scénario 2 — Réouverture après clôture
TicketStatut initialStatut suivantTaux de réouvertureTicket "ne fonctionne pas"TerminéEn cours5%Ticket "surchauffe"TerminéEn cours10%

✅ Scénario 3 — Clôture après réouverture
TicketStatut initialStatut finalCoûtTicket "ne fonctionne pas"En coursTerminé45Ticket "surchauffe"En coursTerminé150

❌ Scénario 4 — Annulation après réouverture
TicketStatut initialStatut suivantActionTicket "surchauffe"TerminéEn coursAnnulation


Flux global :

Nouveau → Terminé → En cours (réouverture) → Terminé (ou Annulé)