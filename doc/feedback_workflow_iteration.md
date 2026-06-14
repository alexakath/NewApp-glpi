---
name: feedback-workflow-iteration
description: "Workflow rapide attendu pour ce projet — implémenter vite, vérifier au navigateur, puis donner un compte-rendu précis fichier/ligne"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 82416f0d-6a3f-41c9-b3b0-7f50c25b82ab
---

L'utilisateur veut un cycle d'itération rapide (5-8 min) :

1. L'utilisateur décrit brièvement la fonctionnalité à implémenter.
2. Modifier le code directement et rapidement, sans détour ni sur-ingénierie.
3. Utiliser l'extension navigateur de VS Code pour vérifier le résultat visuellement.
4. Une fois validé, donner un compte-rendu TRÈS détaillé et précis : fichier par fichier, avec localisation exacte (ex: "après la ligne 146 : ajout de...", "suppression de la ligne X", "remplacement de Y par Z").
5. Si le même changement doit être reporté dans du code similaire/dupliqué ailleurs (l'utilisateur recopie dans un autre projet identique au même stade d'avancement), ne pas tout réexpliquer : dire simplement "copie-colle ceci et change cela / ajoute cela".

**INTERDIT (correction explicite) :** Ne JAMAIS dire "copie-colle tout le contenu du fichier" comme méthode de report. Le compte-rendu doit être un diff précis ligne par ligne : pour chaque édition, donner la plage de lignes ORIGINALE concernée, le code "avant" (ou juste "supprimer lignes X-Y" pour une suppression pure), et le code "après" exact à coller. Le raccourci "copie-colle ceci et change cela" ne s'applique QUE quand du code existant ailleurs dans LEUR AUTRE projet (pas dans la version que j'ai modifiée) est identique/similaire et réutilisable tel quel — jamais comme substitut au diff précis.

**Why:** L'utilisateur réplique ce projet dans un autre dossier VS Code au même état d'avancement et doit reporter manuellement les modifs — il a besoin d'instructions exactes et localisées pour ne pas perdre de temps et ne pas faire d'erreurs. Pas de temps à perdre, "pas le droit aux erreurs". Recopier un fichier entier est jugé inacceptable (trop risqué/long).

**How to apply:** Pour chaque demande de fonctionnalité dans ce projet (NewApp-glpi), suivre ce cycle. Pour le compte-rendu final : utiliser `git diff` sur les fichiers modifiés pour extraire les hunks avec numéros de ligne exacts, puis traduire chaque hunk en instruction "remplace lignes X-Y par / supprime lignes X-Y / ajoute après ligne X". Privilégier la concision pendant l'implémentation, puis être exhaustif et précis (ligne par ligne, avec extraits de code) uniquement dans le compte-rendu final post-validation.
