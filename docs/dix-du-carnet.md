# Dix chantiers du carnet, faits ensemble

**À quoi sert cette page :** le carnet gardait dix chantiers « vus, compris,
décidés pas maintenant ». Ils ont été faits d'un coup. Cette page dit ce que
chacun a changé, et surtout **ce qui a été décidé** — car la moitié d'entre eux
n'attendaient pas du travail, ils attendaient une décision.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## 1. L'euro se colle au nombre

`120 €` se lisait, `120€` non — là où `20%` et `30°` se collent déjà. On
obtenait le **texte** « 120€ » au lieu d'une mesure : la comparaison se taisait
au lieu de compter, ce qui est le pire des deux (règle 5). Et un devis se recopie
tel qu'il est imprimé.

**`$` et `£` ne suivent pas.** Mdall n'a qu'une monnaie ; ouvrir la porte à deux
symboles qu'aucune unité ne connaît donnerait des mesures qui ne se comparent à
rien, ce qui se relit plus mal qu'un texte.

**Trouvé en passant, en regardant l'écran** : `€`, `°`, `°C` et `%` ne passaient
pas par le découpage en mots et tombaient donc en **gris** au milieu d'une ligne
colorée — `20%` se colorait même en *opérateur*, alors que `28 m` s'allume juste
à côté.

## 2. `si (A) et (B)` sur une seule ligne se refuse

Le `et` d'une condition veut sa propre ligne. Écrit à la suite, tout ce qui
suivait le premier guillemet était avalé dans la valeur attendue :

```
si (A = "1") et (B = "2")     →   clause « A = 1") et (B = "2 »,  faux
si (A = "1" et B = "2")       →   clause « A = 1" et B = "2 »,    faux
```

Un résultat plausible et faux — la seule faute que cette langue ne pardonne pas.
La seconde forme ne se **voyait** même pas : la ligne se lisait, et la clause
répondait.

**C'est un refus qui manquait, pas une lecture à élargir** : la forme sur deux
lignes existe et marche. La cause était qu'on décollait la première et la
dernière parenthèse sans regarder si elles se répondent. Et la phrase montre la
ligne à écrire : renvoyer relire la grammaire pour un retour chariot serait
cruel.

## 3. Le dédoublonnage d'une signature était écrit trois fois

« Cette liste de paramètres se dédoublonne-t-elle ? » recevait trois réponses sur
le chemin, et il fallait les casser **toutes les trois** pour qu'une épreuve
tombe — c'est-à-dire qu'en casser une ne se voyait jamais (règle 4).

**Laquelle garder n'était pas une affaire de goût.** L'une des trois comptait de
travers, et cela se voyait à l'écran : `ligneDeDonnee` recolore aussi une ligne
**telle qu'on l'a tapée** dans un diff, et `Classement du bâtiment (Hauteur,
Hauteur)` s'y affichait « (Hauteur) ». Du texte qui disparaît d'un écran qui
existe pour montrer ce qui change.

Le dédoublonnage appartient donc à qui **compose** la liste des entrées —
`entreesDuneSignature`, une fois. Les deux écritures posent ce qu'on leur donne,
comme `ligneDeFonction` le faisait déjà.

## 4. Un refus mène à sa ligne

Le bac disait « essai.ref · ligne 7 », la console « essai.ref:7 », et il fallait
aller compter dans la gouttière. Pour quarante lignes, on compte deux fois et
l'on se trompe une fois sur trois — puis on corrige la ligne d'à côté, ce qui
fait un second refus.

Un clic referme la fenêtre du bac, ouvre le bon onglet, pose le curseur sur la
ligne et l'amène sous les yeux. **Un seul chemin pour les deux places** : la
console affichait « essai.ref:7 » et ouvrait le fichier en *ignorant* le numéro
qu'elle montrait juste à côté (règle 10).

Pas de bouton là où l'on ne peut pas écrire — l'essai d'un utilitaire n'a pas de
zone de code, et un bouton qui ne mène nulle part se clique deux fois avant
qu'on comprenne.

## 5. Une zone se choisit dans l'écran des fichiers

Le rejeu d'une fonction versée tourne zone par zone et les empilait toutes : sur
un projet à six bâtiments, six tableaux de quarante lignes à faire défiler pour
retrouver celui qu'on cherchait.

« Toutes » reste le défaut — partir sur un bâtiment ferait croire qu'une fonction
n'en déroule qu'un. Les zones offertes sont **celles qui se déroulent** : offrir
toutes celles du projet ferait cliquer pour obtenir un écran vide, et l'on ne
saurait pas si c'est le bâtiment qui n'a rien ou l'écran qui n'a pas compris.

**Trouvé en chemin** : l'écran affichait la **clé** de la zone — `batiment-a` —
en tête de chaque tableau, là où la mémoire porte son nom.

## 6, 7 et 8. `rend:` — déduit, vérifié, comparé

Trois entrées du carnet, une seule question : **que rend cette fonction, et qui
le sait ?**

### Déduit quand il manque

Une fonction qui conclut `12 kN`, `24 kN`, `36 kN` rend visiblement des
kilonewtons. On ne le déduisait pas du tout, par prudence : une promesse déduite
d'un texte qu'on est en train d'écrire change à chaque frappe.

> **L'écrite gagne toujours, et la déduite ne fait que se montrer.**

Elle ne se verse pas, ne se vérifie pas contre elle-même, et n'apparaît nulle
part sans le mot « déduit » à côté : une promesse est un engagement, une
déduction est une observation, et les présenter pareil ferait compter sur un
engagement que personne n'a pris.

**Trois silences restent**, et chacun a sa raison : une branche sans unité (douze
quoi ?), deux grandeurs mélangées, et une conclusion qui nomme une locale — sa
valeur dépend des réponses.

### Vérifié après le lancement

`rend:` se comparait aux conclusions écrites, et s'arrêtait à celles qui nomment
un `calcule`. Or c'est **la forme la plus courante du langage** : le contrôle qui
attrape les vrais cas ne pouvait pas exister avant qu'on lance.

Le bac, lui, vient de calculer la valeur :

```
Prix TTC   conclut  120 €
« Prix TTC » annonce rendre des kN, et vient de conclure « 120 € » :
ces deux unités ne mesurent pas la même chose.
```

On ne vérifie **jamais** une promesse déduite contre les conclusions dont elle est
tirée : elle tiendrait toujours, et l'on aurait une garde qui ne peut pas tomber.

### Comparé à ce qu'un appelant en attend

`si (Couleur des volets(zones, Matériau) = "violet")` sur une fonction qui annonce
`rend: "gris" ou "blanc"` est une clause **qui ne tiendra jamais**. Elle répondait
« faux » tranquillement, et l'on cherchait l'erreur dans les valeurs.

Et dans l'autre sens : `F(zones, G(zones, X))` se contrôle enfin. On l'avait noté
comme une limite assumée — « un calcul n'a pas de domaine fermé » —, mais un
appel n'est pas un calcul : `G` dit ce qu'elle rend.

**On n'éprouve que ce qui est promis.** Comparer une attente à une déduction
refuserait un texte qu'on est en train d'écrire : la branche qui manque est
peut-être la prochaine ligne.

## 9. Le contrôle des domaines voit la mémoire

« Cette fonction ne saura jamais répondre pour ce nom-là » ne se disait que d'une
fonction écrite dans les fichiers qu'on vérifie. Appelée depuis la **mémoire** —
le cas le plus courant une fois qu'on verse — elle échappait au contrôle : on
obtenait le silence, qui se lit comme « tout va bien ».

La question ouverte du carnet était : *que doit dire une page vérifiée **sans**
mémoire, pour que la même page ne rende pas deux verdicts ?*

> **Ce qu'on sait en plus s'ajoute, et ne retire jamais.**

Sans mémoire on se tait sur ces appels-là ; avec, on en dit davantage. Aucune
remarque ne disparaît en apprenant quelque chose — sinon on ne saurait plus si
son absence veut dire « c'est bon » ou « on n'a pas lu la base ». Et le
**brouillon gagne** sur la mémoire : c'est la version qu'on est en train
d'écrire.

## 10. Une algèbre d'unités composées

`kN/m` et `N/mm` sont la même chose, et le langage les refusait l'une à l'autre.
Une charge linéique en kN/m dans une note, la même en N/mm dans un logiciel de
calcul : il fallait convertir de tête avant d'écrire la ligne.

Ce qui manquait n'était pas un cas de plus, c'était un **exposant par grandeur**
au lieu d'une grandeur unique. Les grandeurs dérivées se disent donc en
fondamentales :

| écriture | dimension | et donc |
|---|---|---|
| `m²` | longueur² | `ha`, `a` s'y comparent, comme avant |
| `kN/m` | force · longueur⁻¹ | `= N/mm`, `= daN/cm` |
| `MPa` | force · longueur⁻² | `1 MPa = 1000 kN/m²` |
| `km/h` | longueur · temps⁻¹ | `= 3,6 m/s` |

**La force reste fondamentale**, et n'est pas dérivée de la masse : ce métier ne
convertit jamais l'une en l'autre — il n'y a pas de `g` dans le langage —, et les
lier ferait accepter `3 kg + 2 kN` sur un facteur qu'aucune ligne n'écrit.
**La puissance aussi** : dériver le watt ferait convertir `kW` en `kN·m/h`, que
personne n'écrit et que le lexique ne sait pas lire.

**Un rapport sans dimension ne se compare à rien.** `m/m` et `kN/kN` sont tous
deux « un nombre nu » ; les rendre comparables ferait additionner un rapport de
longueurs à un rapport de forces.

Ce qui reste : **multiplier** une unité composée refuse encore. C'est au carnet,
avec la raison — le faire à moitié donnerait des conversions fausses d'un facteur
mille, ce qui est pire que de refuser.

## 11. L'abaque à double entrée

*(le dixième chantier — les trois `rend:` n'en faisaient qu'un)*

Les Eurocodes n'ont pas que des courbes : ils ont des **nappes** — un coefficient
d'exposition selon l'altitude **et** la zone de vent. Elles s'écrivaient en
barème, c'est-à-dire par paliers : on rendait la valeur d'un seuil là où le texte
d'origine trace une droite.

« Interpoler sur deux axes » est un travail connu. Le verrou était **ce qu'on
montre** : une surface ne se compare pas à une figure d'un coup d'œil, et le gain
de cette écriture est précisément là.

> **Une nappe est une famille de courbes, et on la lit comme l'ingénieur lit
> l'abaque imprimé : on se place sur une courbe, puis on la lit.**

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

Altitude 750 m, zone 1,5 → l'écran **dessine la courbe de la colonne 1,5** —
interpolée point par point entre les colonnes 1 et 2, comme la règle qu'on pose à
la main entre deux traits du document —, y marque la lecture, et dit :

```
entre les colonnes 1 et 2, lu entre 500 m et 1000 m · 3 points
```

La courbe obtenue est une courbe **ordinaire** : elle se dessine, se trace et se
relit avec tout ce qui existe déjà. Rien de neuf dans le calcul, donc : deux
interpolations qu'on sait faire, dans l'ordre où on les lit.

**C'est la signature qui décide** qu'un abaque a deux axes, et non la forme du
tableau : le compter sur les cases ferait dépendre le sens d'une ligne d'une
autre ligne. Et `entre les points:` comme `hors bornes:` valent pour les **deux**
axes — un seul tableau, une seule déclaration à vérifier.

**Trouvé à l'écran, pas par une épreuve** : le formulaire du bac n'offrait aucun
champ pour la seconde entrée. L'abaque concluait — on lui avait donné la valeur à
la main —, et son second champ n'était nulle part : une fonction qu'on ne peut pas
essayer sans connaître son texte par cœur.

## Ce que cela ne change pas

**Rien n'entre dans la mémoire.** Tout ce qui précède lit, vérifie ou montre. La
seule porte reste la proposition signée (règle 1).

**Aucun refus ne devient une réponse.** Les deux chantiers qui touchent au calcul
— les unités et l'abaque — n'acceptent que ce qui est désormais démontrable ; ce
qu'on ne sait pas composer refuse comme avant.
