# Un sujet, une ligne — et où l'on regarde

**À quoi sert cette page :** deux défauts vus sur une capture de l'écran de la
mémoire, et ce qu'on a décidé pour les corriger. Le second n'était pas un
défaut du modèle : c'était une lecture qui répétait la découpe du rangement.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Où l'on regarde : `zone:` et `seulement:`

Chaque ligne de la mémoire porte sa portée en toutes lettres — « Bâtiment A »,
« Ensemble — toutes zones ». C'était la **seule puce de l'écran qu'on ne pouvait
pas interroger**, et le code disait déjà pourquoi c'est un défaut, à propos
d'une autre puce :

> « Une puce qu'on ne peut pas interroger est un cul-de-sac. »

On la lisait, et l'on ne pouvait rien en faire.

### Deux lectures, et elles ne disent pas la même chose

**`zone:bâtiment-a` — ce qui s'applique.** Ce qui y est écrit, **et ce qui vaut
pour l'ouvrage entier**. C'est la lecture de tous les jours : retrancher la
hauteur de référence du projet donnerait un bâtiment A qui ne porte plus ses
propres entrées, et l'on conclurait qu'elle manque.

C'est déjà ce que le rejeu fait, et `filterByZone` le décidait déjà — une
seconde décision ici finirait par ne plus dire la même chose (règle 10).

**`seulement:bâtiment-a` — ce qui n'est écrit que là.** C'est la question de
l'**audit d'un découpage** : une zone qui ne porte rien en propre n'avait pas
besoin d'exister, et une zone qui porte trop cache une règle générale qu'on a
recopiée.

**`seulement:ensemble`** lit l'autre bout : ce qui n'est écrit pour aucune zone
en particulier. `zone:` n'a pas de valeur pour cela — lire « l'ouvrage entier »
ne filtre rien, et offrir un filtre qui ne filtre pas serait un cul-de-sac de
plus.

### Le premier champ dont les valeurs viennent du projet

Tous les autres sont des listes fixes du langage : les natures, les domaines,
les autorités. Les zones, non — chaque chantier découpe son ouvrage comme il
veut, et le vocabulaire de la barre doit suivre.

Le vocabulaire se **demande** donc, il ne se recopie pas : `lesChamps()`, une
fois. Vingt appels qui liraient chacun la constante auraient tous oublié les
zones, et `zone:bâtiment-a` se lirait comme une faute de frappe dans dix-neuf
d'entre eux.

**Rien tant que le projet n'a pas de zone.** Un champ dont aucune valeur n'est
connue ferait passer `zone:bâtiment-a` pour une faute de frappe sur un projet
qui n'a simplement pas encore de découpage (règle 5).

## Un sujet, une ligne

### Ce qu'on voyait

Une question fermée verse **trois lignes**. Le rangement l'écrit lui-même :

> « Une décision porte **le même sujet** que la valeur qu'elle fixe — c'est ce
> qui permet de les relier par le nom. Sans préfixe elles partageraient un
> `item_key`, et verser l'une supprimerait l'autre. »

Trois clés, donc — `X`, `decision:X`, `raisonnement:X` — et trois lignes à
l'écran, au même titre, portant le même titre, avec les mêmes puces :

```
Quelle est la profondeur hors gel… ?   Décidé   Sans domaine   Ensemble — toutes zones
Quelle est la profondeur hors gel… ?   Décidé   Sans domaine   Ensemble — toutes zones
Quelle est la profondeur hors gel… ?   Déduite  Sans domaine   Ensemble — toutes zones
```

On ne savait pas laquelle ouvrir, et personne n'a le temps d'ouvrir les trois.

### La règle

> **Trois lignes qui portent le même sujet sont un seul sujet, et l'écran doit
> le dire.**

La mémoire a raison de les tenir séparées — les périmer l'une l'autre serait
faux. **La lecture n'a pas à répéter la découpe du rangement.**

La clé du regroupement existait déjà toute faite : c'est la clé **sans son
préfixe**, que l'atelier pose au versement et que la lecture retire.

```
Quelle est la profondeur hors gel… ? : Profondeur hors gel = 0,60 m
Du même sujet  qui l'a tranché · par où l'on est passé
```

### Trois précautions

**Sur la clé, jamais sur le titre.** Deux sujets peuvent porter le même libellé —
c'est le propre d'un projet à plusieurs bâtiments —, et la clé porte déjà sa
zone : `hauteur@batiment-a` et `hauteur@batiment-b` sont deux sujets, et le
resteront.

**Aucune face ne disparaît.** Elles sont **pliées, pas retirées** : une ligne
qu'un regroupement escamoterait serait une ligne qu'on ne peut plus retrouver,
et c'est exactement ce qu'un écran de mémoire ne doit jamais faire.

**La tête est la face la plus haute parmi celles que la recherche a retenues.**
Chercher `nature:raisonnement` doit montrer le raisonnement, pas une valeur
qu'on n'a pas demandée. Le regroupement opère donc **après** le filtrage, et ne
ramène jamais ce que la recherche a écarté.

## Ce qui fait remonter un sujet

« Par importance » ne veut rien dire tant qu'on ne peut pas répondre à *pourquoi
cette ligne est-elle en haut ?*. Trois critères, tous déjà dans la mémoire, et
**chacun se dit en français sur la ligne qu'il remonte** :

| ce qui remonte | ce qu'on lit | d'où ça vient |
|---|---|---|
| un constat ouvert | « attend quelqu'un » | `isOpenFinding`, qui existe |
| un raisonnement incomplet | « ne dit pas tout » | `lacunesDuRaisonnement`, qui existe |
| un nom que beaucoup lisent | « beaucoup s'appuient dessus » | `emploisParAffirmation`, qui existe |

**Chaque question se pose là où elle a déjà sa réponse.** Le tri ne redécide
rien : il assemble (règle 10).

**Les poids sont des ordres de grandeur, pas des points.** Un constat qui attend
quelqu'un passe devant tout le reste, quoi qu'il porte : c'est du travail en
attente, et le reste est de la lecture. Deux raisons faibles ne valent jamais
une forte, et c'est voulu.

**À poids égal, l'ordre reçu est conservé** — deux sujets que rien ne distingue
ne doivent pas changer de place entre deux frappes.

### Le quatrième critère, retiré après l'avoir vu à l'écran

On avait écrit « il a bougé récemment ». L'écran l'a démenti : la mention
paraissait sur **toutes** les lignes.

Pour une bonne raison — l'ordre reçu est déjà celui des dates, et le sous-titre
de la liste le dit lui-même : *« dans l'ordre où elles ont été tranchées »*. Un
critère qui double le tri existant ne départage rien et n'ajoute que du bruit.

> **Une raison qui s'affiche partout n'oriente plus.**

La récence reste donc ce qu'elle était : l'ordre par défaut, que les trois
raisons viennent bousculer quand elles ont quelque chose à dire.

## Un chiffre qui donne une prise

« 380 constats attendent d'être levés » est un nombre qui **décourage**, pas qui
oriente. On le lit, on se dit qu'on n'y arrivera jamais, et l'on passe — et un
chiffre qu'on cesse de regarder est un chiffre qui n'existe pas.

Découpé, il rend la main :

```
3 constats attendent d'être levés
   2 Structure   1 Incendie
```

Les trois plus gros, puis « le reste » : dix lignes de détail sous un chiffre
referaient exactement le mur qu'on vient d'abattre.

**Sans domaine se dit, et se cherche.** Un constat qu'on ne peut même pas ranger
n'est pas un constat de moins : c'est un travail de plus, et d'une autre nature.

**Le reste n'ouvre rien, et c'est honnête.** « 1 autre domaine » n'est pas un
domaine : lui donner la requête du total ferait cliquer sur « 1 » pour en
obtenir dix.

## Ce que cela prépare

Faire remonter les sujets dont le raisonnement ne dit pas tout n'est pas
seulement une commodité de lecture. C'est la **première brique** du moteur de
prédiction (`docs/la-memoire-qui-predit.md`) : ce qui a été examiné et écarté
est la donnée que personne d'autre ne collecte, et la seule qu'on ne pourra
jamais rattraper après coup.

La première brique d'un moteur de prédiction n'est pas un prédicteur : c'est le
fait de **remarquer ce qui manque**.

Et la suivante n'est pas de le **demander** : c'est de le **constater**. Ce que
le projet a écarté, Mdall le lit dans quatre traces que le travail normal laisse
derrière lui — voir `docs/ce-quon-a-ecarte.md`.
