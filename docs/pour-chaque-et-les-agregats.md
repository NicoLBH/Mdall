# `pour chaque` : une boucle produit un tableau, jamais un accumulateur

**À quoi sert cette page :** beaucoup de ce qu'un ingénieur écrit est la même
formule appliquée à une suite de valeurs. Cette page dit comment le langage
répète, pourquoi le résultat est un **tableau** et non une variable, et les cinq
phrases qui en tirent une valeur.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le verrou

Un moment pour chaque portée de 2 à 90 mètres. Une descente de charge niveau par
niveau. Un dimensionnement pour chaque diamètre du catalogue. Le langage savait
poser **une** valeur ; répéter demandait quarante-cinq `calcule` recopiés — ou
une sortie vers le tableur, c'est-à-dire vers un endroit où plus rien ne se
rejoue, ne se signe et ne se relit.

## La règle qui rend ça relisible

> **Une boucle produit un tableau, jamais une variable qui s'accumule.**

Un accumulateur — `soit total = total + x` — ne se relit pas : il faut simuler
l'exécution dans sa tête pour savoir ce qu'il vaut à la fin. Les quarante-cinq
lignes d'un tableau, elles, sont **visibles**, donc vérifiables une à une contre
la note de calcul d'origine. C'est toute la différence entre un langage qu'on
relit et un langage qu'on exécute.

```
fonction Volume le plus gros(zones, Section, Hauteur maximale) {
   // Le poteau le plus volumineux de la trame.
   importe (variable: Section, depuis: variables-du-projet.ref, zones: zones);

   pour chaque Hauteur de 2,5 m à Hauteur maximale par pas de 0,5 m
      calcule Volume = Hauteur * Section;

   calcule Le plus gros = le plus grand de Volume;
   si (Le plus gros > 0 m³)
   alors (Le plus gros);
}
```

| Hauteur | Volume |
| --- | --- |
| 2,5 m | 0,225 m³ |
| 3 m | 0,27 m³ |
| 3,5 m | 0,315 m³ |
| 4 m | 0,36 m³ |

## La grammaire, et elle tient en quatre lignes

- **la tête s'écrit en toutes lettres** : `pour chaque <nom> de <début> à <fin>
  par pas de <pas>`. « de 2 à 90 pas 2 » se taperait plus vite et se relirait
  moins bien — et c'est une note de calcul qu'on relit des années après ;
- **les trois bornes** sont des nombres, des noms du projet, ou des calculs ;
- **le corps s'écrit trois espaces plus loin.** C'est la seule chose que
  l'indentation décide dans ce langage, et elle s'y prête : trois espaces en font
  déjà partie, et le corps d'une boucle est justement ce qu'on indente sans y
  penser ;
- **la première ligne qui n'est pas un `calcule` referme le corps**, où qu'elle
  soit indentée. Un `si` et un `alors` appartiennent à la fonction, pas à la
  boucle.

## Les agrégats, en français, sur une colonne

Le tableau se lit par un **agrégat**, et c'est la seule façon d'en tirer une
valeur. Ils s'écrivent après la boucle, au même retrait qu'elle.

| la phrase | ce qu'elle rend |
| --- | --- |
| `la somme de Volume` | le total de la colonne |
| `le plus grand de Volume` | la plus grande valeur |
| `le plus petit de Volume` | la plus petite |
| `la moyenne de Volume` | la moyenne |
| `le nombre de Volume` | combien de lignes ont une valeur |

Ce sont `sum`, `max`, `min`, `moyenne` et `compte`, **et ils s'écrivent en
français exprès**. Une fonction nommée `somme(…)` appelle à être enchaînée —
`somme(max(…))` —, et cinq enchaînements plus loin plus personne ne relit la
ligne. « la somme de Volume » ne se compose pas, et c'est voulu : le mot choisi
décide du style qu'on écrira pendant dix ans.

**La phrase s'arrête sur un blanc**, et c'est ce qui la distingue du français :
« la somme des charges » n'est pas un agrégat.

## Ce qu'une ligne manquée devient

Elle reste au tableau, **avec sa case vide**. La retirer ferait un tableau plus
court que la suite annoncée, et l'on ne verrait pas laquelle des quarante-cinq
portées a échoué — c'est précisément la ligne qu'on cherche.

Et elle **ne compte pas** dans l'agrégat. Elle ne vaut pas zéro : un total qui
compterait les trous serait plus petit que la réalité, et rien ne le dirait. Ce
qui reste se lit par `le nombre de`.

Toutes les valeurs d'une colonne se ramènent à l'unité de la première — la règle
des unités, appliquée à un tableau (`docs/les-unites-du-metier.md`). Une colonne
qui mélange une longueur et une force ne s'agrège pas : c'est un doute, pas un
total.

## Ce qui se refuse, et se dit avant le lancement

| ce qu'on écrit | pourquoi c'est refusé |
| --- | --- |
| `de 1 à 10 par pas de 0` | la suite ne finirait jamais |
| `de 10 à 1 par pas de 1` | le pas s'éloigne de la fin ; écrivez `par pas de -1` |
| `de 1 m à 10 kN par pas de 1 m` | une longueur et une force |
| `de 1 à 10 000 par pas de 1` | 10 000 lignes ne se relisent pas |
| deux `pour chaque` | deux niveaux demandent deux fonctions |
| un `pour chaque` sans corps | il ne rend rien |
| un agrégat sans `pour chaque` | il n'a aucun tableau à lire |

**Les 200 lignes ne sont pas une limite technique.** Le gain de cette forme est
qu'on relit les lignes une à une contre l'original ; un tableau de dix mille
lignes ne se relit pas, et l'on aurait rendu le langage exactement aussi opaque
que le tableur qu'il remplace. On refuse, et l'on dit combien cela ferait — on ne
tronque pas, ce qui donnerait un total faux sans un mot.

**Ce qui est écrit en clair se vérifie à la lecture** ; une borne qui est un nom
ne se vérifie qu'au lancement, parce que sa valeur vient du projet. On ne renonce
pas au garde : on le pose là où il peut tenir.

## Ce que le lot ne fait pas

**Il n'imbrique pas.** Une seule boucle par fonction, comme il n'y a pas de
condition imbriquée : une boucle dans une boucle est exactement ce qu'on ne sait
plus relire dix-huit mois plus tard.

**Il ne sort pas en avance.** Pas de « s'arrêter quand » : le tableau fait ce
qu'il annonce, et l'on lit la ligne qui compte.

**Il ne parcourt pas une liste.** `pour chaque niveau du bâtiment` demande une
nomenclature — bâtiment › niveau › zone › local —, qui touche au modèle et non au
langage. C'est écrit dans `docs/a-traiter-plus-tard.md`.

## Où ça vit

| ce qu'on cherche | où c'est |
| --- | --- |
| la suite des valeurs, et ce qu'une colonne vaut | `apps/web/js/services/boucle-du-mdall.js` |
| les mots — `pour chaque`, les cinq phrases | `apps/web/js/services/memoire-en-texte.js` |
| la lecture : le corps, les refus | `apps/web/js/services/memoire-en-lecture.js` |
| le déroulement, et ce qu'un agrégat rend | `apps/web/js/services/memoire-evaluateur.js` — `deroulerLaBoucle` |
| le tableau à l'écran | `apps/web/js/views/studio/dev/ecrire-en-mdall.js` — `renderTableauDeLaBoucle` |

## Trois défauts que ça a fait sortir

**Les `calcule` d'une fonction ne se réécrivaient pas.** Une fonction versée qui
posait `calcule TVA = Prix HT * 20%` se réécrivait dans l'écran des fichiers
**sans une seule de ses lignes de calcul** : on y lisait une fonction qui conclut
`Prix TTC` sans que rien ne dise ce que `Prix TTC` vaut. Le défaut est de la même
famille que les branches oubliées du lot `sinon si`, et il se voyait aussi peu —
`ligneDeCalcul` existait, et personne ne l'appelait.

**Le compte des pas accumulait le bruit du binaire.** `0,3 / 0,1` vaut
`2,9999999999999996` : arrondi vers le bas sans précaution, il fait trois lignes
au lieu de quatre. La dernière — celle qu'on cherche — manque, et le tableau a
l'air complet.

**Une boucle pouvait lire ce qui est écrit sous elle.** Elle se déroule
maintenant à sa place, qui est son numéro de ligne : ce qu'on a écrit au-dessus
la nourrit, ce qu'on écrit en dessous lit son tableau. On lit de haut en bas,
comme partout dans ce langage, et il n'y a pas d'autre règle à apprendre.

## Comment ça se vérifie

Chaque exemple de cette page est une épreuve, et le câblage a sa propre épreuve :
une boucle que la lecture range bien mais que l'évaluateur ne reçoit pas ne casse
rien — elle rend une fonction qui ne conclut rien. **Une fonction pure s'éprouve
par son résultat ; un câblage ne s'éprouve que par le code qui le porte.**

Et ce que la consigne enseigne au modèle se vérifie contre le **lecteur du
langage** : un exemple dont l'agrégat nommerait une colonne que sa boucle ne
produit pas serait recopié tel quel, et l'on chercherait une journée pourquoi une
fonction qui a l'air juste ne rend rien (règle 12).
