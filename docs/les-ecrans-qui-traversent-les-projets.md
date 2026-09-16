# Les écrans qui traversent les projets

## Le problème

Mdall range presque tout par projet : ses documents, ses sujets, ses
propositions, sa mémoire. C'est juste — un projet est une unité de travail, et
ce qui s'y décide n'a pas de sens ailleurs.

**Mais on ne travaille pas un projet à la fois.** On arrive le matin en se
demandant ce qu'il y a à faire, pas sur quel chantier le faire. « Qu'est-ce qui
est bloqué ? », « qu'est-ce qui attend une décision ? », « qu'est-ce qui porte le
label critique ? » sont des questions qui traversent les projets — et l'on ne va
pas ouvrir quinze onglets pour y répondre.

Les situations l'ont montré les premières : elles sont sorties du giron d'un
projet parce qu'une situation dit ce qu'une **personne** se donne à faire. Les
sujets et les propositions se lisent de la même façon.

## Les trois entrées du menu

`services/ecrans-transversaux.js` tient leur nom, leur adresse et leur icône.
Chaque entrée est dite à trois endroits au moins — le menu, la route, le titre de
l'écran — et recopiée, elle finit par différer de l'une des trois (règle 10).

**« Tous les projets », et non « Projets ».** L'entrée menait déjà à la liste de
tous les projets ; son nom se lisait comme une catégorie plutôt que comme une
destination. Les trois commencent maintenant par le même mot, et l'on comprend
d'un coup d'œil que ce sont trois façons de tout regarder.

## Tous les sujets

**Cet écran n'ajoute aucune règle.** C'est tout le point.

- la **grammaire** de la barre est celle que les situations emploient déjà
  (`vocabulaire-du-carnet.js`) : elle connaît les labels, les objectifs, les gens
  et les projets de tous mes projets ;
- les **menus de filtre** de l'en-tête sont ceux de l'onglet Sujets d'un projet ;
- le **tableau** est celui que le formulaire d'une situation montre déjà —
  labels, auteur, blocage, fil, et le projet en colonne.

Une requête écrite ici retient donc exactement ce qu'elle retiendrait ailleurs
(règle 4). L'ordre des menus est en revanche le sien : le **projet d'abord**,
puisque c'est la première chose qu'on restreint quand on les traverse — et la
seule qu'un écran de projet ne peut pas offrir.

**Il n'ouvre pas un sujet.** Un sujet se lit, se commente et se ferme là où il
est, avec son fil, ses pièces et son arborescence. Chaque ligne mène à l'onglet
Sujets de son projet.

**Ce que la lecture coûte.** Une charge de sujets assemble cinq lectures par
projet — labels, objectifs, assignés, liens, signaux. Quinze projets font donc
soixante-quinze requêtes, lancées en parallèle. C'est le même coût que l'écran
des situations, et le réduire touche le chargeur, pas cet écran.

## Toutes les propositions

**Une proposition est une ligne**, pas une charge : `in.(…)` les prend toutes
d'un coup, et le compte des documents avec. Quinze projets font **deux**
requêtes, pas trente. C'est pourquoi `listPropositionsDesProjets` ne boucle pas
sur `listPropositions`.

La recherche y est en **texte libre**, et non la grammaire des sujets : une
proposition n'a ni label, ni assigné, ni objectif, et lui poser cette barre
promettrait des filtres qui ne retiendraient jamais rien. Elle cherche dans le
titre et dans le nom du projet — les deux choses à l'écran sur chaque ligne.

**Il n'ouvre pas une proposition.** Elle se lit, se discute et se tranche là où
son corpus est. Un détail monté ici montrerait la moitié de ce qu'elle est, et la
moitié qui manque est celle où l'on décide.

## Ce que ces écrans partagent

**Leur coquille.** `mon-carnet-coquille.js` sert les trois : c'est une coquille
de projet, sans projet. En écrire une seconde pour les nouveaux aurait fait deux
calages à retoucher ensemble, dont l'un finirait en retard sur l'autre.

**Leur marque.** `currentProjectId` nul, comme le carnet. C'est la seule chose
qui distingue « tous mes projets » de « celui-ci », et elle vit dans le magasin —
un second drapeau dirait un jour autre chose que le premier (règle 4).

**Leur découpe.** Un module qui parle à la base ne s'importe pas dans un test :
l'authentification tire son client d'un CDN, et l'import lève avant la première
ligne. Le **dessin** de chaque écran vit donc à part (`*-page.js`), précisément
pour qu'un test le monte et regarde ce qui sort. C'est la leçon du carnet, où un
nom employé sans être déclaré est passé trois tours sans bruit : seule
l'exécution le voit.

---

## Ouvrir, paginer, et ce qui manquait à la charge

### Une ligne mène quelque part

Les deux écrans listaient sans ouvrir : une ligne menait à l'onglet du projet,
et il fallait y retrouver à la main ce qu'on venait de désigner. C'était un lien
à moitié mort.

L'adresse porte maintenant l'identifiant :
`#project/<projet>/sujets/<sujet>` et `#project/<projet>/propositions/<proposition>`.
Elle se copie, elle se partage, et elle survit à un rechargement.

Trois modules se passent la main, et **explicitement** : le routeur lit le
quatrième morceau, la mise en page le transmet à l'onglet, l'onglet l'ouvre. Une
boîte aux lettres partagée aurait été un canal caché ; trois paramètres se lisent.

**On ouvre après la lecture, et pas avant.** `selectSubject` cherche le sujet
dans ce que l'écran a chargé : appelé tout de suite, il ne trouve rien et
s'arrête sans un mot — la ligne cliquée mènerait alors à la liste, ce qui se lit
comme un lien mort. Côté propositions, le mécanisme existait déjà
(`pendingPropositionId`, pour un sujet qui cite une proposition) : l'adresse
passe devant, et c'est le même endroit qui exécute le geste (règle 4).

### Le tableau sous un formulaire ne mène nulle part

C'est la même fonction de rendu, et elle sert à deux choses différentes. Sous le
formulaire d'une situation, on regarde ce que la requête retient **pendant qu'on
l'écrit** : un lien y ferait quitter une page non enregistrée, et l'on perdrait
ce qu'on venait de composer.

`ouvrable` tranche, et il vaut `false` par défaut — un appelant qui n'y pense pas
ne casse rien.

### Paginer

Huit cents sujets et mille deux cents propositions ne tiennent pas sur une page :
le navigateur met une seconde à poser le document, et l'on ne le parcourt pas de
toute façon — on cherche, on ne feuillette pas. Vingt-cinq par page, la taille
qu'emploient déjà les autres tableaux.

Deux choses importent, et toutes deux se lisent dans l'en-tête :

- **le compte est celui de tout ce que la recherche retient**, pas celui de la
  page. « 25 sujets » au-dessus d'une liste qui en retient huit cents ferait
  croire que la recherche a tout écarté ;
- **changer la recherche ramène à la première page.** Rester à la page douze
  d'une liste qui n'en fait plus trois montre un tableau vide, et l'on croit que
  la recherche ne retient rien.

Sans pagination demandée, tout est rendu : c'est le cas du formulaire, où la
liste est courte par construction.

### Ce qui manquait à la charge transversale

`chargeDunChantier` lisait les liens, les assignés, les labels et les objectifs.
Elle ne lisait **ni le compte des fils, ni les signaux** — et rien ne
l'échouait. Trois choses s'en trouvaient fausses, en silence :

- le **compteur de fils** restait vide sur toutes les lignes, ce qui se lit comme
  « aucune discussion » alors que c'est « je n'ai pas demandé » ;
- **« Mentions »** se déclarait et ne retenait jamais rien : l'index était absent,
  `undefined` devient une liste vide, et un sujet qui ne porte rien sort de tous
  les filtres — exactement la panne que `charge-des-sujets.js` porte écrite
  au-dessus d'elle ;
- **« Activité récente »** retombait sur `updated_at`, et manquait donc tout ce
  qui se passe dans le fil de discussion, c'est-à-dire l'essentiel de la vie d'un
  sujet.

`signauxLus` dit enfin la vérité : `false` n'est pas « aucun signal », c'est « on
ne sait pas », et les lectures qui en dépendent ne se proposent alors pas plutôt
que de rendre une liste vide (règle 5).

Cela touche aussi l'écran des situations, qui emploie la même charge : le défaut
y était depuis le début.

---

## Ranger, couper en deux, et nommer les états

### Le même en-tête que dans un projet

Les deux tableaux transversaux montraient une liste, et rien pour la prendre par
un bout. L'onglet Sujets d'un projet, lui, a depuis longtemps ce qu'il faut : un
filtre **ouverts / fermés** à gauche de l'en-tête, et un **bouton de tri** dans
sa dernière colonne.

Rien n'a été redessiné. Ce sont les mêmes composants
(`ui/table-head-filter-toggle.js`, `ui/tete-de-tableau.js`), les mêmes classes
(`table-head-filter-group`, `table-head-sort`, `cell-assignees-head`,
`situations-sujets-tete`) et le même service d'ordre (`tri-des-sujets.js`). Une
seconde mise en forme aurait divergé au premier réglage, et il aurait fallu
recalibrer deux écrans à chaque retouche.

Le tableau des sujets reçoit ces deux morceaux **tout dessinés**
(`statutHtml`, `triHtml`), comme il recevait déjà les menus de filtre : c'est
l'écran qui sait ce qu'un clic doit écrire chez lui, et le tableau ne retient
aucun état filtrant. Sous le formulaire d'une situation, il n'en reçoit aucun —
on y regarde ce que la requête retient pendant qu'on l'écrit, et un bouton qui
couperait ou rangerait la liste ferait croire que la situation retiendra ce
qu'on voit.

### Le filtre n'a pas de case à lui

Cliquer « Ouverts » **écrit `statut:ouvert` dans la barre**. Il n'y a donc qu'un
seul état filtrant — la requête —, et le bouton ne peut pas dire autre chose
qu'elle (règle 4). C'est la troisième réparation du même filtre dans l'onglet
d'un projet qui a tranché : la case y a été supprimée plutôt que déplacée une
fois de plus.

Deux conséquences se voient à l'écran :

- **les comptes sont ceux des listes qu'ils ouvrent.** Ils sont obtenus en posant
  le jeton et en filtrant pour de vrai. Un compte pris à côté — « tout ce qui
  n'est pas fermé » — annoncerait deux ouverts là où le clic n'en montre qu'un :
  la grammaire compare le statut mot pour mot, et un sujet clos comme doublon
  n'est ni dans l'une ni dans l'autre ;
- **rien n'est allumé tant que rien n'est demandé.** Sans jeton, la liste montre
  tout ; prétendre qu'on regarde les ouverts ferait chercher où sont passés les
  autres (règle 5). Recliquer le bouton allumé l'éteint, et l'on revoit tout.

Les propositions n'ont pas de grammaire : leur filtre tient donc dans l'écran,
avec la même coupe que l'onglet d'un projet — **fusionnée et refusée sont toutes
deux closes**, parce que la question posée est « qu'est-ce qui attend encore une
décision ? ».

### Le tri, et le nom de l'ordre d'origine

La liste s'ouvre sur **ce qui a bougé en dernier**, comme dans un projet : c'est
la question qu'on se pose en arrivant, et l'ordre d'arrivée y répondait en
dernier, après quatre-vingt-treize lignes. L'ordre d'origine reste à un clic.

`motDuTri` prend maintenant le **nom de cet ordre**. « Revenir à l'ordre du
projet » est juste dans un projet ; sur un écran qui les traverse, la même phrase
promettrait un rangement par projet que le bouton ne fait pas. Ici, c'est
« l'ordre d'arrivée ».

Les gestes de la tête portent des noms **à chaque écran** (`sujets-tous-tri`,
`propositions-toutes-etat`…). `quandOnClique` range ce qu'on lui déclare dans une
table unique pour toute l'application : deux écrans qui partageraient un nom se
voleraient leur geste, et le dernier monté gagnerait — sans que rien ne le dise.

### Un sujet abandonné n'est pas un sujet fait

Trois tableaux montrent des sujets, et chacun dessinait son icône. Deux d'entre
eux ne connaissaient que deux états. Un sujet **abandonné** — clos parce qu'il ne
tenait pas, ou parce qu'il faisait double emploi — y prenait donc la coche verte
de ce qui est fait : le contraire de ce qui s'est passé, et c'est justement le
signe qu'on regarde en parcourant soixante lignes.

`ui/etats-des-lignes.js` est maintenant le seul endroit qui dise l'état d'une
ligne et le signe qui va avec — pour les sujets comme pour les propositions.
`issueIcon`, dans l'onglet d'un projet, ne fait plus que traduire ce que ses
appels lui passent.

L'abandon s'écrit de **trois façons** selon d'où vient la ligne : le statut de la
base (`closed_invalid`, `closed_duplicate`), le motif de fermeture
(`non_pertinent`, `duplicate`), et l'état de relecture (`rejected`, `dismissed`)
que l'écran d'un projet tient de son côté. Les trois disent la même chose et
n'arrivent pas ensemble — la charge transversale lit les colonnes de la base,
l'écran d'un projet lit ce que le geste vient d'écrire. N'en regarder qu'une
revient à ne voir l'abandon que sur l'écran qui l'a provoqué.

### Un titre de ligne ne se souligne pas

`row-title-trigger` est née sur un bouton, qui n'a pas de soulignement. Les
écrans qui traversent les projets en ont fait un lien, et le navigateur souligne
les liens : le même titre se lisait donc autrement selon l'écran, et le
soulignement — qui est ici le signe du survol — ne disait plus rien. La classe le
dit maintenant une fois, pour tout le monde.
