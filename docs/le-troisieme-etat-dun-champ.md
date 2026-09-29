# Repris du projet, et modifiable

**À quoi sert cette page :** la ronde d'avant a donné au bac un « Où l'on se
place », et laissé une gêne — on **voyait** ce que le projet tient sans pouvoir
en partir. Cette page dit pourquoi il fallait un troisième état plutôt qu'un
choix entre les deux autres.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Les deux mauvaises réponses

**Laisser le champ vide** et écrire « du projet : alu » dessous. C'est ce qu'on
faisait. On lit la valeur, on ne peut pas la corriger d'un caractère : il faut
la retaper, en la recopiant de la ligne du dessous. Pour « 2,70 m » qu'on veut
passer à « 2,75 m », c'est absurde.

**Poser la valeur dans le champ** et ne rien dire. Elle devient indiscernable
d'une réponse : l'écran ne dit plus d'où elle vient, et l'on ne sait plus si
c'est le projet qui répond ou soi-même (règle 5). Pire, elle donnerait le
sentiment d'avoir rempli le formulaire — et un champ qu'on croit avoir rempli
est un champ qu'on ne relit pas.

## Le troisième état

La valeur est **dans** le champ, et le champ dit qu'elle n'est pas de nous : un
trait à gauche, le texte en gris, et « du projet » dessous. On peut partir
d'elle. Dès qu'on y touche, le trait part — le champ est à nous.

```
repris du projet          répondu, différent        répondu, identique
┃ alu           ▾         bois            ▾         alu             ▾
du projet                 du projet : alu  revenir
```

**Répondu, le rappel change de rôle.** Il ne dit plus d'où vient ce qu'on voit —
on l'a tapé — mais ce que le projet disait, qui est alors la seule chose qu'on
ne peut plus lire nulle part. Et il offre d'y revenir.

**Répondu à l'identique, il n'y a rien à dire.** Taper exactement ce que le
projet dit n'est pas le corriger : proposer d'y « revenir » serait offrir de
défaire ce qui n'a pas été fait.

## Ce que cela ne change pas

**Rien de ce que l'essai calcule.** C'est le piège du troisième état, et il est
silencieux : si le champ rempli comptait pour une réponse, le sélecteur de zone
changerait de zone **sans changer de valeurs** — on garderait le bâtiment A en
croyant lire le B.

Le lancement ne reçoit que les **réponses**, et un champ repris n'en pose
aucune. Une épreuve le tient, parce que c'est le genre de défaut qui ne se voit
pas : tout paraît juste, et les chiffres sont ceux d'ailleurs.

---

## Ce qu'il a fallu séparer

**La frappe ne redessine jamais**, parce que le doigt est posé sur le champ.
**Revenir repose le champ**, parce qu'on vient de cliquer un bouton et que la
valeur à y remettre n'est pas celle qu'il porte.

Les deux vivaient dans un seul branchement, et la garde qui interdit de
redessiner y était posée. Elle interdisait donc aussi ce qu'il fallait faire.
Ils sont séparés : `brancherLesSaisies` ne redessine rien, `brancherLesRetours`
repose un champ — le sien, jamais le bac entier, sinon le voisin perdrait son
curseur.

**Un seul dessin pour un champ.** Revenir repose le champ avec `renderUnChamp`,
celui-là même qui l'a dessiné la première fois. Un second dessin écrit pour le
retour aurait fini par ne plus ressembler au premier (règle 4), et c'est celui
qu'on ne regarde pas qui a raison le jour où l'on cherche.

**La note a toujours sa place, même vide.** Elle change à la frappe, et un
emplacement qui existe déjà se remplit en une ligne. La première version
insérait, remplaçait ou retirait un nœud selon les cas : trois chemins pour une
question — que dit le projet, maintenant ?

---

## Ce que la ronde a appris

**Une garde posée trop haut cesse de mordre quand le code bouge.** Elle visait
« le branchement du bac » ; le branchement est devenu quatre appels, et elle
passait sur tout. Elle vise maintenant la fonction où la frappe est écoutée —
là où la faute se commettrait.

**Deux formes de marque, et une seule se défaisait.** Un champ de texte porte
sa marque ; un oui/non la porte sur l'enveloppe de ses deux boutons. Le code
retirait la première et oubliait la seconde : un oui/non repris du projet
gardait son trait après qu'on l'avait choisi. Trouvé en relisant, pas en
cassant — la batterie ne l'a pas vu, parce que l'épreuve d'alors ne regardait
qu'une des deux formes.

**Ce qui ne se laisse pas casser mérite qu'on regarde pourquoi.** La seule
survivante de la batterie était le retrait de la réponse — ce que « revenir »
fait de plus essentiel. La garde vérifiait que le champ est reposé, jamais que
la réponse est retirée : le bouton aurait eu l'air de marcher, et n'aurait rien
fait.
