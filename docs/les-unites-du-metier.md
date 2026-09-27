# Les unités : deux longueurs s'additionnent, une longueur et une force non

**À quoi sert cette page :** une erreur d'unité est la faute la plus chère du
bâtiment, et la plus discrète — rien ne la signale avant le chantier. Cette page
dit la règle que le langage applique maintenant, pourquoi elle tient en une
phrase, et les trois choses qu'elle refuse de faire.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le verrou

Le langage portait déjà les unités : une mesure sait qu'elle est en mètres, une
condition sait qu'elle compare des mètres. Il en faisait la moitié :

- `26 m` contre `28 kN` : **refusé**, et c'est juste ;
- `0,71 m + 35 cm` : **refusé aussi**, et c'est faux. Ce sont deux longueurs.

Le second cas est le plus commun de tous — une cote en centimètres dans un plan,
une portée en mètres dans une note de calcul —, et il bloquait. Dans une
condition il faisait pire que bloquer : il rendait la règle **indécidable**, et
l'écran renvoyait l'utilisateur chercher une valeur qu'il avait déjà donnée.

Refuser ce qui est juste finit par apprendre à contourner la langue : on
convertit à la main dans un coin, et le jour où l'on se trompe, plus rien ne le
dit.

## La règle, en une phrase

> **Deux unités d'une même grandeur se convertissent ; deux grandeurs
> différentes se refusent.**

Elle vaut partout où le langage lit un nombre :

| ce qu'on écrit | ce que ça vaut |
| --- | --- |
| `0,71 m + 35 cm` | `1,06 m` |
| `35 cm + 0,71 m` | `106 cm` |
| `1 h - 30 min` | `0,5 h` |
| `3 m * 40 cm` | `1,2 m²` |
| `2 t + 500 kg` | `2,5 t` |
| `si (Hauteur <= 2 m)` pour `150 cm` | **vrai** |
| `3 m + 2 kN` | **refusé** — une longueur et une force |

**Le résultat garde l'unité de gauche**, parce que c'est celle qu'on a écrite en
premier, donc celle dans laquelle on pense la ligne. La même somme lue de
l'autre côté rend le même nombre dans l'autre unité, et non un autre nombre.

## Ce que la règle ne relâche pas

`3 m + 2` reste **refusé**. Deux quoi ? La conversion n'y change rien : une somme
dont un seul côté porte une unité est une ligne qu'il faut relire. Un produit,
lui, accepte un facteur nu — `2 * 3 m` fait six mètres, et c'est une autre
opération.

Ce point s'est vérifié par l'échec : le premier essai donnait l'unité de gauche
au facteur nu, et `120 € * 0,05` rendait `6 €²`. Un prix au carré, sur le calcul
le plus banal du dépôt.

Et ce qui ne se ramène pas reste un **doute**, jamais un « faux ». Une longueur
comparée à une force ne devient pas comparable parce qu'on sait convertir :
l'écran dit « les deux côtés ne mesurent pas la même chose », et nomme les deux
grandeurs plutôt que les deux symboles — « une longueur et une force » se
comprend d'un coup d'œil, « m et kN » demande de réfléchir, et c'est au moment
où l'on est pressé qu'on lit ce message.

## Une table de bases, et les exposants s'en déduisent

On ne liste pas `m²`, `cm²`, `dm²`, `m³`, `cm³`… On liste `m` et `cm`, et **le
carré d'un facteur est son carré** : `1 m = 100 cm` donne `1 m² = 10 000 cm²`
sans qu'on l'écrive. Une table qui les énumérerait aurait un trou dès la
première unité oubliée, et ce trou se lirait comme « incomparables » — c'est-à-dire
comme un doute, sur une comparaison que le métier fait tous les jours.

Il n'y a que la longueur qui s'élève. Un `kg²` ne veut rien dire dans ce métier,
et lui inventer une grandeur ferait accepter une conversion que personne ne peut
vérifier.

**La référence d'une grandeur est l'unité du métier, pas celle du système
international** : on dimensionne en mètres et en kilonewtons, pas en mètres et en
newtons ; en mégapascals, pas en pascals ; en heures, parce que les degrés
coupe-feu se comptent en heures. Ce choix ne change aucun calcul — il décide
seulement de l'unité qu'un résultat porte quand rien ne l'impose.

**La casse compte**, et c'est voulu : `mN` est un millinewton, `MN` un
méganewton. Les confondre est un facteur d'un milliard.

## Ce que ce lot ne fait pas

**Il ne compose pas les unités.** `kN/m` reste opaque, comme avant : deux `kN/m`
s'additionnent, un `kN/m` et un `N/mm` se refusent, alors que ce sont la même
chose. Une algèbre dimensionnelle complète est un autre travail, et la faire à
moitié ferait accepter des conversions fausses — ce qui est exactement pire que
de refuser.

**Il ne convertit pas les températures.** Un degré Celsius n'est pas un facteur,
c'est un facteur **et** un décalage : `0 °C` ne vaut pas `0 K`. Le modèle est
multiplicatif, et l'y forcer rendrait des sommes fausses. `°C` ne se convertit
donc qu'à elle-même.

**Il ne devine aucune unité.** Un symbole inconnu n'est pas rapproché du plus
proche : il est rendu tel quel, et deux symboles inconnus ne se comparent que
s'ils s'écrivent pareil. Un « daN » mal orthographié ne devient pas un « dN ».

## Où ça vit

| ce qu'on cherche | où c'est |
| --- | --- |
| la table, les grandeurs, la conversion | `apps/web/js/services/unites-du-metier.js` |
| lire et écrire `m²` | `apps/web/js/services/unites-du-metier.js` — `lireUneUnite`, `ecrireUneUnite` |
| la somme, le produit, la puissance | `apps/web/js/services/mdall-calcul.js` |
| la comparaison d'une condition | `apps/web/js/services/memoire-evaluateur.js` — `comparerDesNombres` |
| l'égalité de deux mesures écrites autrement | `apps/web/js/services/memoire-evaluateur.js` — `memeValeur` |
| ce que la consigne enseigne au modèle | `supabase/functions/_shared/mdall-du-modele.js` |
| ce que le wiki montre à l'utilisateur | `apps/web/js/contenus/wiki-du-langage-mdall.js` |

## Une précision qui a un seul chez-elle

`0,1 + 0,2` doit s'écrire `0,3`, et `35 cm` ramenés en mètres doivent valoir
`0,35` — pas `0,35000000000000003`. Douze chiffres significatifs : au-delà, c'est
le bruit du binaire.

**Cette règle vivait dans l'écriture d'un calcul**, où elle ne décidait que de
l'affichage. Elle décide maintenant aussi de l'égalité de deux mesures — `26 m`
et `2600 cm` sont la même hauteur —, et une égalité qui ne suivrait pas la même
règle que l'affichage dirait « différentes » de deux valeurs que l'écran montre
identiques. Elle est donc écrite une fois, pour les deux : `auJusteNecessaire`
(règle 10, un nom vit à un seul endroit).

## Comment ça se vérifie

Ce lot se prouve par son résultat, et chaque exemple de cette page est un test :

- les conversions et les refus, dans `unites-du-metier.test.mjs` et
  `mdall-calcul.test.mjs` ;
- la comparaison et le doute, dans `memoire-evaluateur.test.mjs` — avec une ligne
  qui **ne tient que si la conversion a lieu** (`150 cm` contre un seuil de
  `2 m` : le nombre nu comparerait 150 à 2 et rendrait faux) ;
- **les exemples que la consigne enseigne au modèle sont calculés par le
  calculateur**, et non relus contre une seconde liste : une conversion qu'on
  changerait sans rouvrir la consigne tombe là (règle 12 — une consigne qu'on ne
  vérifie pas est une intention).

Les treize mutations de la table et des conversions meurent, et les deux qui
avaient survécu au premier passage — un produit qui ne convertit plus, un seuil
converti puis jeté — ont chacune révélé un test qui manquait, pas une
imprécision de plus.
