# L'accueil, et le Copilote qui n'est d'aucun projet

## Le problème

L'accueil était une phrase de bienvenue. Elle ne répondait à rien, et l'on
repartait aussitôt vers la liste des projets — c'est-à-dire qu'on payait un
écran pour rien, tous les matins.

Et le Copilote, lui, vivait dans un projet. C'est ce qui fait sa valeur : il
hérite d'une mémoire — des affirmations tranchées, des zones, un périmètre — et
il ne devine pas, il lit. Mais **toutes les questions ne portent pas sur un
chantier**. « Où en suis-je ? », « comment je m'y prends pour une descente de
charges ? », « qu'est-ce que l'application sait faire ? » n'appartiennent à
aucun projet, et les poser obligeait à en ouvrir un au hasard. La réponse
arrivait alors chargée d'une mémoire qui n'avait rien à y voir.

## Ce que l'accueil répond

Trois questions, et une par colonne.

**Où je travaille en ce moment** — le rail, à gauche : un bouton vert pour créer
un projet, un champ pour en chercher un, et les cinq projets les plus actifs.

**Ce que je veux demander** — le Copilote, au centre, avec le choix du projet.
Par défaut, aucun.

**Ce qui vient de se passer** — quatre lignes à droite, chacune nommant son
projet et menant à l'onglet où la chose est.

## Comment se calcule « le plus actif »

`services/projets-actifs.js`.

Compter les **événements** répond de travers : un versement de deux cents pièces
un mardi matin ferait passer devant un projet qu'on n'a pas rouvert depuis. Le
nombre dirait « très actif » là où il s'est passé une seule chose, une seule
fois.

On compte donc **des jours** : le nombre de jours distincts où l'on y a fait
quelque chose, sur les quatre-vingt-dix derniers. Un projet ouvert tous les
matins pendant trois semaines compte vingt jours ; un projet où l'on a tout
déposé d'un coup en compte un. C'est exactement la différence qu'on cherche, et
elle tient en une phrase qu'on peut afficher à côté du nom — un classement qu'on
ne sait pas expliquer est un classement qu'on soupçonne.

Aucune pondération : trois sources valent pareil, parce qu'on ne saurait pas
justifier qu'une vaille 1,4 fois l'autre. Un poids qu'on ne peut pas défendre
est un poids qu'on finira par retoucher au hasard.

Les trois sources sont **toutes miennes** : une discussion avec le Copilote, une
proposition que j'ai ouverte, une étude d'utilitaire que j'ai remplie. Les
dépôts de documents en seraient une quatrième, et la plus parlante ; la table ne
dit pas **qui** a déposé, et « le projet a bougé » n'est pas « j'y ai
travaillé ». On ne les compte donc pas, plutôt que de compter le travail des
autres sous le mien (règle 5).

Les mêmes traces servent deux fois : le classement les compte, les actualités
montrent les dernières. Deux lectures séparées auraient fini par ne plus dire la
même chose du même projet (règle 4), et coûté deux fois le voyage. Les
actualités regardent seulement plus loin en arrière — un mois creux ne doit pas
rendre l'accueil muet, et la date le dit.

## Le champ de recherche **remplace** le classement

Il ne le filtre pas. Chercher dans les cinq plus actifs ne rendrait rien dès que
le projet cherché n'en est pas — c'est-à-dire précisément quand on le cherche, et
l'écran dirait « aucun projet de ce nom » d'un projet qui existe.

## Envoyer à l'accueil, c'est ouvrir le Copilote

**Entrée envoie, Maj+Entrée passe à la ligne** — exactement la convention du
Copilote, et c'est ce qui la rend supportable. Une première version basculait
dès la première frappe : l'écran changeait pendant qu'on écrivait, la page
sautait sous le curseur, et l'on ne pouvait plus se raviser. La bascule est
maintenant un geste, et non un effet de bord de la saisie.

Une question vide n'ouvre rien : Entrée sur un champ blanc changerait d'écran
sans rien emporter, et l'on se retrouverait ailleurs sans savoir pourquoi.

**Et la question part.** Elle n'arrivait qu'en brouillon dans le champ du
Copilote : il fallait refaire Entrée, et pendant la seconde où l'on ne
comprenait pas, la question paraissait perdue. On ne quitte l'accueil qu'en
envoyant — le Copilote pose donc la question au lieu de la déposer.

La question passe par `services/question-de-laccueil.js`, et **ni par l'adresse,
ni par le brouillon du Copilote** :

- l'adresse la mettrait dans l'historique du navigateur, dans les suggestions de
  saisie, et dans ce qu'on copie sans y penser pour partager un lien. Les
  discussions avec le Copilote sont privées ;
- le brouillon du Copilote est remis à zéro quand on change de projet — ce qui
  est exactement ce qui se passe entre l'accueil, qui n'est d'aucun projet, et le
  Copilote d'un chantier choisi dans la liste. La question aurait disparu
  précisément dans le cas où le choix du projet a servi à quelque chose.

## Ce que le Copilote transverse envoie à la place d'une mémoire

`services/profil-de-travail.js`.

Ce n'est pas une mémoire diluée. Un contexte qui mêlerait deux ou trois mémoires
ferait répondre sur l'un avec les chiffres de l'autre, et rien à l'écran ne le
dirait.

C'est une **description de la façon de travailler** : qui regarde, ses projets,
où le travail a lieu en ce moment — les jours par projet, tels que l'accueil les
calcule —, et ce qu'on y fait.

Et surtout une section **« Ce que tu n'as pas »**, qui dit en toutes lettres
qu'aucune mémoire de projet n'est jointe, qu'il ne faut en citer aucune valeur
même plausible, et que si la question en demande une, il faut dire **quel projet
ouvrir**. Un assistant sans matière répond quand même ; c'est là qu'il invente.
La consigne est écrite plutôt que confiée à sa retenue : c'est la leçon du
catalogue des utilitaires.

## La marque, une seule

`store.currentProjectId` nul — la même que les situations, tous les sujets et
toutes les propositions. C'est elle que le service lit pour n'envoyer **aucun**
identifiant de chantier, et que le rail lit pour demander à la base les
discussions qui n'en portent aucun. Un second drapeau dirait un jour autre chose
que le premier (règle 4).

## Ce qui n'a pas été redessiné

Rien, ou presque, et c'est voulu.

- le **rail** est celui de tous les rails (`ui/project-rail.js`,
  `ui/reglages-du-rail.js`) : position fixe, poignée de largeur, repli calé en
  bas, largeur en variable CSS ;
- le **rail des discussions** a quitté l'Atelier pour `ui/rail-des-discussions.js`
  et sert les deux écrans. Deux copies d'un menu qui **efface sans retour**
  divergent au premier correctif (règle 10). Son dessin est à part
  (`-rendu.js`), pour qu'un test puisse l'exécuter ;
- le **fil, la saisie, les pièces jointes et l'appel** sont ceux du Copilote de
  l'Atelier, sans une ligne de plus ;
- le **bouton vert** est `gh-btn--primary`, le **champ** est `gh-input`, le
  **choix du projet** est le menu de sélection de `ui/gh-split-button.js`.

Une seule différence entre les deux Copilotes : **« Créer un sujet » n'existe
pas sans projet**. Ce geste rend les messages visibles par l'équipe d'un
chantier — c'est le seul endroit de l'application où une conversation privée
devient publique. Sans projet, il n'y a nulle part où verser, et l'entrée
n'apparaît pas. Elle n'est pas grisée : un bouton désactivé fait chercher ce qui
manque, une entrée absente ne pose pas la question.

## La hauteur du fil, et le piège qu'on a évité

Le Copilote a **un seul ascenseur** : celui du fil. La coque ne défile pas, et
la hauteur restante est mesurée par le script puis écrite dans
`--copilote-hauteur`.

Cette mesure cherchait la coque par `.project-simple-page--studio`. Reprise
telle quelle, le Copilote transverse n'aurait jamais reçu de hauteur,
`height:100%` ne se serait rapporté à rien, et le fil aurait poussé la page —
sans un mot. Elle cherche donc `.project-simple-page`, que les deux écrans
portent et qu'un troisième portera.

`views/copilote-transversal-page.test.mjs` lit **la vraie ligne** et vérifie que
les deux coques la satisfont. Une garde qui aurait comparé le texte au sélecteur
attendu n'aurait constaté qu'une réécriture, pas un écran laissé dehors.

## La migration

`202610110001_copilot_conversations_sans_projet.sql`, strictement additive :
`project_id` cesse d'être obligatoire, et un index partiel couvre la recherche
`project_id is null`. Aucune colonne supprimée, aucune contrainte durcie.

**L'horodatage est celui de la dernière**, et pas un de plus tôt : `supabase db
push` refuse d'insérer une migration **avant** la dernière déjà appliquée. Un
horodatage repris à une migration existante — c'est arrivé ici — se range avant
elle dans l'ordre alphabétique, donc six migrations avant la dernière, et le
déploiement s'arrête en nommant *l'autre* fichier. Rien dans le dépôt ne le
signalait : le SQL était juste et les tests passaient.
`scripts/lordre-des-migrations.test.mjs` le voit désormais.

**La politique de sécurité ne bouge pas d'une ligne.** Elle n'a jamais regardé le
projet, seulement le propriétaire : une discussion sans chantier reste
propriétaire seul, comme les autres.

Et la lecture des traces de l'accueil passe par la **porte unique**
(`copilote-conversations-supabase.js`), comme tout ce qui touche à ces deux
tables. Ce n'est pas une politesse : c'est ce qui permet de savoir, à un seul
endroit, tout ce qui est lu de discussions privées — et
`copilote-cloison.test.mjs` casse la construction si un autre module s'y met.
