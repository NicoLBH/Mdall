# Le cerveau bat dans la conversation

## Trois nombres ne donnent envie de rien

La carte du cerveau portait trois chiffres et un bouton. On lit « 214 liens », on
hausse les épaules, on passe. Le dessin, lui, **bat** — et un projet qui pense
dans une bulle de conversation se regarde, puis s'ouvre en grand.

C'est le **même** dessin, pas une version réduite : la boucle d'animation, le
battement, le glissé, la molette, les secteurs, l'onde au clic. Un second dessin
« simplifié » aurait été un second dessin à corriger, et deux dessins d'un même
projet finissent par ne plus se ressembler (règle 4). `ouvrirLeCerveau` accepte
donc un **hôte** : sans lui, la fenêtre pleine ; avec lui, un cadre de quatre
cent vingt pixels dans le message.

Ce que le cadre retire est ce qui n'a pas de place dans une bulle : le rail des
réglages, la croix — un message ne se ferme pas —, et le titre, déjà celui de la
carte quatre-vingts pixels plus haut. Restent la ligne du bas qui dit quoi faire,
et les trois boutons qui servent vraiment ici : approcher, reculer, recadrer.

**Il s'ouvre en volume, vivant, couché, en chaleur.** C'est la vue où un projet
ressemble à quelque chose : les strates en profondeur, le battement qui montre
que ça pense, la séparation horizontale entre ce dont on se souvient et ce qu'on
en déduit, et la chaleur qui dit par où passe le raisonnement. Les réglages
passent par les mêmes fonctions que les boutons — les écrire dans l'état
sauterait le recadrage, et le dessin s'ouvrirait sur une caméra qui ne
correspond plus à ce qu'il montre.

### Une boucle laissée derrière tourne pour toujours

Le fil se réécrit entièrement à chaque message, à chaque étape d'agent, à chaque
conversation qui arrive. Les toiles partent avec — **les boucles, non** : elles
continuent sur un canevas détaché, et il y en a une de plus à chaque rendu. Au
bout de dix messages l'onglet chauffe, et rien à l'écran ne le dit. Les dessins
sont donc retenus par leur place dans le fil, et retirés avant le suivant.

Deux autres précautions, du même genre : un cadre ne prend pas le verrou « une
seule fenêtre à la fois » — un fil peut en porter trois, qui ne se recouvrent
pas —, et **Échap ne le referme pas** : il emporterait un morceau de la réponse
qu'on est en train de lire.

### Le bouton dit ce qu'on gagne à ouvrir

« Ouvrir le cerveau » sous un dessin déjà visible ne promet rien. Ce qui manque
au cadre — les réglages, les secteurs, l'onde au clic — se lit maintenant sous
le libellé.

## Le copilote propose le dessin sans qu'on le demande

Il attendait qu'on dise « montre-moi le cerveau alors ». Or l'utilisateur ne sait
pas qu'il peut le demander. Dès qu'une réponse parle de ce que le projet sait, de
la façon dont il raisonne, de ce qui dépend de quoi ou de ce que Mdall fait de la
mémoire, l'agent est appelé : montrer vaut mieux qu'énumérer. Pas deux fois de
suite — un dessin par sujet suffit.

## Une valeur déjà donnée ne se redemande pas

Le copilote redemandait la contrainte de sol alors qu'elle avait été dite dans la
conversation. Les consignes disaient « n'invente jamais une valeur d'entrée », et
il en concluait qu'il ne devait en passer aucune. Or reprendre une valeur que
l'utilisateur vient d'écrire n'est pas l'inventer.

Elle vaut pour **toute la conversation**, pas pour un message : qu'elle ait été
donnée en réponse à une demande de précision ou en passant — « avec une
contrainte de sol de 0,2 MPa, ça donne quoi ? » —, elle se cherche dans ce qui
précède avant de se redemander. C'est la faute la plus visible qu'on puisse
commettre ici : elle dit à l'utilisateur qu'on ne l'a pas lu.

## On restait coincé sur l'écran du Copilote

Deux défauts, et il fallait les deux pour arriver là.

**Changer de panneau ne ramenait pas la coque en haut.** Le routeur le faisait
pour ses propres entrées, pas pour les raccourcis qui passent par
`afficherPanneau` — celui du Copilote en particulier. On descendait dans une
étude de fondations, le bandeau se repliait, on cliquait « Copilote » : le
panneau changeait, la coque gardait ses huit cents pixels de défilement. Le
bandeau restait donc replié, et **replié il n'a plus d'onglets**. Le Copilote
tenant dans la hauteur, plus rien ne pouvait ramener la coque en haut.

**Et le fil ne pouvait pas le déplier.** Un fil de conversation est calé en bas —
c'est le dernier message qu'on veut voir en arrivant —, donc il est toujours
défilé, donc le bandeau l'aurait replié en permanence. Une hauteur de lecture
gagnée au prix de la navigation n'est pas un gain.

Ces écrans-là posent `data-compactage-directionnel`, et c'est le **sens** qui
décide : on descend, le bandeau s'efface ; on remonte d'un cran, il revient.
C'est le geste qu'on fait déjà pour relire ce qui précède. Quatre pixels de jeu,
parce qu'une inertie de pavé tactile rend des mouvements d'un pixel dans les deux
sens et que le bandeau clignoterait. Et à la première lecture on ne replie pas :
on ne sait pas d'où l'on vient, et un fil qui arrive calé en bas garde ses
onglets.

Le reste de l'application ne change pas : sans le repère, c'est la position qui
décide, comme avant.

## Fondations : d'où l'on vient, le filet, où l'on est

Le titre flottait au milieu de la ligne. La ligne de titre écarte ses enfants aux
deux bords, et ils étaient trois : le retour, le filet et le titre. Ils tiennent
maintenant dans un seul bloc, calé à gauche — mesuré au navigateur : le retour à
24 px, le filet à 203, le titre à 214, les gestes toujours à droite.

Le filet est un **trait dessiné**, pas un caractère : une barre verticale de
police change de hauteur et d'épaisseur avec elle, et se posait de travers à côté
d'un titre de vingt-deux pixels. Le caractère reste dans le HTML pour qui lit le
texte sans la feuille de style.
