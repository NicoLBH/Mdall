# Se servir de ce que le projet sait, et pouvoir le corriger

**À quoi sert cette page :** le modèle écrivait un appel de fonction que le
langage n'a pas, et une fonction versée ne pouvait plus être modifiée. Les deux
défauts sont le même : **on avait donné un nom sans donner de quoi s'en
servir.**

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## 1. Le modèle ne voyait pas la mémoire

### Le symptôme, tel qu'il s'est produit

On demande, dans la case du bas de « Écrire en Mdall » :

> Ajoute une fonction qui demande le matériau, puis **lance la fonction
> existante dans la mémoire du projet** « couleur des volets » sur le résultat.

Et le modèle écrit :

```
Couleur des volets(Matériau);
```

Cinq remarques tombent dans le volet, toutes justes. On corrige, on relance, et
la même ligne revient. On finit par croire que « ça ne marche pas ».

### La cause

**Seule la phrase montait.** La porte du serveur recevait `input: dit`, et rien
d'autre : pas la mémoire, pas la liste des fonctions, rien. Le modèle ne savait
donc pas que « Couleur des volets » existe, ni ce qu'elle lit, ni ce qu'elle
rend.

Ce n'était pas une faute de grammaire. C'était la **seule** chose qu'on puisse
écrire quand on ne sait pas qu'un nom existe : la forme qu'ont tous les autres
langages. Il n'avait pas les moyens de répondre autrement.

Lui apprendre la grammaire ne pouvait pas suffire, et c'est ce qui a été tenté
la ronde d'avant : la consigne disait déjà « une fonction conclut sous son
propre nom, les autres la lisent comme n'importe quel nom ». Une règle générale
ne dit pas **quels noms existent ici**.

### Ce qui monte, et ce qui ne monte pas

`ceQueLeProjetSait` ramène la mémoire à une liste, quelques lignes :

```
Ce projet a déjà signé ces fonctions. Elles existent : ne les réécris pas,
et ne les appelle pas — **nomme-les**, comme n'importe quel nom.
- Couleur des volets — lit Matériau — rend gris ou blanc
- Prix TTC — lit Prix HT, Taux de TVA

Pour t'en servir : `calcule X = Couleur des volets;` ou
`si (Couleur des volets = "gris")`. Déclare dans ta signature ce que tu lis
d'elles, et ce qu'elles lisent devient une entrée de ta fonction.
```

**Aucune valeur ne monte.** Ni les cotes, ni les conclusions, ni les citations,
ni les provenances, ni les auteurs, ni les zones. Le modèle a besoin de savoir
qu'un nom existe ; il n'a jamais besoin de savoir ce que **ce projet-ci** a
répondu. Envoyer les valeurs ferait sortir du projet des choses que personne n'a
demandé de faire sortir, pour un gain nul.

**La phrase qui décrit une fonction ne monte pas non plus**, bien qu'elle
aiderait : c'est de la prose écrite dans ce projet, elle peut nommer un
fournisseur, un site, quelqu'un. Ce qui sort d'un projet se décide ; « ça
aiderait » n'est pas une décision. Elle reste à l'écran, sur la fiche.

**Quatre-vingts au plus**, et l'on dit combien il en reste. Trois cents noms
feraient une consigne où la phrase qu'on vient de taper se lit au milieu d'un
annuaire ; le taire ferait croire que le projet ne contient que cela (règle 5).

**Le serveur relit ce qui monte** plutôt que de le croire : `ceQueLeProjetSaitLu`
refait le tri, recoupe à quatre-vingts, et jette ce qui n'a pas de nom. Ce qui
vient d'un navigateur n'est jamais ce qu'on suppose.

### Ce qu'une fonction annonce lire

La fiche de `Prix TTC` annonçait :

> lit Prix HT, Taux de TVA, **TVA**, **Prix TTC**

`TVA` est son propre `calcule`, et `Prix TTC` est elle-même. C'est ce qui
montait au modèle, et ce que l'aide à la signature montrait à l'écrivain : deux
entrées à remplir qui n'existent nulle part, et qu'on serait parti chercher.

Le catalogue écartait déjà les siennes pour une fonction du **brouillon** ; une
fonction **versée** passait à côté. La réponse est `entreesDuBloc` — celle que
la vérification de la signature exige déjà. La même question n'a pas deux
réponses (règle 4).

**Ce défaut n'a pas été trouvé par un test.** Il a été trouvé en regardant le
panneau dans un navigateur.

---

## 2. Une fonction versée ne se corrigeait pas

### Le symptôme

> Comment peut-on faire pour modifier une fonction existante ? Si je veux
> ajouter un `rend` à la fonction « couleur des volets » qui est déjà versée
> dans la mémoire du projet ?

On ne pouvait pas. Une fonction versée se relisait dans l'écran des fichiers,
se rejouait dans le bac, se nommait depuis une autre — et ne se modifiait pas.
Le seul chemin était de la retaper de mémoire, ce qui en fait **une seconde du
même nom** : le projet en tient deux, et la plus ancienne continue de répondre
quelque part (règle 10).

### Reprendre

Menu « … », « Reprendre une fonction du projet… ». Le panneau liste ce que le
projet a signé — le nom, la phrase qui dit à quoi elle sert, ce qu'elle lit et
ce qu'elle rend. Un clic, et son texte entier revient dans `essai.ref`.

**Rien n'est modifié en place.** Le chemin vers la mémoire reste celui de tout
le monde : une proposition relue ligne à ligne, puis signée (règle 1). Tant
qu'on n'a pas signé, c'est l'ancienne version qui vaut.

### Ce que reprendre exigeait, et qui manquait

**La signature.** Elle se déduisait des conditions, et une fonction qui lit par
un `calcule` les perdait toutes : `Prix TTC` serait revenue en
`fonction Prix TTC(zones)`, et se serait fait refuser à la relecture — on aurait
passé le premier quart d'heure à réparer ce qu'on venait de reprendre.

**Le commentaire.** L'écriture le posait, la lecture le jetait. Une fonction
versée perdait donc, définitivement, la phrase qui dit à quoi elle sert. Un
aller sans retour n'est pas une écriture, c'est une perte (règle 4). Le
**premier** commentaire seulement : les suivants disent pourquoi telle condition
existe, ce qui n'a de sens qu'à côté d'elle.

**La bonne version.** Les règles étaient prises « la première en vigueur par
sujet » — ce qui suffisait tant qu'il s'agissait de dire qu'un nom existe, et
plus du tout dès qu'on reprend son texte. On corrigeait, on signait, on
reprenait, et **c'est la version d'avant la correction qui revenait** : on
l'aurait corrigée indéfiniment sans jamais voir sa correction, et chaque reprise
aurait reversé l'ancienne par-dessus la neuve.

L'ordre dans lequel la base rend ses lignes n'est pas une réponse à « laquelle
vaut ». Ce qui tranche est le même juge que partout ailleurs dans la mémoire,
`laValeurQuiFaitFoi`, qui ordonne totalement. Et un seul endroit le demande :
l'écran avait son propre `find`, donc sa propre réponse — reprendre montrait une
version pendant que le modèle en recevait une autre (règle 10).

### Ce que cela ne fait pas

Les **déclarations** des noms qu'elle lit ne reviennent pas : elles vivent dans
`variables-du-projet.ref`, pas dans la fonction. Le volet affiche donc « nom
jamais déclaré » pour chaque entrée. Ça ne bloque rien et l'essai tourne, mais
c'est une liste de remarques qu'on n'a pas causées, sur un texte qu'on vient de
reprendre. C'est dans `à traiter plus tard`, avec ce qui la résoudrait.

---

## Ce que la ronde a appris

**Une consigne générale ne remplace pas un inventaire.** « Les fonctions se
nomment » était déjà écrit, et vrai, et inutile : ce qui manquait était la liste
des noms de ce projet-ci.

**Un aller sans retour n'est pas une écriture.** Le commentaire s'écrivait et ne
se relisait pas ; personne ne s'en apercevait, parce que ce qui revient est
juste — seulement incomplet. C'est la forme la plus discrète de la règle 4.

**« La première trouvée » est une réponse qui vieillit.** Elle était juste quand
la question était « ce nom existe-t-il ? » ; elle est devenue fausse le jour où
la question est devenue « quel est son texte ? ». Une réponse approximative ne
se signale pas quand son usage change.

**Trois gardes pour une question valent moins qu'une.** Le dédoublonnage d'une
signature est écrit trois fois sur le chemin ; il faut les casser toutes les
trois pour qu'un test tombe, c'est-à-dire qu'en casser une ne se voit jamais.
On l'a su en cassant, pas en lisant. C'est noté.
