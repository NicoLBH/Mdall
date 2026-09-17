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

**Où je travaille en ce moment** — le rail, à gauche : le titre et le bouton vert
sur une ligne (dans un rail, chaque ligne compte), un champ pour chercher un
projet, et les cinq plus actifs, **le plus travaillé en tête**.

**Le nombre de jours ne s'affiche pas.** C'est ce qui range la liste, ce n'est
pas ce qu'on vient y chercher : un compte à côté de chaque nom se lit comme une
note — on se met à comparer des chantiers plutôt qu'à en ouvrir un — et
« 11 jours » se lit tout aussi bien comme le délai depuis la dernière activité,
qui est l'inverse de ce que le nombre veut dire.

Cette liste-là n'a pas de gouttière à gauche, ni de retrait sur son contenu.
Ailleurs, le retrait fait la place du trait bleu de l'entrée courante ; ici
aucune entrée n'est « celle qu'on regarde » — ce sont des destinations —, et le
retrait ne faisait que décaler la liste du titre qui la surmonte.

**Ce que je veux demander** — le Copilote, au centre, avec le choix du projet.
Par défaut, aucun.

Il n'y a **pas d'invite au-dessus de la saisie**. Le Copilote d'un projet en porte
une parce qu'il doit dire quelle mémoire il lit ; ici l'écran entier est
l'accueil, et la phrase répétait ce que le titre et le choix du projet disent
déjà — en poussant la saisie hors du premier regard. La page porte à la place la
ligne de titre de tous les écrans, alignée sur la colonne centrale.

La saisie est celle du Copilote, et se voit : le trombone, le compteur de crédits
et leur séparateur sont là, **éteints**, parce qu'ils demandent une discussion
ouverte — qui n'existe qu'une fois la question posée. Les trois boutons du
dessous sont les siens aussi, pris dans `ui/actions-du-copilote.js` plutôt que
recopiés : c'est ce qui dit que c'est le même outil.

**Ce qui vient de se passer** — quatre lignes à droite, chacune nommant son
projet et menant à l'onglet où la chose est, alignées sur une timeline
verticale. Le rond ne porte aucune information : le genre est dit par le lien et
par où il mène. Sa seule fonction est de faire une colonne — quatre lignes
alignées sur un filet se lisent comme une suite, quatre lignes posées l'une sous
l'autre se lisent comme une liste.

## « Tableau de bord » en haut, « Accueil » sur la page

La barre du haut nomme **où l'on est** dans l'application ; le titre de la page
nomme **ce qu'on y fait**. Le même mot aux deux endroits se lisait comme une
répétition, et n'apprenait rien la seconde fois.

Et « Tableau de bord » ne vaut **que pour l'accueil**. Les autres écrans
transverses tombaient dans le même cas par défaut : la barre annonçait « Tableau
de bord » sur le Copilote, sur Tous les sujets et sur Toutes les propositions. On
arrivait donc sur un écran que la barre appelait autrement, et le premier réflexe
est de croire qu'on a mal cliqué. Chacun prend son nom dans
`services/ecrans-transversaux.js`, là où le menu et la route le prennent déjà.

## La barre du haut respire autant sans projet qu'avec

Dans un projet, l'en-tête n'a pas de bordure : c'est la barre d'onglets, plus
bas, qui porte le trait. Sans projet, il n'y a pas d'onglets, et le trait se
posait à quatre pixels sous les icônes — la même barre paraissait serrée d'un
écran à l'autre, sans qu'on sache pourquoi.

Le retrait devient symétrique et la barre prend la hauteur qu'elle avait déjà sur
la liste des projets, qui était calée depuis longtemps : c'est un réglage qu'on
généralise, pas un qu'on invente. Le contenu descend d'autant, et la condition
est **l'en-tête lui-même** plutôt que la route — les écrans sans projet ne
partagent aucune classe sur le corps, certains posent même `route--project` parce
qu'ils empruntent sa coque. Une liste de routes écrite dans la feuille de style
serait juste le jour où on l'écrit, et fausse au premier écran de plus.

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
proposition que j'ai ouverte, une étude d'agent que j'ai remplie. Les
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

## La grille est celle du détail d'un sujet

La colonne centrale porte le Copilote, celle de droite l'activité récente : c'est
le même partage que le corps d'un sujet et ses métadonnées, et l'on n'a aucune
raison de le recalibrer deux fois. Les trois seuils — la largeur de droite, son
repli à 256, l'empilement en dessous — sont écrits une fois pour les deux écrans
(règle 4), et les seuils se rapportent à la **colonne**, non à la fenêtre : un
rail déplié rétrécit le contenu sans que la fenêtre bouge.

La colonne centrale fait la largeur du Copilote, et **centrée comme lui**. Elle
faisait 720 pixels quand le fil en fait 860 : on écrivait la première question
dans un cadre étroit, puis l'écran s'élargissait d'un coup au moment où l'on
basculait — on croyait avoir changé d'outil. Le nombre vit désormais à un seul
endroit (`--copilote-colonne`), et le fil, la saisie et l'accueil le lisent tous
les trois.

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
catalogue des agents.

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

---

## Le Copilote sait ouvrir les écrans

On écrivait « ouvre-moi le Copilote du Restaurant scolaire au Reposoir » et il
répondait *rendez-vous dans l'onglet Atelier, puis Copilote*. On refaisait alors
à la main le chemin qu'il venait de décrire. Une application qui sait où sont
ses écrans ne devrait pas faire épeler l'itinéraire.

Il le fait désormais : le projet s'ouvre, sur le bon onglet, et sur le bon
panneau quand il y en a un.

### Il nomme le projet, il ne choisit pas son identifiant

C'est la règle que `profil-de-travail.js` posait déjà — *nommer le projet à
ouvrir plutôt que d'inventer un chiffre plausible*. Un identifiant deviné
mènerait à un projet réel, celui de quelqu'un d'autre, et rien à l'écran ne
dirait que ce n'était pas celui qu'on demandait.

Le rapprochement se fait donc au navigateur, qui a la liste, et il pardonne ce
qu'il faut : accents, casse, ponctuation, et les mots-outils du français. « le
restaurant scolaire au reposoir (74) » reconnaît « Restaurant scolaire — Le
Reposoir (74) », parce que personne ne retape un tiret cadratin. Le département
entre parenthèses n'est pas exigé : on le donne pour aider, il ne doit pas
faire rater le projet.

### Trois réponses, et pas deux

Reconnu, **plusieurs**, aucun. Confondre les deux derniers serait la faute :
« je n'ai pas trouvé » et « j'en ai trouvé deux » n'appellent pas la même suite,
et prendre le premier des deux ouvrirait le mauvais chantier sans que personne
ne l'ait demandé (`fondamentaux.md`, règle 5). Quand deux projets répondent,
**personne n'est déplacé** et l'outil rend les deux noms, pour que la question
se repose en citant des noms qui existent.

### On part quand la réponse est écrite, pas avant

L'outil ne déplace personne : il reconnaît, il compose l'adresse, il la rend. Le
déplacement a lieu quand la réponse est à l'écran **et enregistrée**. Partir au
milieu du tour aurait démonté l'écran pendant que le modèle répondait, et la
réponse se serait écrite dans un fil que plus personne ne regardait.

Une carte reste dans la conversation, avec l'icône de l'écran où l'on est allé
et un lien qui y ramène : on revient sur la discussion des jours plus tard, et
elle dit où l'on était allé.

### Où vit quoi, et pourquoi

| | |
|---|---|
| la liste des destinations et l'adresse de chacune | `_shared/utilitaires/ecrans-du-projet.js`, copié au navigateur |
| ce que le modèle en sait | `_shared/utilitaires/navigation-outil.js`, **jamais** copié |
| la reconnaissance du projet | `services/copilote-navigation.js` |
| la carte dans le fil | `views/studio/copilote/carte-du-voyage.js` |

La liste des écrans est copiée parce que les deux côtés en ont besoin, et pour
deux raisons différentes : le serveur **déclare l'énumération** au modèle — un
choix fermé, donc rien à inventer —, le navigateur **compose l'adresse** de
celle qu'il a choisie. Écrite des deux côtés, elle divergerait au premier écran
ajouté, et la divergence serait muette : un `insights` que le modèle propose et
qu'on ne sait pas ouvrir.

Les **libellés**, eux, ne sont pas dans cette liste. « Fichiers », « Mémoire »,
« Indicateurs » vivent avec les onglets, dans `constants.js`, et la carte va les
y chercher — ainsi que l'icône de l'onglet, pour qu'on reconnaisse la
destination avant d'avoir lu son nom. Un test tient les deux listes ensemble :
un écran offert au modèle dont l'application ne porte pas l'onglet le fait
tomber.

### Le troisième outil du navigateur

Ils sont trois maintenant à s'exécuter dans la page : le moteur de variante, la
lecture du cerveau, et l'ouverture d'un écran — parce que ce qu'ils font y est
déjà, et que l'adresse d'une page ne se change que là où la page est.

Le navigateur ne sait toujours pas quels outils existent : le serveur lui donne
un **rôle**, appel par appel. Le rôle et la liste sortent désormais de la même
table (`ROLES_DU_NAVIGATEUR`) : elles s'écrivaient séparément, et un outil
ajouté à l'une sans l'autre serait parti au navigateur sans rôle. Un test
vérifie que chaque rôle déclaré est un rôle que le navigateur sait exécuter, et
qu'aucun nom d'outil n'est écrit dans la page.

### Le défaut qui ne se voit sur aucune des deux moitiés

Au premier essai, à « ouvre-moi le copilote du Reposoir, restaurant scolaire »,
le journal a dit **« Lancement de ouvrir un ecran »** — donc le serveur avait
bien l'outil, et le modèle l'avait bien appelé — puis « Lecture de ce qui dépend
de cette valeur », qui est une étape du **moteur de variante**. À l'écran : un
encadré rouge, « Test d'une variante — il faut dire ce qu'on change ». Personne
n'avait bougé.

Le serveur et le site se déploient séparément. Le serveur était à jour, le site
non. L'appel est donc parti au navigateur avec le rôle `navigation`, et
l'aiguillage d'alors — un ternaire, *« cerveau, ou sinon variante »* — a lancé
le moteur de variante. Les deux moitiés étaient justes ; c'est leur décalage qui
ne l'était pas, et il dure le temps d'un déploiement ou d'un cache de
navigateur.

**Trois corrections, de la plus superficielle à la plus profonde.**

**1. Un rôle inconnu ne s'exécute plus au hasard.** L'aiguillage est une table :
un rôle absent arrête le tour au lieu de lancer l'outil d'à côté (règle 5). Ce
n'est pas suffisant — le tour échoue quand même —, mais c'est honnête.

**2. Le navigateur dit ce qu'il sait faire, et le serveur n'offre que cela.**
Chaque question emporte les **rôles** que cette page-ci sait exécuter — des
rôles, pas des noms d'outils : elle n'en apprend aucun. Le serveur ne déclare au
modèle que les outils dont le rôle y figure : un outil que la page ne connaît pas
n'est pas proposé, donc jamais appelé. Un navigateur qui ne dit rien est un
navigateur d'avant, et reçoit les deux rôles qui existaient alors — lui supposer
les rôles du jour serait exactement le défaut qu'on répare.

La liste annoncée **est** la table qui exécute, lue autrement. Deux listes
auraient divergé au premier rôle ajouté (règle 4). Elle vit dans
`services/copilote-executeurs.js` — un fichier à part, parce que c'est le point
où un décalage se paie et qu'il faut pouvoir le confronter, en vrai, à la table
des rôles du serveur.

**3. Une question n'est pas une panne.** « Il faut dire ce qu'on change » est ce
qu'un agent *demande*, pas ce qui a échoué. Encadré de rouge comme une erreur, il
fait chercher une panne qui n'existe pas — et c'est pire quand l'agent n'aurait
pas dû être appelé du tout. Le rouge est désormais réservé à ce qui a vraiment
échoué ; une demande de précision porte le ton du doute. Les deux se dessinent
dans `carte-sans-resultat.js`, un module pur, pour que la distinction se vérifie
sans ouvrir l'application.

S'y ajoutent deux garde-fous de langage : les consignes du moteur de variante
disent qu'une demande d'ouvrir un écran n'en est pas une, et celles de la
navigation interdisent trois phrases — « je vous emmène vers… » (on appelle
l'outil, on ne l'annonce pas), « voulez-vous que je l'ouvre ? » (quelqu'un qui
écrit « ouvre-moi » a déjà demandé), et « vous êtes maintenant dans… » quand
l'outil n'a pas tourné dans ce message-ci.

Enfin, le maillon entre « l'outil a tourné » et « l'écran a bougé » est sorti du
fil : `routeOuAller()` vit avec le reste de la navigation, où il se vérifie sans
navigateur. C'est le maillon dont la panne se lit comme un mensonge.

### La cloison, et le trou qu'on a trouvé en la cassant

Le test de couplage des deux tables doit importer un module du serveur depuis un
fichier de test du site — ce que la cloison interdit, à juste titre : un module
d'écran qui remonte au serveur emporterait l'orchestration avec la page.

Un fichier de test, lui, n'est chargé par aucune page. La garde distingue donc
désormais ce qu'une page peut charger de ce qui traîne dans le dossier, et une
seconde ferme la porte que la première entrouvre : **rien de ce que le site
charge n'importe un fichier de test**.

En cassant cette seconde garde pour la voir tomber, elle n'est pas tombée : elle
ne regardait que `from "…"` et `import("…")`, et laissait passer l'import à
effet de bord — `import "…"`, celui qu'on écrit précisément quand on veut juste
qu'un module soit chargé. Le trou existait aussi dans la garde d'origine, depuis
toujours. Les trois formes sont maintenant couvertes, dans les trois sens de la
cloison.

### Ce qui reste à faire

Depuis le Copilote **d'un projet**, la question « ouvre-moi les fichiers » sans
nommer de projet ne trouve rien et se fait redemander. Le projet courant
pourrait servir de réponse par défaut ; ce n'est pas fait, et c'est délibéré :
tant que la liste des projets n'est pas dans le contexte d'un projet, la seule
chose honnête est de redemander.
