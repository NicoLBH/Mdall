# La courbe d'activité d'un projet

## La question

La liste des projets disait leur nom, leur client, leur ville et leur phase.
Rien ne disait **lesquels vivent**. Or c'est la première chose qu'on cherche en
arrivant sur la liste : un chantier livré depuis six mois et un chantier où
trois personnes travaillent cette semaine s'y ressemblaient trait pour trait.

Une courbe verte par ligne, sur douze mois glissants, y répond d'un coup d'œil —
et sans rien lire.

## Ce qu'elle compte, et à qui elle appartient

**Ce qui est entré dans le projet**, pas ce que j'y ai fait. C'est toute la
différence avec le classement de l'accueil (`projets-actifs.js`), qui ne compte
que mes traces et répond à « qu'ai-je dans les mains ? ». Ici la question est
« ce chantier vit-il ? », et elle regarde toute l'équipe : un projet où trois
personnes travaillent sans moi est un projet actif.

Trois sources, chacune une façon pour quelque chose d'entrer :

- un **compte rendu versé** (`documents`) ;
- une **proposition ouverte** (`propositions`) ;
- un **commentaire écrit** sur un sujet (`subject_messages`).

Ce qui est supprimé ne compte pas : un document effacé n'a pas fait vivre le
projet, il a fait une manœuvre.

Aucune pondération, pour la même raison qu'ailleurs : un poids qu'on ne saurait
pas défendre est un poids qu'on retouche un jour au hasard.

## Douze mois, au pas de la semaine

La **fenêtre** est de douze mois ; le **pas** est la semaine. Douze points
dessinent une ligne brisée sur laquelle un mois calme et un mois chargé se
touchent ; cinquante-deux donnent une forme qu'on lit d'un coup d'œil — c'est
tout ce qu'on demande à une courbe large de cent pixels.

Toutes les semaines sont posées, y compris les vides. Ne tracer que celles qu'on
a vues serrerait les creux jusqu'à les faire disparaître, et deux projets
n'auraient pas la même échelle de temps : l'un montrerait une année, l'autre
trois semaines, sur la même largeur.

La semaine commence le **lundi** — celle du calendrier français. Partir du
dimanche décale toute la courbe d'un cran, et rien à l'écran ne le montrerait.

## Chaque projet à son propre maximum

Une forme, pas une mesure. À l'échelle commune, un chantier calme à côté d'un
chantier très actif serait une ligne plate, et l'on ne verrait pas qu'il a repris
le mois dernier — ce qui est précisément ce qu'on cherche dans une liste.

Le total se lit au survol : une forme sans chiffre laisse deviner un ordre de
grandeur qu'elle ne porte pas.

## Une courbe qu'on n'a pas lue n'est pas une courbe plate

`null` tant que la lecture n'a pas abouti, et la cellule reste **vide**. Une
ligne à zéro dirait « ce projet n'a rien vécu de l'année » : c'est une
information, et on ne l'a pas (règle 5). Lu et vide, en revanche, c'est une
autre phrase — et là, la ligne plate est juste.

## Le compte se fait dans la base

`202610120001_activite_des_projets.sql`.

Ramener les lignes pour les compter dans le navigateur voudrait dire descendre
tous les documents, toutes les propositions et **tous les commentaires** de
l'année, de tous les projets — des milliers de lignes dont on ne garderait qu'un
nombre. Et une limite de lecture tronquerait la courbe par son côté le plus
ancien, sans que rien à l'écran ne le dise.

Ce qui traverse le réseau est donc ce qu'on dessine : un projet, une semaine, un
nombre.

**`security invoker`** : la fonction s'exécute avec les droits de qui l'appelle,
et les politiques des trois tables s'appliquent exactement comme sur une lecture
directe. En `security definer`, elle aurait compté les projets qu'on n'a pas le
droit de voir — et rendu leur existence par la bande, puisqu'une courbe est déjà
une information. `stable` interdit au moteur toute écriture, ce qu'aucune
relecture ne garantit.

La migration est additive : elle n'ajoute qu'une fonction, ne touche aucune
table et aucune politique.

## Le dégradé n'est pas un effet

Le trait est **sombre en bas, clair en haut**. C'est ce qui rend les sommets
lisibles sur une ligne de cent pixels : à couleur constante, un pic d'une semaine
et un palier de trois mois pèsent le même vert, et l'œil ne distingue plus la
forme du fond — un aplat de trait sur un fond sombre se lit comme un
soulignement.

Le dégradé est calé sur le **cadre**, en `userSpaceOnUse`, et non sur l'étendue
du tracé : en unités de boîte, une courbe plate n'aurait aucune hauteur et le
dégradé s'effondrerait sur une seule teinte. Calé sur le cadre, deux courbes
voisines montrent la même couleur à la même hauteur.

Chaque courbe a **son propre identifiant de dégradé**. Un `id` répété dans une
page fait pointer toutes les courbes vers le premier dégradé rencontré : rien ne
se verrait tant qu'elles se ressemblent, et le jour où l'une change de teinte les
autres suivraient sans qu'on comprenne.

## Ce qui n'a pas été redessiné

La teinte du haut est `--success`, celle des états ouverts : c'est déjà la
couleur de « ça bouge », et en inventer une seconde ferait deux verts à retoucher
ensemble. Les deux teintes vivent dans la feuille de style et sont lues par
variable CSS, si bien que le SVG n'en connaît aucune.

La colonne s'ajoute à la grille du tableau existant, qui garde ses largeurs
relatives.
