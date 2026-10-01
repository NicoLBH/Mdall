# D'où vient une exécution, et dans quel onglet elle se range

Le journal des Actions a quatre vues. **Toutes les actions** ne range rien : c'est
l'union. Les trois autres rangent, et la question « laquelle ? » revenait à chaque
nouveau travail — lecture de comptes rendus, dépôt de messagerie, et ce qui
viendra.

Elle revenait parce qu'on répondait à l'instinct, et l'instinct dit « d'où j'ai
cliqué ». Cette réponse-là ne tient pas : **on verse des mails depuis Fichiers, on
lit des comptes rendus depuis l'Atelier**, et demain on fera les deux d'ailleurs.
Une règle fondée sur l'écran de départ change à chaque bouton déplacé.

## La règle

Trois questions, **dans cet ordre**. La première qui répond « oui » décide.

1. **Tout le projet la lit ?** → **Partagées**.
2. **Sinon : a-t-elle fait entrer de la matière dans le projet ?** → **Versements**.
3. **Sinon : c'est un essai.** → **Atelier**.

En une phrase, pour l'écran :

> **Partagées**, c'est ce que le projet a vu.
> **Versements**, c'est ce que vous avez apporté.
> **Atelier**, c'est ce que vous avez essayé.

## Ce que la règle décide, et pourquoi

**Un dépôt de messagerie → Versements.** Des fichiers sont entrés dans le projet
et ils y restent. Ce n'est pas un essai : on ne le relance pas pour voir.

**Une lecture de comptes rendus → Atelier.** Elle relit des documents **déjà là**
— c'est là qu'on vient de les choisir — et n'en fait entrer aucun. Ce qu'elle
produit est une proposition, c'est-à-dire un essai tant que personne ne l'a
signée : rien n'entre dans la mémoire sans une proposition signée (règle 1).

Elle s'affichait sous « Versements », où l'on cherche ce qu'on a **apporté**. On
l'y cherchait donc pour rien, et on la trouvait là où elle n'avait rien à faire.

**Une fusion de proposition → Partagées.** La mémoire du projet a changé ; tout
le monde la lit.

## Ce que la règle ne décide pas

**Elle ne protège rien.** C'est la base qui tient la confidentialité, sur la
colonne `personnelle` de `project_runs` — pas sur le geste, et surtout pas sur
cette règle. Si elle se trompait, on verrait **mal rangé**, jamais indûment.

Les deux faits restent séparés, et c'est ce qui permet de ne pas mentir :

- `origine` dit **où ça se range** ;
- `privee` dit **qui a le droit de la voir**.

Une exécution d'Atelier écrite avant le cloisonnement vient bien de l'Atelier et
reste pourtant lisible par tout le monde. L'écran le dit, au lieu de la ranger
sous une promesse qu'elle ne tient pas.

## Où elle est écrite

Dans `apps/web/js/services/run-partition.js`, `LORIGINE_DUN_GESTE` — une entrée
par geste de la file. Un geste qui n'y figure pas ne rend **aucune** origine :
ne pas savoir n'autorise pas à ranger dans « Partagées », ce qui reviendrait à
annoncer comme partagé ce qu'on n'a pas lu (règle 5).

Un nouveau travail long s'ajoute donc là, et nulle part ailleurs.
