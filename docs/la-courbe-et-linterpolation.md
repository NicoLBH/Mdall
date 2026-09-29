# La courbe : un abaque recopié, et la règle entre ses points

**À quoi sert cette page :** les Eurocodes sont pleins de figures. Cette page dit
pourquoi un abaque entre dans le langage sous la forme de ses **points**, ce que
les deux déclarations obligatoires empêchent, et ce que le langage refuse de
faire d'une courbe.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le verrou

Un coefficient de forme selon la pente. Un coefficient d'exposition selon
l'altitude. Une pression selon la hauteur. Jusqu'ici il fallait les retranscrire
en arithmétique — une suite de `si` et de produits que **personne ne peut
comparer à la figure d'origine**.

C'est le même verrou que celui du barème, sur un autre objet : un contrôleur
technique **regarde une courbe**, il ne relit pas une régression. Écrite en
points, la fonction ressemble à l'abaque ; l'auteur recopie, le contrôleur
compare ligne à ligne, et la trace dit entre quels deux points la lecture est
tombée.

```
courbe Coefficient de forme(zones, Pente du versant) {
   // NF EN 1991-1-3, figure 5.1 — toiture à un versant.
   texte: NF EN 1991-1-3, annexe nationale
   entre les points: linéaire
   hors bornes: refuse
   |  0° | 0,8 |
   | 30° | 0,8 |
   | 60° | 0   |
}
```

## Une courbe est une fonction

`courbe` est une **marque d'écriture**, comme `selon` l'est d'un barème : la
fonction lit le nom de sa signature et conclut sous le sien, exactement comme
toutes les autres. Les fonctions suivantes la lisent comme n'importe quel nom —
elle se nomme ou s'appelle comme les autres (`docs/appeler-une-fonction.md`).

Ce qui change est la façon dont sa loi est posée. Et c'est le seul endroit où
cette différence compte : l'écran, la trace, le rejeu et le graphe n'ont pas à
savoir qu'une courbe existe.

**Une différence avec le barème, et elle est de fond.** Un barème se *déplie* en
`si … sinon si …`, ce qui permet à tout le reste de n'en rien savoir. Une
interpolation, non : entre deux points il n'y a aucune branche, il y a une
droite. La courbe a donc sa lecture propre.

## Les deux déclarations, et pourquoi elles sont obligatoires

> **L'interpolation est déclarée, donc vérifiable.**

| ce qu'on écrit | ce que cela veut dire |
| --- | --- |
| `entre les points: linéaire` | une droite entre les deux points qui encadrent la valeur |
| `entre les points: en escalier` | la valeur du point atteint, jusqu'au suivant — un palier |
| `hors bornes: refuse` | au-delà des points écrits, la courbe ne conclut pas |
| `hors bornes: borne` | au-delà, la valeur de l'extrémité — quand le texte le dit |

**Deux abaques dessinés pareil se lisent différemment**, et rien dans les points
ne le dit. Un tableau à seuils et une droite passent par les mêmes couples de
nombres ; seule la déclaration les distingue.

> **`hors bornes: refuse` empêche un abaque d'être extrapolé en silence.**

C'est la faute classique, et la plus chère : une courbe donnée de 0 à 60°
prolongée jusqu'à 75° rend un nombre parfaitement plausible, qui ne vient
d'aucun texte. Une courbe qui ne porte pas ses deux déclarations **se refuse à
la lecture** plutôt que de supposer.

## Ce qui se refuse, et se dit à la lecture du fichier

| ce qu'on écrit | pourquoi |
| --- | --- |
| un seul point | il ne dit rien de ce qu'il y a entre |
| `| 30° | 1 |` puis `| 10° | 2 |` | les abscisses ne montent pas |
| deux points au même endroit | deux valeurs pour une lecture |
| `| 3e famille B | 0,8 |` | un libellé n'est pas une mesure |
| `| 0 m | 1 |` puis `| 10 kN | 2 |` | une longueur et une force |
| `entre les points: quadratique` | il n'y a que `linéaire` et `en escalier` |
| une courbe sans nom dans sa signature | elle n'a rien à placer |

**Les trier en silence ferait passer pour juste un tableau qui ne l'est pas.**
Une abscisse qui redescend est une ligne recopiée dans le désordre, et c'est
exactement la faute qu'on veut voir en recopiant un abaque.

## Le degré se colle au nombre

**Personne n'écrit « 30 ° ».** Un abaque de norme porte `0°`, `30°`, `45°`, et
une courbe recopiée à l'espace près cesserait de ressembler à sa figure — ce qui
est tout l'intérêt de la recopier.

`0°` se lisait donc comme le **nombre zéro**, l'unité perdue en silence, et deux
angles en degrés se comparaient à un angle en radians sans un mot. Le signe `°`
est la seule unité qu'on colle, parce que c'est la seule qu'on ne peut pas
confondre avec le début d'un nom. `26 m` garde son espace ; `20%` et `120€`
aussi, l'un parce que `%` est un suffixe du calcul avant d'être une unité,
l'autre parce que l'euro s'écrit ainsi.

## Le dessin est la vérification

Le bac d'essai **trace** la courbe, marque les points, et pose la lecture
dessus. Un abaque se compare à sa figure d'un coup d'œil ; relire onze couples
de nombres demande de les tracer dans sa tête, et c'est exactement ce que la
forme existe pour éviter.

Sous le dessin, les points en clair, avec les deux lignes qui encadrent la
lecture mises en évidence — c'est la ligne qu'on cherche, et la seule qui se
compare au texte d'origine. **Le dessin n'a pas d'axes chiffrés** : les nombres
sont dessous, où ils se lisent exactement, et les répéter en graduations ferait
deux lectures du même fait dont l'une approximative.

## Ce que le lot ne fait pas

**Il n'ajuste aucune loi.** Pas de régression, pas de spline, pas de polynôme :
ce qui n'est pas entre deux points écrits n'existe pas. Une courbe lissée
rendrait des valeurs que le texte d'origine ne porte pas, et personne ne pourrait
dire d'où elles sortent — c'est précisément ce qu'on refuse à un agent.

**Il n'arrondit pas à la lecture.** Une interpolation rend ce que le langage rend
partout : douze chiffres significatifs (`docs/les-unites-du-metier.md`). Un
coefficient se met en forme comme le reste, par `arrondi(Coefficient de forme ; 2)`
dans la fonction qui le lit. Une seconde règle d'arrondi, propre à la courbe,
serait exactement la divergence que la règle 10 interdit.

**Il n'a qu'une entrée.** Un abaque à double entrée — une famille et une hauteur
— est un **barème**, et il s'écrit `selon (…)`.

## Où ça vit

| ce qu'on cherche | où c'est |
| --- | --- |
| les points, l'interpolation, le tracé | `apps/web/js/services/courbe-du-mdall.js` |
| les mots — `courbe`, les deux déclarations | `apps/web/js/services/memoire-en-texte.js` |
| la lecture du bloc et ses refus | `apps/web/js/services/memoire-en-lecture.js` |
| ce que la courbe conclut | `apps/web/js/services/memoire-evaluateur.js` — `evaluerLaCourbe` |
| le dessin et les points, à l'écran | `apps/web/js/views/studio/dev/ecrire-en-mdall.js` — `renderCourbe` |

## Deux défauts que ça a fait sortir

**Un libellé se plaçait sur la courbe.** `lireUnNombre` gratte les chiffres de ce
qu'on lui donne : elle tire **3** de « 3e famille B » et **1** de « CF 1 h ». La
courbe plaçait donc un classement coupe-feu sur un axe d'angles et rendait un
coefficient — un nombre plausible, sorti de nulle part. C'est `estMesuree` qui
tranche, le même jugement que la mémoire porte déjà sur ses propres valeurs, et
c'est le même défaut que celui du barème.

**Le degré était perdu en silence.** Voir plus haut : c'est ce lot qui l'a fait
apparaître, parce qu'un abaque est le premier objet du langage dont les
abscisses sont des angles.

## Comment ça se vérifie

Chaque exemple de cette page est une épreuve, et le câblage a la sienne : une
courbe que la lecture range bien mais dont le bac ne demande pas l'abscisse ne
casse rien — elle rend une fonction qui ne conclut jamais, devant un formulaire
vide. **Une fonction pure s'éprouve par son résultat ; un câblage ne s'éprouve
que par le code qui le porte.**

Deux épreuves valent d'être nommées. La première compare **les deux peintres** :
le module qui écrit une courbe et celui qui la relit doivent colorer chaque
caractère pareil, faute de quoi la même fonction change de couleur selon l'écran
qui la montre. La seconde relit l'abaque de la consigne **avec le lecteur du
langage**, et le fait conclure : un exemple dont les points seraient dans le
désordre serait recopié tel quel par le modèle (règle 12).

## Et l'abaque à double entrée

Les Eurocodes ont aussi des **nappes** : un coefficient selon l'altitude **et**
la zone de vent. Elles s'écrivaient en barème, c'est-à-dire par paliers, et l'on
perdait l'interpolation sur l'un des deux axes.

```
courbe Coefficient d'exposition(zones, Altitude, Zone de vent) {
   entre les points: linéaire
   hors bornes: refuse
   |        |    1 |    2 |    3 |
   |    0 m | 1,00 | 1,05 | 1,10 |
   |  500 m | 1,10 | 1,18 | 1,25 |
   | 1000 m | 1,25 | 1,35 | 1,45 |
}
```

**C'est la signature qui décide**, et non la forme du tableau : deux entrées,
deux axes. L'en-tête porte les valeurs de la seconde, son coin vide — le dessin
du document d'origine, celui qu'on veut pouvoir recopier puis relire ligne à
ligne contre lui.

> **Une nappe est une famille de courbes, et on la lit comme l'ingénieur lit
> l'abaque imprimé : on se place sur une courbe, puis on la lit.**

La seconde entrée choisit — ou interpole — **une courbe**, et cette courbe est
une courbe ordinaire : elle se dessine, se trace et se relit avec tout ce qui
existe déjà. La trace dit les deux pas, « entre les colonnes 1 et 2, lu entre
500 m et 1000 m », et l'on retrouve les quatre cases du tableau d'origine.

`entre les points:` et `hors bornes:` valent pour les **deux** axes : un tableau
à seuils l'est dans les deux sens, et déclarer deux interpolations pour un seul
tableau ferait deux choses à vérifier là où le texte n'en dit qu'une.

Ce qui n'est pas fait : montrer la **famille** de courbes d'un coup d'œil. C'est
au carnet, avec la raison — voir `docs/dix-du-carnet.md`.
