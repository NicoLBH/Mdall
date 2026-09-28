# Le nuage, les cadres empilés, et le tableau d'une fonction versée

**À quoi sert cette page :** trois questions que le lot du graphique avait
laissées ouvertes, et la façon dont chacune a été tranchée. Elles se tiennent :
toutes les trois portent sur ce qu'on a le droit de montrer, et sur ce qu'un
dessin peut faire croire.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## 1. Le nuage : la seule lecture qui pose une question

Les trois premières lectures — le tableau, la courbe, les barres — prennent
l'abscisse de la boucle. **Il n'y a rien à demander** : c'est ce qui change
d'une ligne à l'autre, et tout le reste en découle.

Un nuage répond à une autre question : non plus « comment ça varie » mais
**« qu'est-ce qui va avec quoi »**. Il dessine une colonne contre une autre, et
son abscisse ne peut donc venir que du lecteur.

### Il ne se suggère pas, et c'est la seule exception

`se lit en: nuage` est **refusé**. Une suggestion de nuage devrait nommer une
colonne — `se lit en: nuage contre Volume` —, c'est-à-dire porter dans la
fonction une intention de mise en page. C'est exactement ce que le parti pris
du lot précédent refuse, et le nuage ne fait pas exception parce qu'il est plus
utile que les autres.

Le refus le dit, plutôt que de le ranger parmi les fautes de frappe :

```
« nuage » ne se suggère pas : il choisit son abscisse parmi les colonnes,
et ce choix se fait à la lecture. Il s'ouvre d'un clic sous le tableau.
```

Confondre les deux ferait chercher longtemps une orthographe qui était juste.

### Ce qu'un nuage montre ici n'est pas un nuage de mesures

**C'est une différence qui vaut d'être sue.** Dans un tableau Mdall, chaque
colonne est une fonction de la variable de boucle : il n'y a **pas de bruit**,
pas d'échantillon, pas de dispersion. Ce qu'on regarde est une relation
paramétrique exacte — deux colonnes qui varient ensemble parce qu'elles
descendent du même paramètre.

On n'y lit donc pas une corrélation statistique, et il n'y a rien à y régresser.
On y lit une **forme** : une relation linéaire, un coude, un plateau. C'est
utile, et ce n'est pas la même chose.

### Le trait est ce qu'on retire

Une ligne brisée dit un ordre — ceci puis cela. Un nuage ne relie pas ses
points : les relier ferait lire une progression là où l'on regarde une forme.

En échange, l'abscisse ne dit plus de quelle ligne vient chaque point. C'est la
**variable de boucle** qui le dit, au survol : « 1,5 m³ (Hauteur 3 m) → 3 m³ ».
Sans elle on lit un nuage sans savoir lequel de ses points est la troisième
ligne, et l'on ne peut plus revenir au tableau.

## 2. Deux grandeurs : des cadres empilés, jamais un second axe

Jusqu'ici, une colonne qui ne mesurait pas la même chose que la première était
**écartée** — nommée sous le dessin, mais absente. Un tableau à deux grandeurs
perdait donc la moitié de ce qu'il portait.

### Pourquoi pas un second axe

C'est la réponse habituelle, et **c'est la façon la plus commune de faire lire
une corrélation qui n'existe pas.**

Deux échelles choisies séparément placent le croisement des deux courbes
**exactement où l'on veut**. Décalez l'une de vingt pour cent et elles se
croisent vingt lignes plus loin ; le dessin reste parfaitement lisible, et il ne
dit plus rien de vérifiable — il dit ce que son auteur a décidé. Il n'y a aucun
moyen, en regardant un tel graphique, de savoir si le croisement est un fait ou
un réglage.

C'est la même famille de faute que la barre qui ne part pas de zéro, en plus
difficile à voir.

### Ce qui a été fait à la place

Une grandeur par **cadre**, et les cadres s'empilent sur **une seule abscisse**.

- Ils ne se croisent jamais : il n'y a pas de croisement à mal lire.
- Ce qu'on compare est ce qui se compare vraiment : **la forme**, à la même
  abscisse — ce qui monte pendant que l'autre descend.
- Chaque cadre garde une échelle qu'on peut lire seule, et dit ce qu'il mesure.

**L'abscisse est calculée sur tous les groupes à la fois.** Une colonne qui
manque une ligne ne doit pas décaler son cadre d'un cran par rapport à celui
d'en dessous : on lirait deux dessins l'un sous l'autre qui ne parlent pas des
mêmes lignes, et c'est précisément le défaut que l'empilement promet de ne pas
avoir.

**Les bornes se disent une fois**, sous le dernier cadre. Les répéter ferait
croire que chaque cadre a la sienne.

### Un nombre sans unité prend l'échelle du premier groupe qu'il peut partager

C'est ce que le langage décide partout ailleurs — `memeGrandeur` —, et une
seconde décision ici finirait par ne plus dire la même chose (règle 10). Un rang
nu n'ouvre donc pas un cadre à lui seul.

## 3. Le tableau d'une fonction versée

L'écran des fichiers **réécrit** une fonction versée : sa boucle, ses agrégats,
sa suggestion de lecture. Il n'en déroulait aucune. Une fonction dont tout
l'intérêt est son tableau s'y lisait comme quinze lignes de grammaire, et il
fallait la recopier dans le bac d'essai pour voir ce qu'elle produit.

`se lit en: barres` s'y relisait déjà, et ne dessinait rien : on gardait la
phrase de l'auteur sans jamais la servir.

### Le défaut qu'il a fallu corriger d'abord

En allant brancher le rejeu, il est apparu qu'**il n'y avait rien à rejouer**.

Une fonction versée depuis le bac n'emportait que ses conditions, ses branches
et son `sinon`. Sa **boucle**, ses **calculs**, sa **suggestion de lecture** et
la **forme** d'un barème restaient sur le quai. L'écran des fichiers lisait donc
depuis le début des champs que rien n'écrivait jamais.

**C'est la faute la plus chère de cette famille, parce qu'elle ne se voit pas :**
rien n'est faux à l'écran. La condition est juste, le `alors` est juste, et les
quinze lignes qui les produisent ont disparu. La fonction versée paraît plus
simple qu'elle n'est — et la mémoire ne peut plus rejouer ce qu'elle tient,
puisqu'elle ne le tient plus (règle 5).

Le versement emporte maintenant le raisonnement entier. Le champ ne s'écrit que
s'il existe : une fonction sans boucle n'en déclare pas une vide, sans quoi
l'écran chercherait un tableau qui n'existe pas.

### Ce que le panneau montre, et ce qu'il ne montre pas

**Ce que le projet tient aujourd'hui**, et rien d'autre : les valeurs versées,
lues **zone par zone**. Une variable n'a pas *une* valeur, elle en a une par
partie d'ouvrage ; ne montrer que le premier tableau ferait lire la descente de
charge d'un bâtiment sous le nom de l'autre.

**Ce n'est pas un bac d'essai.** On n'y répond à aucune question, et l'on n'y
choisit pas la lecture : un écran de lecture ne garde pas ce qu'on a cliqué. Le
dessin suit la suggestion de la fonction, et s'arrête là.

**On ne rejoue pas jusqu'au point fixe.** `rejouerLesRegles` répond à « que
deviendrait le projet si » ; cet écran répond à « qu'est-ce que cette fonction
donne sur ce que le projet tient ». Faire tourner les règles les unes dans les
autres rendrait un tableau qui n'est écrit nulle part, sur un écran qui montre
ce qui est écrit.

**Le panneau se pose sous le texte, jamais à sa place.** Le fichier est ce qui
est versé ; le tableau est ce qu'il produit. Les intervertir ferait lire un
résultat avant la règle qui le produit — et c'est le texte qui se signe.

### Un tableau de tirets n'est pas un résultat

Une fonction dont les entrées ne sont pas versées déroule quand même sa boucle :
ses bornes sont écrites dans la fonction, pas dans la mémoire. Elle rend donc
quatre lignes, toutes vides.

Les afficher se lirait comme « cette fonction ne produit rien », alors que la
vérité est « le projet ne porte pas encore ses entrées ». L'écran nomme ce qui
manque (règle 5). **Une case connue sur quatre, en revanche, se montre** : c'est
là qu'on voit *laquelle* des lignes a échoué, et c'est celle qu'on cherche.

## Un seul tableau pour deux écrans

Le bac d'essai et l'écran des fichiers montrent le même tableau à deux moments
très différents — « qu'est-ce que ça donne si » et « qu'est-ce que ça donne sur
ce que le projet tient ». Le rendu est le même, et il vit désormais à un seul
endroit.

Écrits deux fois, ils auraient divergé au premier réglage : une colonne écartée
dite d'un côté et tue de l'autre, un cadre empilé ici et un second axe là
(règle 10).

## Comment ça se vérifie

Chaque affirmation de cette page est une épreuve.

**Les tableaux viennent d'une vraie boucle, et les fonctions versées d'un vrai
versement.** Une charge écrite à la main prendrait les hypothèses du code pour
des faits : c'est précisément ce qui aurait masqué la troncature ci-dessus,
puisqu'une épreuve qui fabrique elle-même un `payload.regle.boucle` ne peut pas
voir que personne ne l'écrit.

**L'aller-retour est éprouvé entier** — écrite, versée, réécrite, relue — parce
que le versement et la réécriture sont deux modules qui ne se connaissent pas,
et qu'il suffit qu'un champ manque à l'un des deux pour qu'une ligne disparaisse
sans un mot.

**Deux épreuves relisent le source**, et c'est l'exception qui les justifie : un
panneau parfaitement écrit qui n'est jamais appelé, et un panneau appelé qui
n'est jamais nourri, rendent tous deux un écran identique à celui d'avant. Aucune
épreuve de rendu ne peut les voir.

**Et l'on a regardé l'écran.** C'est là qu'on a vu qu'un cadre solitaire
n'annonçait que sa grandeur — « une force », « une longueur » — sans jamais
nommer la colonne du tableau qu'il dessine : la légende ne paraît qu'à partir de
deux séries, et personne ne l'avait remarqué en lisant le code.
