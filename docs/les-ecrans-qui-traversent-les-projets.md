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

---

## Le même écran, mais pour tous les projets

### On part des ouverts, et le jeton se lit dans la barre

`statut:ouvert` est la **requête de départ** de « Tous les sujets », et
« Ouvertes » celui de « Toutes les propositions ». On arrive sur ces écrans pour
savoir ce qu'il reste à faire ; tout montrer d'un coup y mêle des années de
sujets réglés, et la liste répond à une question qu'on ne pose jamais.

**Le jeton est écrit dans la barre**, et c'est tout le point : il s'y lit, il
s'y sélectionne et il s'y **efface**. Qui veut voir les ouverts *et* les fermés
le supprime au clavier, comme n'importe quel autre. Un filtre par défaut qu'on
ne voit nulle part est un écran qui ment sur ce qu'il montre — et l'on cherche
dans la base des sujets qui y étaient depuis le début.

Il vient de la grammaire : `withFilter` l'écrit, comme partout ailleurs. Poser
la chaîne `"statut:ouvert"` à la main aurait fait un second endroit où le jeton
s'orthographie, et le jour où `STATUTS` le renomme, le défaut cesserait
silencieusement de filtrer (règle 10).

Les propositions n'ont pas de grammaire — une proposition n'a ni label, ni
assigné, ni objectif, et lui poser la barre des sujets promettrait des filtres
qui ne retiendraient jamais rien. Leur sortie est donc le bouton : **recliquer
« Ouvertes » l'éteint**, et l'on revoit tout.

### L'état voyage avec la lecture

Le rail nomme **ce qu'on regarde** — les miens, ceux où l'on m'a nommé — et le
filtre de l'en-tête **dans quel état**. Les deux questions sont indépendantes ;
les mêler coûtait deux choses à la fois :

- cliquer « Fermés » éteignait toute la colonne de gauche — on ne savait plus où
  l'on était, pour avoir dit dans quel état on voulait le voir ;
- cliquer une lecture faisait sauter le filtre qu'on venait de poser, et il
  fallait le reposer.

`rail-des-sujets.js` écarte donc `statut` quand il reconnaît une lecture, et
l'**emporte** dans la requête de chacune — le compte affiché étant celui de
cette requête-là, c'est-à-dire de ce que le clic montrera. Une requête qui ne
dit que l'état est la liste entière, dans l'état qu'on regarde : sans cela, ces
écrans s'ouvraient sur un rail où l'on n'était nulle part.

Le défaut existait aussi dans l'onglet Sujets d'un projet ; il s'y est vu le
jour où la requête de départ a porté un jeton.

### Le rail de « Tous les sujets »

C'est **celui de l'onglet Sujets d'un projet**, avec ses lectures : « Assigné à
moi », « Créé par moi », « Mentions », « Activité récente ». Elles ne disent
rien d'un projet — elles disent qui regarde, et qui regarde est le même d'un
chantier à l'autre.

Deux choses tombent, et il faut dire pourquoi :

- **les autres écrans** — Vues, Objectifs, Labels — appartiennent à un projet :
  ils n'existent pas ici, et les proposer ferait trois portes qui ne mènent
  nulle part. C'est ce que le carnet avait déjà constaté ;
- **les vues épinglées** aussi : une vue est enregistrée dans un projet, et son
  vocabulaire est le sien. En montrer une ici promettrait une requête qui ne
  retiendrait pas la même chose (règle 5).

Le rail et les menus de l'en-tête écrivent le **même attribut** — chaque entrée
porte la requête complète qu'elle produirait —, et une seule écoute les entend
tous les deux. Ce qui les distingue est ce qu'on fait après : un menu se rouvre,
un rail n'a rien à rouvrir.

### « Tous les projets » reçoit le même rail

Sa colonne de gauche était un `<aside>` large de 296 px, ni réglable ni
repliable, quand les quatre autres écrans à colonne portent tous le même rail.
Arriver ici faisait perdre les deux gestes sans que rien ne l'explique.

Le dessin de ce rail vit à part (`tous-les-projets-rail.js`), pour la même
raison que les `*-page.js` : l'écran des projets parle à la base et ne s'importe
pas dans un test, et **un rail dessiné que personne n'écoute est muet** — c'est
arrivé au carnet, dont le bouton de repli et la poignée sont restés inertes deux
étapes durant.

### Un seul endroit sait replier et redimensionner

`ui/reglages-du-rail.js` porte le repli, la largeur, leur mémoire, et le
branchement de la poignée et du bouton. Le carnet les avait écrits à la main ;
deux écrans de plus en auraient fait trois copies — et une copie qui oublie de
borner la largeur relue, ou le `try` autour du stockage, se découvre dans un
navigateur qui refuse les cookies, c'est-à-dire jamais chez celui qui l'écrit.

Chaque écran nomme le sien : replier le rail des Sujets d'un projet n'a aucune
raison de replier celui du carnet.

---

## Les propositions ont une grammaire, et les mêmes filtres des deux côtés

### Le problème

L'écran des propositions — celui d'un projet comme celui qui les traverse —
n'avait qu'un **champ de texte libre** et **deux onglets**. « Celles que j'ai
ouvertes sur Chamonix », « celles qui n'ont aucun document », « qui a fusionné
ça ? » se cherchaient en ouvrant les deux onglets et en lisant les lignes une
par une.

Les sujets avaient déjà tout ce qu'il fallait : une barre où la requête se lit
et se corrige, des menus qui posent un jeton, un miroir qui colore ce qui filtre.

### Ce qu'une proposition porte, et rien d'autre

`champs-des-propositions.js` déclare ce que la table contient :

- **statut** — ouverte, fusionnée, refusée ;
- **auteur** (`created_by`) et **décidée par** (`merged_by`, `closed_by`) : les
  deux se confondent souvent et divergent toujours au moment où ça compte ;
- **documents** — y a-t-il quelque chose dedans, la première question qu'on se
  pose devant une proposition ;
- **projet**, là où l'écran en traverse plusieurs.

Une proposition n'a **ni label, ni assigné, ni objectif, ni jalon**. Les
déclarer ferait proposer des filtres qui ne retiendraient jamais rien, et l'on
chercherait ce qu'on a mal tapé plutôt que ce qui n'existe pas (règle 5). C'est
pourquoi la liste des menus est plus courte que celle d'un dépôt Git : ce sont
les colonnes qui la fixent, pas l'exemple.

### Deux boutons pour trois valeurs

Le filtre de l'en-tête coupe en « Ouvertes » et « Closes » — la question posée
devant la liste est « qu'est-ce qui attend encore une décision ? ». La barre,
elle, distingue fusionnée et refusée : l'une est entrée au corpus, l'autre non.

« Closes » pose donc **deux jetons**, et `statut:fusionnée` seul n'allume
**aucun** des deux boutons : allumer « Closes » ferait croire qu'on voit aussi
les refusées.

### Un seul tableau pour les deux écrans

L'onglet d'un projet montrait une liste à lui : ses classes, son filtre à deux
onglets, son dessin de ligne. L'écran transversal montrait un tableau. Les deux
disaient la même chose de deux façons, et la moindre retouche demandait deux
calages — dont le second arrive toujours en retard (règle 10).

C'est maintenant le même tableau, la même barre, le même en-tête. Une seule
chose les sépare, et elle se donne en paramètre : la **colonne du projet**, qui
n'a de sens que là où l'on en traverse plusieurs. Le titre y ouvre la revue
**sur place** — elle remplace la liste sans changer d'adresse —, quand il est un
lien sur l'écran transversal.

Rien n'est perdu de ce que la liste montrait : le numéro, la date d'ouverture,
la date de fusion, le nombre de documents. L'auteur, lui, est **gagné** : la
ligne disait « un collaborateur », faute d'un pont entre le compte qui a cliqué
et la personne qui porte un nom. Ce pont est le trombinoscope, et c'est lui qui
permet aussi à `auteur:moi` d'exister.

### Un compte n'est pas une personne

Une proposition porte un `user_id` ; un sujet porte un identifiant de
trombinoscope, propre à chaque projet. `comptesDesPersonnes` fait le pont, et
**dédoublonne** : la même personne sur quatre projets a quatre lignes de
trombinoscope, et quatre entrées du même nom dans un menu se ressemblent trait
pour trait.

### L'état ne se dit qu'une fois

La ligne d'un sujet, sur l'écran transversal, portait l'icône d'état **et** une
pastille « Ouvert » / « Fermé » à côté du titre : la même information deux fois,
sur la ligne la plus chargée de l'écran, poussant l'auteur hors du cadre dès que
la colonne se resserre. L'onglet Sujets d'un projet n'a jamais eu cette
pastille.

Elle est partie. L'icône, en revanche, **porte son nom** — `aria-label` — parce
qu'elle est désormais seule à dire l'état : sans cela, il cesserait d'être
lisible pour qui ne voit ni les formes ni les couleurs.

### Ce que la mutualisation a produit

Trois écrans posent la même barre et les mêmes menus. Les gestes sont
exactement les mêmes, et les deux détails qui les rendent utilisables se
réapprennent à chaque copie : **le curseur qui revient là où il était** (sans
quoi le deuxième caractère le renvoie au début du champ), et **le menu qui se
rouvre après le rendu** (sans quoi on reclique le bouton entre deux valeurs d'un
champ à choix multiple). Ils vivent maintenant dans
`ui/branchement-de-la-requete.js`, et la barre elle-même dans
`ui/barre-de-requete.js`.

## Ils ont une porte dans la barre du haut

### Le problème

Trois écrans traversent les projets, et **un seul se cliquait**. Les situations
avaient leur icône dans la barre du haut depuis qu'elles sont sorties du giron
d'un projet ; tous les sujets et toutes les propositions n'existaient que dans
le menu de gauche, qu'il faut ouvrir. Deux gestes au lieu d'un, sur les deux
écrans qu'on ouvre le plus souvent — et un péage qu'on paie cent fois par jour
finit par décider de ce qu'on fait.

### L'ordre

```
copilote | sujets | propositions | situations | projets
```

Il va **de ce qu'on fait vers l'endroit où on le fait**. Le copilote est la
porte de tout le reste ; les sujets et les propositions sont ce qui est en
cours ; les situations sont la façon dont on se l'organise ; les projets sont le
classeur, et l'on n'y descend qu'en sachant déjà ce qu'on y cherche.

**Les projets étaient en tête et passent en queue.** L'entrée la plus générale
se lit comme la plus importante quand elle est la première, alors qu'elle est
celle dont on a le moins besoin : on ouvre rarement Mdall pour regarder la liste
de ses chantiers.

Le copilote reste l'exception de la rangée : il vit dans l'Atelier d'un projet,
et la barre ne le pose que là. Hors projet, elle commence aux sujets.

### La liste sort de l'en-tête

Elle y était écrite en dur, et l'en-tête parle à l'authentification : **aucune
épreuve ne pouvait dire ce qu'il contenait ni dans quel ordre.** On le relisait
à l'œil, c'est-à-dire qu'on ne le vérifiait pas (règle 12). Elle vit maintenant
dans `services/raccourcis-de-la-barre.js`, qui s'importe — et sept épreuves y
tiennent l'ordre, la présence d'un nom, l'unicité des dessins, et le fait que
chaque icône existe dans la planche.

Les noms n'y sont pas écrits : ils viennent de `ecrans-transversaux.js` et de
`mon-carnet.js`, là où le menu de gauche et les routes les prennent déjà. Une
quatrième copie d'un mot qui en a trois serait celle qui reste fausse le jour où
les autres changent (règle 10).

**Un seul raccourci porte un geste** : celui des situations. Son adresse ne
change pas quand on y est déjà — on est sur `#situations` avec une situation
ouverte —, donc le navigateur ne prévient personne et l'écran ne bouge pas. Le
clic doit refermer la sélection lui-même, et la marque qui le permet est
nommée une seule fois, des deux côtés du branchement.
