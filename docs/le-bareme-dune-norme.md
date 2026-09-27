# Le barème : quand la loi est un tableau, on écrit un tableau

**À quoi sert cette page :** quatre-vingt-dix pour cent des utilitaires du
bâtiment sont un tableau à double entrée et trois notes. Cette page dit pourquoi
cette forme entre dans le langage, pourquoi elle n'ajoute **aucune grammaire**,
et la seule règle qu'elle demande d'apprendre.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le verrou

Une norme, un DTU, un Eurocode, un arrêté, un guide technique, une instruction
technique. Il y en a des milliers, et personne ne peut les transcrire tous — ce
qui est exactement la raison d'être de l'établi : que les utilisateurs fassent
leurs propres utilitaires.

Encore faut-il que ce soit rapide. Écrit en `si … sinon si …`, l'article 96 de
l'arrêté du 31 janvier 1986 fait quarante lignes que **personne ne compare à
l'original**. Deux heures de transcription, et une relecture impossible.

Écrit en barème, il ressemble à l'arrêté :

```
fonction Degré coupe-feu des blocs-portes(zones, Famille, Hauteur du plancher bas) {
   // Arrêté du 31 janvier 1986, article 96.
   selon (Famille, Hauteur du plancher bas)
      | 3e famille A | <= 28 m | CF 1/2 h |
      | 3e famille B | <= 28 m | CF 1 h   |
      | 4e famille   | > 28 m  | CF 1 h   |
   sinon ("non traité");
}
```

**L'auteur recopie. Le contrôleur compare ligne à ligne.** C'est tout le gain, et
il est grand : le coût de transcription d'une norme passe de deux heures à dix
minutes, et la vérification devient possible.

## Ce que cette forme n'ajoute pas

**Aucune grammaire.** C'est le point qui la rend sûre, et il tient en une phrase :

> Un barème **est** une suite de branches, écrite autrement.

`selon` déclare les colonnes ; chaque ligne devient exactement ce qu'un
`si … sinon si …` aurait produit. La première ligne est la tête de la règle, les
suivantes enchaînent. **L'évaluateur, la trace, le graphe, le rejeu et la
variante ne changent pas d'une ligne** — ils ne savent même pas qu'un barème
existe.

`selon` ne dit donc qu'une chose : **sous quelle forme la fonction a été
écrite**, pour la réécrire ainsi. Garder les cases à côté des branches en ferait
deux vérités, et deux vérités finissent par diverger (règle 4).

C'est l'application du partage qui gouverne tout le langage : *ajouter des noms,
pas des structures de contrôle.*

## La seule règle à apprendre

> **Une case nue est un libellé, jamais une mesure.**

`3e famille B` se lit tel quel. Pour comparer un nombre, on écrit son
comparateur — `<= 28 m`, ou `= 28 m` pour l'égalité.

Cette règle n'est pas une commodité : elle vient d'un défaut qu'on a vu tourner.
`3e famille B` se lisait comme le nombre **3** suivi de l'unité « e famille B » —
la lecture des mesures, qui a raison sur `28 m`. Deux lignes voisines portaient
donc la même valeur, le barème tombait dans son `sinon`, et **le tableau avait
l'air juste**. Un tableau qui répond à côté est ce que cette langue refuse
partout ailleurs.

Le défaut est plus ancien que le barème : `si (Famille = 3e famille B)` en
souffre aussi, et s'écrit donc `si (Famille = "3e famille B")`. Dans un barème,
les guillemets sont inutiles — la case *est* un libellé, c'est la règle.

## Le reste se déduit

- les colonnes se lisent **dans l'ordre de `selon`**, et la **dernière case de
  chaque ligne est ce qu'elle conclut** ;
- la **première ligne qui tient l'emporte**, comme pour `sinon si` : l'ordre
  écrit est le sens, et le cas le plus particulier se range en premier ;
- une **case blanche ne contraint rien** — c'est ce qu'impriment les normes
  quand une ligne vaut quelle que soit la colonne. L'inventer en « = vide »
  ferait une ligne qui ne tient jamais ;
- une case porte un `ou` comme ailleurs — `bois ou métal` — et un constat —
  `renseigné` ;
- les barres du bord sont facultatives : un tableau se recopie d'un texte, et
  tous ne les impriment pas.

## Un barème s'écrit seul

Pas de `si` ni de `sinon si` à côté : mêlés, on ne peut lire la règle ni comme
l'un ni comme l'autre, et l'ordre des cas ne se verrait nulle part. Les deux
refus le disent et proposent la forme correcte.

`sinon (…)` et `sauf si (…)` restent, eux — ils valent pour le tableau entier, et
les normes en portent (« sauf pour les bâtiments existants »).

## L'alignement n'est pas de la coquetterie

Un tableau qu'on ne peut pas lire en colonnes n'est plus un tableau : c'est une
suite de lignes, et l'œil ne compare plus rien. L'écriture aligne donc les
colonnes — **c'est ce pour quoi cette forme existe**.

Et la relecture doit être exacte au caractère près : l'éditeur remplace la ligne
par ses jetons colorés, et un espace perdu décalerait la colonne qu'on est venu
comparer. Une épreuve le vérifie, y compris sur `| oui | oui |` — deux colonnes
qui portent le même mot, où retrouver chaque case par une expression régulière
rendait deux fois la première.

## Un défaut trouvé en chemin, et il était plus vieux que ce lot

**Une règle versée réécrivait une seule branche.** L'écran des fichiers ne
passait pas `sinonSi` à l'écriture : une règle à trois cas s'affichait avec un
seul, les deux autres disparaissaient sans un mot, et la fonction avait l'air
simple alors qu'elle ne l'était pas. La signature n'y déclarait pas non plus les
entrées que seules les branches lisent.

C'est le câblage entre la mémoire et son écriture — la seule chose qu'une
fonction pure ne peut pas éprouver, et la maladie que ce dépôt trouve à chaque
lot.

## Quand employer un barème

Dès que la phrase décrit un tableau, ou qu'on écrirait trois branches ou plus qui
comparent les **mêmes** noms. En dessous, `si … sinon si` se lit mieux.

## Où ça vit

| ce qu'on cherche | où |
| --- | --- |
| la lecture d'un barème, ses cases et ses refus | `apps/web/js/services/memoire-en-lecture.js` |
| une case sous sa colonne | `memoire-en-lecture.js` — `clauseDuBareme` |
| l'écriture, et l'alignement des colonnes | `apps/web/js/services/memoire-en-texte.js` — `lignesDuBareme` |
| ce que l'écran des fichiers réécrit | `apps/web/js/views/project-memoire-fichiers.js` |
| ce que le modèle en sait | `supabase/functions/_shared/mdall-du-modele.js` |
| ce que l'utilisateur en lit | `apps/web/js/contenus/wiki-du-langage-mdall.js` |
| la langue entière | `docs/langage-mdall.md`, `docs/ecrire-en-mdall.md` |
