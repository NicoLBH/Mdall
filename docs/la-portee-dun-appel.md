# La portée d'un appel, et les trois cases qui restaient

**À quoi sert cette page :** quatre points notés `à traiter plus tard` par les
rondes précédentes, traités ensemble parce qu'ils sont un seul sujet — **ce
qu'un appel vaut vraiment**.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## 1. Une condition porte un appel

`si (Couleur des volets(zones, Matériau) = "violet")` est ce qu'on écrit
naturellement, et il fallait passer par une locale. Une ligne de plus que la
langue n'exigeait pas.

**Le sujet reste le nom de la fonction**, et l'appel voyage à côté
(`condition.appel`). Tout ce qui lit un sujet comme un nom — le graphe des
dépendances, la recherche d'un nom jamais déclaré, la liste de ce qu'un bloc
lit — continue donc de lire un nom, et ne voit pas la différence. Ranger la
ligne entière dans `sujet` aurait fait porter la moitié du projet sur un nom que
personne n'a écrit.

L'appel se repose **tel qu'il a été tapé** (`appel.ecrit`). Le réécrire depuis
son arbre demanderait un second écrivain d'expressions, qui finirait par ne plus
poser les parenthèses comme le premier (règle 4).

Ce qui n'est pas un appel **lisible** garde son refus : un nom ne porte pas de
parenthèse, et une condition acceptée sur un tel nom resterait indécidable pour
toujours (règle 5).

---

## 2. La valeur donnée, comparée à ce que la fonction sait lire

**C'est la faute que l'appel rend possible.** Tant qu'une fonction ne lisait que
ses propres noms, son domaine et celui qu'elle lit étaient le même. Depuis qu'on
lui donne un autre nom, les deux peuvent diverger :

> « Couleur des volets » lit « Nature des volets », qui ne vaut que « bois »,
> « pvc ». « Matériau » peut valoir « alu » : pour ces valeurs-là, elle répondra
> son « sinon » sans rien en dire.

Un résultat plausible et faux est la seule faute que cette langue ne pardonne
pas, et celle-ci ne se voyait nulle part.

**Il faut deux domaines fermés** pour qu'il y ait une comparaison à faire. À
défaut on se tait : ne pas savoir n'autorise pas à prétendre qu'il n'y a rien,
ni l'inverse. Et **la portée n'est pas comparée** — elle dit où, pas quoi ; la
confondre avec le premier paramètre décalait tout le contrôle d'un rang.

Les fonctions de la **mémoire** restent hors de portée de ce contrôle : la
vérification ne reçoit que des fichiers. C'est noté.

---

## 3. L'ordre, montré en tapant la parenthèse

L'aide disait *ce que* la fonction lit ; jamais **dans quel ordre**. Depuis
qu'on lui donne des valeurs, l'ordre **est** l'information — et c'est sa
signature qui le dit, portée comprise.

Ce n'est pas la même donnée que `lit` : `lit` écarte la portée et ne suit pas la
signature, qui est justement ce qu'un appel mire. Les deux vivent donc côte à
côte sur l'entrée du catalogue, et `parametresDuBloc` répond à la seconde, d'un
seul endroit — pour une fonction du brouillon comme pour une fonction versée.

**La portée se décrit elle-même**, et d'un seul endroit. Aucun projet ne déclare
`zones` : sans une phrase, elle paraissait nue dans la liste. La phrase était
écrite dans la branche de la signature ; l'appel en aurait eu une seconde, et
l'une des deux aurait fini par dire autre chose (règle 10).

---

## 4. La portée dit où lire

### Ce qui dormait

`Couleur des volets(Bâtiment A, Matériau)` passait la portée comme n'importe
quelle valeur, et rien ne s'en servait. La moitié de l'intérêt de l'appel —
**la même fonction, deux bâtiments, deux réponses**.

### Et un défaut qu'on aurait versé sans le voir

**Deux endroits rejouent des fonctions** : le bac d'essai, sur ce qu'on tape, et
le rejeu de la mémoire, sur ce que le projet tient — par zone. L'appel n'existait
que dans le bac. Une fonction qui en appelle une autre devenait donc
**indécidable le jour où on la versait**, et rien ne le disait. On ne verse pas
une fonction pour qu'elle cesse de répondre.

Le lecteur qui sait appeler a donc quitté le bac pour vivre à côté de
l'évaluateur, où les deux le trouvent.

### On donne des noms, pas des valeurs

C'est ce qui rend la portée utile, et c'est le point qu'il a fallu corriger.

`Couleur des volets(zones, Matériau)` dit : « là où tu lis `Nature des volets`,
lis `Matériau` ». C'est une **substitution de noms** — et la valeur se lit là où
la lecture se fait, donc dans la zone qu'on a donnée. Passer la valeur de
l'appelant figerait l'appel dans l'environnement de l'appelant, et
`F(Bâtiment A, Matériau)` rendrait exactement la même chose que
`F(Bâtiment B, Matériau)` : la portée ne servirait à rien.

Un argument qui **n'est pas** un nom — un calcul, un nombre — n'a pas d'autre
forme qu'une valeur : il n'est écrit qu'ici, et c'est ici qu'il se lit.

De même, la portée est un **lieu**, et un lieu se nomme : `Bâtiment A` n'a pas
de valeur, c'est l'endroit où l'on demande. Le chercher parmi les valeurs
rendait l'appel indécidable dès qu'on nommait un bâtiment — c'est-à-dire dans le
seul cas où la portée sert à quelque chose.

### Une zone qu'on ne connaît pas fait taire l'appel

Et elle le fait taire **même quand la réponse est sous la main**. Se rabattre
sur les valeurs de l'appelant rendrait une réponse parfaitement plausible pour
le mauvais endroit. On demandait le bâtiment Z ; on ne répond pas avec le
bâtiment courant sous prétexte qu'on l'a (règle 5).

---

## Ce que la ronde a appris

**Une fonctionnalité neuve ouvre des chemins qu'on n'a pas regardés.** L'appel
marchait dans le bac, et le rejeu de la mémoire — l'autre moteur, celui qui sert
au copilote, à la variante, au cerveau — ne savait pas appeler. Rien n'était
tombé : la fonction devenait simplement muette une fois versée. Le prochain
réflexe, en ajoutant une forme au langage : **qui d'autre évalue ?**

**Substituer un nom n'est pas passer une valeur**, et l'écart ne se voit que le
jour où la lecture se fait ailleurs. Les deux donnent le même résultat tant
qu'il n'y a qu'un seul endroit où lire ; le second endroit — la zone — révèle
lequel des deux on avait implémenté.

**Une garde peut être à l'envers et passer les tests.** L'ancienne version se
rabattait sur les valeurs de l'appelant pour une zone inconnue, et le test
passait parce que la zone inconnue n'avait rien à lire de toute façon. C'est la
batterie de mutations qui l'a montré : la garde survivait à sa suppression, donc
elle ne défendait rien — et en regardant pourquoi, on a vu qu'elle défendait le
contraire de ce qu'il fallait.
