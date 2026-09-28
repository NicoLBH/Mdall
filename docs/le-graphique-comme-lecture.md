# Le graphique : une façon de regarder un tableau

**À quoi sert cette page :** dire pourquoi le dessin d'un tableau n'est **pas**
une construction du langage, ce que ce parti pris fait gagner d'un coup à toutes
les fonctions déjà écrites, et quelle est la seule concession — `se lit en:`.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le verrou

Une boucle rend un tableau. Quarante-cinq lignes de chiffres répondent
exactement à la question posée, et **ne montrent rien** : une descente de charge
qui double d'un niveau à l'autre, une portée qui s'effondre au-delà d'un seuil,
une pression qui plafonne — ce sont des formes, et une colonne de nombres ne
donne pas de forme.

Il fallait donc dessiner. Restait à décider **où** le dessin est décidé.

## Le parti pris, et il décide de tout

> **Un graphique n'est pas une construction du langage, c'est une façon de
> regarder un tableau.**

Rien ne s'écrit dans la fonction pour obtenir un dessin. Tout tableau qu'une
boucle déroule se regarde en courbe ou en barres, **choisi à la lecture**.

C'est ce qui fait que *tous* les tableaux gagnent le dessin d'un coup, y compris
ceux écrits avant que cela n'existe. Pas une fonction à rouvrir.

### L'alternative, et pourquoi elle était mauvaise

Un verbe d'affichage — `trace la courbe de Moment` — se serait écrit en une
après-midi, et il était mauvais pour deux raisons.

**La fonction aurait cessé d'être pure.** Elle aurait porté, en plus de son
raisonnement, une intention de mise en page que le rejeu doit ignorer. Une
fonction Mdall dit ce qu'elle déduit ; elle ne dit pas comment on la regarde.

**Chaque nouvelle façon de regarder aurait demandé de rouvrir les fonctions déjà
écrites.** Le jour où un nuage de points devient utile, il faudrait repasser sur
tout ce qui est versé — et ce qui est versé dans une mémoire ne se rouvre pas à
la légère.

## La seule concession : la fonction peut **suggérer**

```
fonction Descente de charge(zones, Charge par niveau) {
   // Ce qui arrive en pied de poteau, niveau par niveau.
   se lit en: barres

   pour chaque Niveau de 1 à 4 par pas de 1
      calcule Charge cumulée = Charge par niveau * Niveau;

   calcule Charge en pied = le plus grand de Charge cumulée;
   si (Charge en pied > 0 kN)
   alors (Charge en pied);
}
```

`se lit en:` **ne dessine rien.** Il dit quelle lecture s'ouvre en premier.

L'auteur sait ce que son tableau veut dire — une descente de charge se regarde
en barres, une portée en courbe —, et l'ignorer ferait ouvrir quarante-cinq
lignes de chiffres là où un dessin répondait. Ce n'est qu'un **défaut** : le
lecteur change d'avis d'un clic, et c'est précisément le sens de « choisi à la
lecture ».

Trois mots se lisent : `tableau`, `courbe`, `barres`. Un quatrième se refuse
avant le lancement, en montrant ceux qui existent.

## Le tableau reste le défaut, et ce n'est pas de la timidité

Sans `se lit en:`, c'est le tableau qui s'ouvre. **C'est lui qui se compare au
texte d'origine, et c'est la vérification.** Un dessin qui s'ouvrirait tout seul
ferait croire qu'on a vérifié parce qu'on a regardé.

Et le dessin **remplace** le tableau, il ne s'y ajoute pas : les deux ensemble
feraient deux lectures du même fait, et l'on lirait celle du haut. Le bouton dit
qu'on choisit ; montrer les deux dirait qu'on ne choisit pas.

## Ce que le dessin ne fait pas

**Il n'a pas d'axes chiffrés.** Les nombres sont **sous** le dessin, dans le
tableau, où ils se lisent exactement. Les répéter en graduations ferait deux
lectures du même fait, dont l'une approximative — et c'est celle-là qu'on
croirait (règle 4 : une valeur écrite à deux endroits finit par diverger).

**Il ne mélange pas deux grandeurs sur une grille.** Une colonne en mètres cubes
et une colonne en tonnes dessinées ensemble se croisent là où elles ne se
croisent pas, et l'on lit un rapport qui n'existe pas. L'unité de la première
colonne décide pour toutes, et `convertir` seul écarte les autres : c'est la
règle des unités qui tranche, et elle tranche **une fois** (règle 10).

**Il ne tait pas ce qu'il a écarté.** Les colonnes non dessinées sont nommées
sous le dessin. Les taire ferait un dessin qui a l'air complet : on compterait
deux courbes là où le tableau a trois colonnes, sans qu'un mot dise laquelle
manque (règle 5 : ne pas savoir n'autorise pas à prétendre qu'il n'y a rien).

**Il n'offre pas un dessin impossible.** Un tableau d'une seule ligne n'a pas de
bouton : un bouton qui ouvre un cadre vide apprend à ne plus cliquer sur les
boutons.

**Il ne décale pas une ligne manquée.** Une ligne qu'aucun calcul n'a su tenir
laisse un trou, et les points suivants gardent leur abscisse. Les décaler
ferait glisser toute la fin de la courbe d'un cran, et le dessin serait faux
sans que rien ne le dise.

## L'abscisse ne se choisit pas

**C'est la variable de boucle**, et il n'y a pas de choix à faire : c'est ce qui
change d'une ligne à l'autre, et tout le reste en découle.

Une abscisse qu'on choisirait à l'écran ferait dessiner une colonne contre une
autre — ce qui est un nuage de points, c'est-à-dire une autre question. Elle se
posera peut-être un jour, devant un tableau qu'on a ; elle ne se pose pas
d'avance.

## Un seul dessin pour tout le langage

Deux objets se dessinent : l'**abaque** d'une `courbe`, et le **tableau** qu'une
boucle déroule. Ils partagent une géométrie (`trace-dun-graphique.js`) et un
rendu (`views/ui/graphique.js`).

Deux rendus écrits séparément auraient eu chacun leur cadre, leur marge, leur
épaisseur de trait et leur famille de classes — et il aurait fallu les
recalibrer l'un contre l'autre à chaque retouche, pour finir par deux dessins
qui ne se ressemblent plus. L'abaque, écrit au lot précédent, a donc été
**reversé** sur la géométrie commune : il ne calcule plus la sienne.

Trois teintes, et ensuite on recommence. Un tableau à sept colonnes dessiné en
sept teintes ne se lit plus : on cherche la légende au lieu de regarder la
forme. Au-delà de trois, c'est le tableau qu'il faut lire.

## Les défauts que ce lot a trouvés, et comment

**Une géométrie fausse ne casse rien.** Elle rend un dessin parfaitement
lisible, dont on tire un rapport qui n'existe pas. C'est la seule famille de
défaut qu'un graphique produit, et elle ne se voit qu'en comparant les nombres
au dessin.

**Les barres ne partaient pas de zéro.** Vu dans le navigateur, pas par une
épreuve : la barre de 12 kN avait une hauteur nulle, parce que l'échelle
commençait à 12. On lisait un rapport de l'infini pour un. C'est la faute
classique du graphique, et la seule que la forme elle-même impose d'éviter :
une barre dit une quantité, la tronquer à la base la ment. Une ligne, elle,
part de ses valeurs — c'est une variation, pas une quantité.

**Les écoutes partaient avec le panneau.** Les boutons vivent dans le panneau
des résultats, et ce panneau est remplacé à chaque frappe du formulaire. Des
écoutes posées sur les boutons partaient avec lui, et le second clic ne faisait
rien — le pire des défauts, parce qu'on croit avoir mal visé et qu'on reclique.
Le rebranchement après chaque redessin en aurait été la réponse, mais c'est une
réponse qu'il faut se rappeler de donner à **chaque nouveau chemin de redessin**.
Une écoute posée **une fois sur le bac** n'a rien à se rappeler : le panneau peut
être remplacé autant de fois qu'on veut. Le défaut n'est plus corrigé, il est
devenu impossible.

**Une épreuve ne mesurait rien.** Elle voulait montrer qu'une colonne d'une
autre grandeur est écartée, et sa colonne d'essai était en fait une colonne
*incalculable* : elle éprouvait la branche vide, et serait restée verte si la
règle des unités avait disparu. Il a fallu une colonne qui **se calcule très
bien** et qui mesure autre chose.

## Comment ça se vérifie

Chaque affirmation de cette page est une épreuve. Trois choses valent d'être
nommées.

**Les tableaux des épreuves viennent d'une vraie boucle**, et jamais d'objets
façonnés à la main : une table écrite à la main prendrait les hypothèses du code
pour des faits, et cesserait d'éprouver ce que le langage produit vraiment.

**Le câblage a ses propres épreuves**, parce qu'il est invisible s'il casse : un
service qui sait faire des séries et un écran qui ne les lui demande pas ne
cassent rien — ils rendent un tableau de chiffres devant un bouton qui ne fait
rien. Et une écoute déléguée parfaitement écrite que personne n'appelle rend un
écran où tout se dessine, où seul le clic ne fait rien : c'est l'une des deux
épreuves de ce lot qui **relisent le source**, et c'est l'exception qui le
justifie.

**La consigne du modèle se relit avec le lecteur du langage** : un mot enseigné
que le langage ne lit pas est pire qu'une absence — le modèle l'écrit, et la
ligne est refusée par la documentation elle-même (règle 12).
