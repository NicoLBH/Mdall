# Le carnet prend la forme de l'onglet Sujets

**À quoi sert cette page :** le plan pour que l'écran des situations cesse
d'être un écran à lui et devienne **le même écran que les Sujets**, avec son
rail à gauche, ses lectures, ses vues épinglées et son formulaire.

Il prolonge [`les-situations-traversent-les-projets.md`](les-situations-traversent-les-projets.md),
qui a sorti les situations du projet. Celui-ci leur donne la forme qu'elles
auraient dû avoir depuis le début.

---

## 1. Le constat

L'écran des situations a grandi seul. Il a son tableau, sa fenêtre de création,
son vocabulaire — « mode manuel », « mode automatique », un `filter_definition`
en jsonb — pendant que l'onglet Sujets se dotait d'un rail, de lectures
(« Assigné à moi », « Créé par moi », « Mentions », « Activité récente »), de
vues qu'on épingle avec une icône et une couleur, et d'une barre de recherche.

**Ce sont deux fois la même chose.** Une situation *est* une vue : un nom, une
icône, une requête. Le « mode automatique » est une requête qui n'ose pas dire
son nom, et le « mode manuel » une liste qu'on tient à la main.

Deux écrans qui font la même chose divergent : on l'a déjà vu à chaque étape du
plan précédent — un compte qui ment ici et pas là, un filtre réparé d'un côté.

---

## 2. Ce qu'on retient

**Une situation est une vue, et le carnet est un onglet Sujets.**

| Aujourd'hui | Demain |
| --- | --- |
| `mode` manuel / automatique | une **requête**, dans la grammaire des sujets |
| `filter_definition` jsonb | la même requête, lisible et modifiable au clavier |
| pas d'icône | une **icône** et une **couleur**, comme une vue |
| un écran à part | le rail des sujets, ses lectures, ses épinglées |

> **Rien n'est dessiné de neuf.** `railDesSujets`, `renderRailDesSujetsHtml`,
> `project-rail-layout`, le formulaire d'une vue, `champsDesSujets`,
> `sujetsFiltres` existent, sont purs et sont testés. Le carnet les appelle.
> Ce plan est un plan de **réemploi**, pas d'écriture.

### Ce que le rail portera

De haut en bas, exactement comme les Sujets :

1. **Situations** + son compte — le tableau d'aujourd'hui, avec « Nouvelle situation »
2. **Assigné à moi** — mes sujets, sur tous mes chantiers
3. **Créé par moi**
4. **Mentions**
5. **Activité récente**
6. — un trait —
7. **Épinglées**, puis mes situations

Les quatre lectures du milieu ne sont pas à écrire : `rail-des-sujets.js` les
produit déjà, filtres compris. Ce qui change est ce qu'on lui donne à lire —
les sujets de tous mes chantiers plutôt que ceux d'un projet, ce que l'étape
3 bis du plan précédent a rendu possible.

---

## 3. Les étapes, dans l'ordre

L'ordre suit une règle : **le modèle avant l'écran**. Poser le rail sur des
situations qui n'ont ni icône ni requête obligerait à en inventer à l'affichage,
et l'on aurait deux idées de ce qu'est une situation — celle de la base et celle
de l'écran (règle 4).

### Étape 1 — Une situation est une vue · *faite*

Elle porte une **icône**, une **couleur** et une **requête**, dans le même
vocabulaire qu'une vue des sujets : les mêmes icônes, les mêmes couleurs, la
même grammaire de requête.

C'est le geste qu'on a déjà fait pour les recherches épinglées, qui sont
devenues des vues de la même façon (`202609270001_pinned_searches_vues.sql`).

`mode` et `filter_definition` **restent** : un constat ne devient pas faux
(règle 6), et les situations d'aujourd'hui s'en servent. La requête les
remplacera quand elle saura tout dire ; d'ici là elle est ce qu'on lit en
premier, et le reste sert de repli.

### Étape 2 — Le rail, à gauche · *faite*

`renderRailDesSujetsHtml` dans la coquille du carnet, avec `project-rail-layout`
— la même structure que la Mémoire et les Sujets, poignée et repliement
compris. Les lectures se calculent sur les sujets de tous mes chantiers ; mes
situations prennent la place des vues épinglées.

**Le piège :** une lecture du rail change ce que le tableau montre.

**Ce qui a été livré :**

| Où | Quoi |
| --- | --- |
| `apps/web/js/services/lectures-du-carnet.js` | les lectures, présentées comme des situations |
| `apps/web/js/services/vocabulaire-du-carnet.js` | la grammaire du carnet, à partir de la charge de mes chantiers |
| `profile-supabase-sync.js` | les personnes de tous mes chantiers |
| `project-situations-view.js` | le rail, dans la mise en page de la Mémoire et des Sujets |

**Une lecture est une situation.** « Assigné à moi » n'est pas un filtre posé
sur une liste : c'est une situation dont le nom est « Assigné à moi » et dont
les sujets sont ceux qui répondent à `assigné:moi`, sur tous mes chantiers.
C'est ce qui rend l'écran homogène — cliquer une lecture ou une situation qu'on
a créée fait la même chose.

Elles ne s'écrivent pas en base : les créer au premier passage reviendrait à
verser dans le carnet de quelqu'un des lignes qu'il n'a pas demandées, ce qu'on
vient de retirer à la création d'un projet.

**Les personnes commandent trois lectures sur quatre.** `champsDesSujets` ne
déclare un champ que s'il a des valeurs : sans personne connue, « Assigné à
moi », « Créé par moi » et « Mentions » disparaissent — un rail qui ne montre
qu'une entrée sur quatre, sans que rien ne dise pourquoi (règle 5). C'est pour
cela que le carnet charge désormais les personnes de ses chantiers.

#### Ce qui reste à faire : le clic

Le rail est **dessiné et peuplé**, mais cliquer une de ses entrées ne change
pas encore ce que l'écran montre. Il y faut deux choses, et elles ne sont pas
petites :

1. **Ouvrir une situation de lecture.** `getSituationById` ne connaît que les
   situations écrites ; il lui faut aussi les lectures, et
   `loadSubjectsForSituation` doit résoudre leur requête contre la charge du
   carnet — ce qu'il sait déjà faire pour une situation automatique.
2. **Le détail d'une situation sans propriétaire ni base.** Une lecture ne se
   modifie pas, ne se ferme pas, ne se supprime pas : le panneau de détail doit
   le dire plutôt que de proposer des gestes qui échoueraient.

C'est l'étape 2 bis. La séparer est délibéré : un rail dont les entrées
s'allument sans rien ouvrir serait pire qu'un rail absent — il promettrait.

---

### Étape 2 bis — Le rail tient ce qu'il promet · *faite*

**Cliquer une entrée ouvre la situation qu'elle porte.** Chaque entrée du rail
— lecture ou situation à moi — porte la requête de ce qu'elle ouvre, et c'est
par cette requête qu'on la retrouve : compter les entrées ferait dépendre le
clic de l'ordre d'affichage (règle 4).

**`getSituationById` connaît les lectures.** Les écrites d'abord, les lues
ensuite. Sans ce détour, cliquer « Assigné à moi » ne trouvait rien à ouvrir.

**Une requête se relit avec la grammaire des sujets.** Une situation qui en
porte une — les lectures, et toute situation depuis l'étape 1 — se résout par
`sujetsFiltres` sur la charge du carnet. Les autres passent par la porte
d'avant : leur liste manuelle, ou leur `filter_definition`. **Jamais les deux
ensemble** : une situation retiendrait l'intersection de deux règles dont une
seule est visible à l'écran.

**Et sans savoir qui regarde, « assigné:moi » ne s'applique pas** — la liste
passe entière plutôt que de se vider. Une liste vide ferait croire qu'on n'a
aucun sujet, alors qu'on ne sait pas de qui il s'agit (règle 5). C'est déjà la
règle de `sujetsFiltres` ; elle vaut ici sans qu'on ait à la réécrire.

#### Ce qu'une lecture ne fait pas, et le dit

Elle n'est pas en base : elle ne se modifie pas, ne se ferme pas, ne se
supprime pas. Le crayon ne s'affiche donc pas sur son détail — laisser le
bouton ouvrirait un formulaire qui n'aurait rien à enregistrer, c'est-à-dire un
geste qui échoue en silence.

Elle ne porte pas non plus la pastille « Automatique » : c'est un mot de
mécanique, et sur « Assigné à moi » il ne renseigne sur rien que le titre ne
dise déjà.

### Ce que l'étape 2 avait cassé, et qu'on n'a vu qu'après l'étape 4

Le carnet ne s'affichait plus du tout : `ReferenceError: safeArray is not
defined`, dans le rail, à la première ligne de rendu. Le nom était employé sans
être ni déclaré ni importé, depuis l'étape 2.

**Aucun test ne pouvait le voir, parce que les tests de cet écran lisaient son
code comme du texte.** Un nom libre ne se voit pas dans une lecture de texte —
le mot est là, il ressemble à un appel, la recherche le trouve. `node --check`
ne le voit pas non plus : la syntaxe est correcte. Seule l'exécution le voit.

On lisait le texte parce qu'on croyait le module inimportable en test. **Ce
n'était pas vrai**, et la croyance n'a jamais été vérifiée. `project-situations-page.test.mjs`
monte désormais les trois formes de l'écran et regarde le HTML sortir.

Deux autres défauts sont tombés avec, que l'exécution a montrés du premier coup :

- **Aucune de mes situations n'apparaissait dans le rail.** `situationCommeUneEpingle`
  rendait `nom` et `active` ; `epinglesDuRail` lit `titre` et `auRail`, et
  écartait donc tout en silence. C'est le défaut que `vuePourLEcran` porte écrit
  au-dessus d'elle, rencontré une seconde fois : deviner la graphie ne rate pas
  bruyamment, ça rend `undefined`.
- **Les lectures étaient jointes aux épinglées**, alors que le rail les monte
  déjà en tête : elles se seraient affichées deux fois le jour où les épinglées
  marchent. Le premier défaut masquait le second.

Le test de la forme ne la décrit plus : il la fait **traverser** `epinglesDuRail`
et regarde ce qui en ressort. Une fixture qui recopie les hypothèses du code ne
teste que elle-même.

### Le contenu passait sous son propre rail

Le carnet se lisait **à travers** sa barre de gauche : le titre, la recherche et
le tableau commençaient au bord de l'écran, par-dessus les entrées du rail — qui
n'a pas de fond, exprès.

La cause tient en une ligne absente. Le rail est en `position:fixed` : il ne
pousse rien, c'est au contenu de s'écarter, et cette marge était portée par la
**classe de chaque page** — `--memory`, `--sujets`, le panneau du Copilote. Le
commentaire d'à côté prévenait déjà : *« un écran de plus se réglera avec sa
classe ajoutée ici »*. Personne ne l'a fait.

La règle est donc posée là où elle est vraie : sur `.project-rail-layout__content`,
le contenu **voisin d'un rail**, ce qui est exactement la condition. Les quatre
mises en page qui portent un rail l'ont en premier enfant ; un cinquième écran
la reçoit en naissant. Un test compte les occurrences : deux marges
compteraient la largeur du rail deux fois.

### Le rail était dessiné et personne ne l'écoutait

Son bouton de repli et sa poignée de largeur sont là depuis l'étape 2 : le
composant partagé les dessine. **Rien ne les branchait.** Cliquer ne faisait
rien, tirer ne faisait rien — et un bouton présent qui n'obéit pas est pire
qu'un bouton absent : on croit avoir mal cliqué, et l'on recommence.

Tout vient du composant partagé, comme dans la Mémoire, l'Atelier et les Sujets.
Le repli et la largeur sont des **réglages** : ils suivent la personne d'une
session à l'autre, et ce sont ceux de cet écran — replier le rail des Sujets
d'un projet n'a aucune raison de replier celui du carnet. L'écran ne les lit
plus dans un magasin que personne n'écrivait : il les demande.

### Une marge ne rentre pas dans un `width`

La marge déplacée en a emporté un piège avec elle. Le contenu portait déjà
`width:100%` — nécessaire, sans quoi l'Atelier se dimensionne sur des panneaux
vides. **`100%` plus 248 px de marge fait une boîte 248 px plus large que ce qui
la contient** : la page gagnait une barre de défilement horizontale de la
largeur exacte du rail, et faire défiler glissait le tableau dessous — replié
comme déplié, puisque la marge et la largeur lisent la même variable.

Là où la marge était, la page était un bloc en `width:auto`, dont la largeur se
calcule **après** les marges. Ici la largeur est posée, et il faut la
retrancher : `width:calc(100% - var(--project-rail-width))`.

Sous 900 px les deux se retirent ensemble. En annuler une seule laisserait une
colonne amputée de la largeur d'un rail qui n'est plus là — le défaut
symétrique.

### Le contenu passait derrière le rail en défilant

La marge règle la **position de départ**, pas ce qui passe derrière quand la
boîte défile horizontalement. Le rail est fixé à la fenêtre ; le contenu
glissait dessous, et les deux se lisaient l'un à travers l'autre.

Le rail du carnet a donc un fond, et lui seul. Les écrans de projet le gardent
transparent : le trait de l'onglet actif doit rester lisible dessous — c'est la
raison d'origine, et elle ne vaut pas ici, le carnet n'ayant pas d'onglets.

### Le menu du kebab se faisait couper

La coquille de tableau coupe son débordement, et le menu d'une ligne s'ouvre
vers le bas : il était tronqué net. L'écran des vues porte déjà cette exception ;
le tableau des situations la reçoit à sa classe.

### La promesse de l'étape 1, enfin tenue

L'écran dit depuis ce jour-là, sur toute situation sans propriétaire :
*« Reprenez-la pour pouvoir la modifier. »* **Il n'y avait aucun moyen de le
faire.** La règle de modification exige `owner_id = auth.uid()` *avant*
l'écriture : une ligne sans propriétaire n'était modifiable par personne, pas
même pour se l'attribuer.

Sur un carnet qui ne contient que des situations d'avant — le cas d'un vrai
projet —, cela voulait dire **aucun geste du tout** : ni épingler, ni effacer,
ni modifier, et un kebab invisible sur chaque ligne.

`reprendre_la_situation` n'autorise qu'**une transition** : de personne à moi.
Ni le titre, ni la requête, ni l'état ne voyagent avec. On aurait pu relâcher la
règle de modification — « les miennes, ou celles sans propriétaire » —, mais
elle aurait alors autorisé toutes les écritures sur une ligne orpheline du
moment qu'on la marque sienne au passage. Reprendre est une décision, pas une
occasion.

Le menu d'une situation d'avant n'offre donc que ce geste-là, et ni l'épingle ni
l'effacement : la base les refuserait, et un bouton actif ferait cliquer sur un
geste qui échoue sans raison visible.

### Le rail garde ce qu'on y met

Il montrait **toutes** mes situations. Sur un carnet qui en compte vingt-six, la
barre de gauche devient une liste qu'on ne parcourt plus — l'inverse de ce à
quoi un rail sert : il est court, et une entrée de plus coûte une place à celles
qu'on regarde tous les jours.

`situations.au_rail` dit désormais où on la trouve, et rien d'autre — ni son
importance, ni son état. Faux par défaut : le tableau les montre toutes, le rail
redevient court jusqu'à ce qu'on y mette quelque chose. C'est la règle que les
vues portent déjà.

Le geste vit dans un **kebab sur la ligne du tableau**, et c'est le menu des
vues — on lui donne le mot de ce qu'on manipule, comme au formulaire, et il dit
« Épingler la situation ». Il porte aussi l'effacement, qui demande avant en
nommant ce qui part **et ce qui reste** : les sujets appartiennent au projet,
pas au carnet de quelqu'un.

Deux situations n'ont pas de menu : une **lecture du rail**, qui n'est pas en
base et dont les deux gestes échoueraient en silence ; et une situation **d'avant
le cloisonnement**, que la base refuse de réécrire au nom d'un autre.

### Le rail du carnet n'est pas celui d'un projet

Il montait le rail des Sujets tel quel, et en héritait deux choses qui ne sont
pas les siennes.

**La première entrée s'appelait « Sujets »** et ouvrait pourtant le tableau des
situations : le rail nommait un endroit qui n'était pas celui où le clic menait.
Elle s'appelle « Situations », et le nom se **donne** — `nomDuDepart` — plutôt
que de se deviner : un rail qui lirait l'écran courant pour choisir son premier
mot serait un rail qui connaît les écrans.

**Vues, Situations, Objectifs et Labels** sont les écrans de l'onglet Sujets
d'un projet. Dans le carnet, ils ouvraient des écrans qui n'existent pas là où
l'on est : quatre portes qui ne mènent nulle part n'orientent pas, elles
égarent. À leur place, les situations épinglées — qui sont, elles, ce que le
carnet contient.

Les quatre lectures restent des deux côtés : « Assigné à moi » désigne les mêmes
sujets, et c'est un raccourci vers la situation qui les retient.

Un test garde l'onglet Sujets d'un projet contre ces deux paramètres : sans
valeur par défaut juste, il perdrait son premier nom et ses quatre écrans sans
que rien ne le dise.

### Le même nom libre, une seconde fois

`safeArray` était employé sans être ni déclaré ni importé dans les **événements**
aussi — au clic sur une entrée du rail, et au moment d'enregistrer une
situation. Deux gestes morts, la même cause, recopiée d'un module voisin où le
nom est une dépendance.

Il en est devenu une ici aussi : un nom déclaré dans la signature ne se prend
plus dans le vide. Et `project-situations-events.test.mjs` **exécute** les
gestes qui n'ont pas besoin d'un document — c'est la seule chose qui voit un
nom libre.

### Étape 3 — Le formulaire d'une vue · *faite*

« Nouvelle situation » ouvre le formulaire d'une vue : icône, couleur, titre,
description, requête, et le tableau des sujets dessous — celui qu'on est en
train de composer. C'est `project-subjects-recherche.js` qui le porte, et il ne
connaît rien des projets.

**La fenêtre d'avant demandait une mécanique avant une intention.** Elle
proposait « manuelle » ou « automatique » — deux mots qui disent comment la base
s'y prendra, pas ce qu'on veut suivre — et son mode automatique ne savait
produire qu'une liste de tous les sujets ouverts.

**Un seul formulaire, et il ne sait pas ce qu'il compose.** `renderFormulaireDeVueHtml`
prend le **mot** de la chose : il dit « Nouvelle situation » et « Enregistrer la
situation » parce qu'on le lui donne, et rien d'autre ne change. Les refus
suivent le même chemin : `phrasesDuRefus(mot)` rédige une seule fois « Une
situation sans recherche ne montrerait rien ». Recopier quatre phrases pour un
second écran aurait fait deux jeux qui divergent au premier réglage (règle 10).

**Le tableau dessous demande à la même résolution que la situation enregistrée.**
`sujetsQueRetient` sert les deux : ce qu'on voit pendant qu'on écrit est ce
qu'on verra après avoir enregistré. Une seconde lecture, avec ses propres champs
et son propre « moi », aurait fini par montrer autre chose (règle 4) — c'est-à-dire
exactement ce que ce tableau existe pour empêcher.

**Tant qu'on n'a pas lu la charge, le tableau ne dit pas « aucun ».** Il dit
qu'il lit. Une liste vide se serait lue comme « votre requête ne retient rien »,
et l'on aurait corrigé une requête qui n'avait rien (règle 5).

**L'épingle disparaît de la barre, dans le formulaire.** Épingler la recherche
et enregistrer ce qu'on écrit sont deux gestes pour une seule chose — et celui
du haut ne garderait ni le nom ni l'habit qu'on vient de choisir.

**Ce qu'on compose arrive en base.** `icon`, `color` et `requete` existaient
depuis l'étape 1 et personne ne les écrivait : une situation créée au formulaire
serait revenue grise, sans icône, ne retenant rien.

**Et « Manuelle » ne s'affiche plus sur une situation qui porte une requête.**
Le mode reste en base à la valeur qu'il avait à la création ; l'afficher aurait
donné deux façons de dire ce qu'une situation retient, dont l'une est fausse
(règle 4). La règle est écrite une fois — `seDitParUneRequete` — et le tableau
comme le panneau de détail la posent.

#### Ce que l'étape 3 ne fait pas

**L'écran d'un projet garde sa fenêtre.** La requête n'y a pas encore de
vocabulaire : les labels, les gens et les chantiers ne sont chargés que par le
carnet, et un champ de recherche qui ne reconnaîtrait aucun mot ferait chercher
la panne dans la requête qu'on écrit (règle 5). C'est l'étape 4 qui l'y amènera.

**Le crayon ouvre encore l'ancien panneau de réglages.** Modifier une situation
au formulaire suppose de savoir rouvrir ce que `mode` et `filter_definition`
disent — ce qui est précisément la question de l'étape 4.

### Étape 4 — `mode` et `filter_definition` s'effacent · *faite*

Quand la requête sait dire ce qu'ils disaient, on les retire. Pas avant : une
situation qui perdrait son filtre sans que sa requête le reprenne changerait de
contenu sans que personne l'ait demandé.

#### On ne prétend pas : on relit

Traduire un filtre en requête, c'est affirmer que les deux retiennent les mêmes
sujets. Une affirmation pareille ne se fait pas sur parole : un champ que
l'écran ne déclare pas, un label supprimé, une priorité partielle que la barre
ne sait pas écrire, et la situation change de contenu en silence.

`requete-dun-filtre.js` écrit donc la requête, **puis la relit avec le même
analyseur que la barre**, et compare. Ce qui ne revient pas identique est nommé.
Aucune règle de correspondance n'est réécrite : c'est `parseQuery` qui juge, et
c'est lui qui filtrera ensuite (règle 4).

Perdu ne veut pas dire faux : cela veut dire que cette requête-là n'en dit pas
autant. La situation continue alors de passer par l'ancienne correspondance, et
le formulaire ne préremplit rien — il dit ce qu'il n'a pas su reprendre (règle
5). Comme une requête vide est refusée à l'enregistrement, on ne peut pas
remplacer un filtre par moins que lui par mégarde.

#### Toutes les cases cochées, ce n'est pas une condition

Le filtre proposait quatre cases de priorité ; les quatre cochées ne retiraient
rien. Les écrire aurait transformé un « tout » en une énumération que la barre
ne sait pas porter — `priorité` est à choix simple, le dernier jeton gagne — et
la liste aurait perdu trois priorités sur quatre.

#### Une situation manuelle n'a pas de filtre, et n'en reçoit pas un

Elle tient une liste à la main. Traduire son `filter_definition` — vide —
donnerait une requête vide, c'est-à-dire **tous les sujets** : quatre sujets
choisis deviendraient la liste entière du chantier. C'est le mode qui distingue
les deux, et c'est la dernière chose qu'il sert à faire.

#### Ce qui disparaît de l'écran

Le panneau de réglages avec ses cases, ses « IDs séparés par des virgules » et
son choix de mécanique : le crayon ouvre désormais le formulaire de l'étape 3,
rempli, avec le tableau dessous. La fenêtre de création aussi — « Nouvelle
situation » ouvre ce même formulaire sur les **deux** écrans.

« Manuelle » et « Automatique » quittent le tableau et le panneau de détail.
C'était un mot de mécanique là où l'on attend une intention, et il ne disait
plus rien de vrai.

#### Chaque écran a son vocabulaire, et il va le chercher là où il est

L'étape 3 réservait le formulaire au carnet, faute de grammaire ailleurs. Le
carnet connaît les labels et les gens de tous mes chantiers ; l'écran d'un
projet connaît en plus **ses lots et ses situations**. Prendre celui du carnet
sur l'écran d'un projet y ferait disparaître `lot:` — la même requête retiendrait
deux choses selon l'onglet d'où on la regarde (règle 4). Le choix se fait à un
seul endroit, et les trois portes vont ensemble : les champs disent ce qui
s'écrit, la surcouche ce que chaque sujet porte, « moi » qui regarde.

#### Les colonnes restent en base

Elles portent ce que des situations retiennent aujourd'hui, et un constat ne
devient jamais faux (règle 6). Un `drop column` est irréversible et immédiat :
la version du navigateur déjà ouverte chez quelqu'un tomberait en 400 au milieu
de sa journée. La migration écrit donc ce que la base sait d'elle-même — deux
commentaires de colonne, strictement additifs. Plus rien ne les écrit, et une
seule écriture de `mode` subsiste, qui va dans le bon sens : enregistrer une
requête **efface** l'ancien filtre, parce qu'elle le reprend.

---

## 4. Ce que cet ordre refuse

**De dessiner un second rail.** Il en existe un, il est pur, il est testé. En
écrire un pour cet écran, c'est accepter qu'ils diffèrent d'un pixel, puis d'un
comportement.

**De poser l'écran avant le modèle.** Un rail sur des situations sans icône ni
requête obligerait à en inventer à l'affichage — et l'on aurait deux idées de ce
qu'est une situation.

**D'effacer `filter_definition` tout de suite.** Il porte ce que des situations
retiennent aujourd'hui. On le remplace, on ne le perd pas.

---

## 5. Ce que l'usage a montré après coup

Le plan ci-dessus est fait. Ce qui suit n'en est pas une étape de plus : ce sont
trois choses que seul l'usage montre, et qu'on écrit ici parce qu'elles
corrigent des promesses des étapes précédentes.

### Le contenu se collait au rail

Le rail est en position fixe et le contenu s'en écarte d'une marge exacte : il
commençait donc **au pixel où le rail finit**, sans un blanc entre les deux.
L'onglet Sujets d'un projet ne connaît pas ce défaut parce qu'il pose son rail
dans `page-large` — le cadre de l'application, borné à 1400 px et rempli de
16 px. Le carnet ne l'employait pas. Il l'emploie : **aucune largeur nouvelle**,
et la gouttière suit partout où ce cadre sert déjà.

### Le formulaire demandait une requête sans dire la grammaire

On écrivait « fondations », le tableau rendait zéro, et rien à l'écran
n'indiquait qu'il fallait `label:` ou `projet:` — ni quelles valeurs existaient.
Une recherche qui ne rend rien sans dire pourquoi se lit comme une panne.

Les menus de filtre de l'en-tête sont désormais **au-dessus du tableau du
formulaire**, et ce sont ceux de l'onglet Sujets : même dessin, mêmes attributs,
même coche, même recherche dedans. Chaque entrée porte la **requête complète**
qu'elle produirait ; le clic la recopie dans la barre, qui reste l'endroit où la
requête se lit et se corrige au clavier.

Deux choses ont été mutualisées pour que cela ne fasse pas une seconde version :

- `views/ui/menus-den-tete.js` — ouvrir, rouvrir après un redessin, fermer. Les
  six lignes vivaient dans l'écran des Sujets ; l'écran des situations en avait
  besoin, et les recopier aurait fait deux ouvertures qui divergent au premier
  réglage (règle 10).
- `BLOC_DES_FILTRES` — le repère du bloc. Les entrées portent
  `data-sujets-lecture`, **exactement comme celles du rail**, et le rail change
  d'écran au clic : sans ce repère, cliquer un label refermait la situation
  qu'on écrivait. Le nom vit à un seul endroit, que le rendu et l'écoute
  prennent tous deux de là.

### Le kebab était court, et ne disait pas pourquoi

Toutes les situations d'aujourd'hui datent d'avant le cloisonnement :
`owner_id` y est nul, la base refuse de les réécrire, et le menu n'offre donc
que « Reprendre cette situation ». On l'ouvrait, on n'y trouvait ni épingler ni
supprimer, et **rien ne disait qu'ils reviendraient une fois la situation
reprise** : un menu amputé sans un mot se lit comme un défaut d'affichage, et
l'on cherche la panne dans le code.

Le menu porte donc la phrase que le badge portait déjà en infobulle, prise au
même endroit qu'elle — elle nomme l'empêchement **et la suite**, parce qu'un
refus qui ne dit pas quoi faire laisse devant un bouton gris.

### Une situation sans requête se remplit à la main

C'est le seul refus des vues qui ne vaut pas pour une situation. Une vue **est**
une recherche nommée ; une situation est un endroit où l'on range des sujets, et
la requête n'est qu'une façon — commode, et pas la seule — de dire lesquels.

La base tient cette porte ouverte depuis toujours : `situation_subjects`, que le
mode « manuelle » consulte, et que `loadSubjectsForSituation` lit déjà. Ce qui
manquait était **au-dessus** : le formulaire refusait d'enregistrer, et il n'y
avait donc aucun moyen d'en créer une. Trois conséquences :

- `refusDeLaVue` reçoit `requeteObligatoire`. Une vue l'exige, une situation
  non — et le refus se dit à voix haute plutôt que de se deviner.
- Le champ perd son étoile et gagne une phrase : *laissez-la vide pour y mettre
  les sujets un par un*. Un champ sans étoile, muet, se lit comme un oubli.
- Le tableau dessous **ne montre pas tout**. Une requête vide retient le carnet
  entier ; l'afficher ferait enregistrer une situation de six cent
  quatre-vingt-dix-huit sujets en croyant en faire une vide (règle 5). Il dit ce
  qu'elle est et comment on la remplira.

Une dernière conséquence, moins visible : `epinglesDuRail` écarte ce qui n'a pas
de requête — une entrée muette ne ferait rien au clic —, si bien qu'une
situation qu'on remplit à la main **disparaissait du rail au moment même où l'on
venait de l'y mettre**. Elle y entre par son repère, `#situation:<id>` : un
dièse, que la grammaire des sujets n'emploie nulle part et ne peut donc jamais
produire. Il se lit à un seul endroit, le clic d'une entrée du rail du carnet,
qui ouvre la situation par son identifiant.

---

## 6. L'horizon du carnet, et ce qu'une ligne montre

Quatre choses de plus, du même tour d'usage.

### Le carnet ne voyait que les chantiers que ses situations citaient

C'est le plus important des quatre. L'horizon du carnet était **l'union des
chantiers nommés par ses situations** : écrire une situation neuve ne pouvait
donc atteindre aucun chantier nouveau. « Les sujets urgents de la maison de
Chamonix » était hors de portée tant qu'aucune situation ne parlait déjà de ce
chantier-là — et le filtre « Chantiers » ne se déclarait même pas, faute d'avoir
plus d'une valeur à proposer.

Pire : une situation qui regarde **tout mon travail** ne nomme aucun chantier,
c'est sa définition. Un carnet dont toutes les situations regardent tout ne
lisait donc **rien**, et chaque ligne affichait « — ».

`chantiersDuCarnet` pose l'horizon : mes chantiers, lus en une fois
(`fetchMesChantiers` — la politique de la base fait le tri, `projects` ne rend
que les miens), plus ceux qu'une situation cite sans être des miens, qu'on garde
parce qu'un chantier partagé ou passé de main ne doit pas faire disparaître d'un
coup les sujets d'une situation qui marchait hier (règle 5).

**Ce que cela coûte.** Les sujets se lisent toujours **un chantier à la fois**,
en parallèle : l'horizon plus large multiplie donc les lectures par le nombre de
chantiers. C'est le même coût par chantier qu'avant, appliqué à plus de
chantiers ; le réduire est un autre sujet, et il touche le chargeur, pas le
carnet.

### Le tableau de la recherche rendait une liste de titres nus

Un titre, un état, un chantier. L'onglet Sujets d'un projet montre en plus les
**labels**, l'**auteur**, le **blocage** et la longueur du **fil** — et c'est
sur ces quatre-là qu'on reconnaît un sujet dans une liste de soixante. On
écrivait une requête et il fallait ouvrir les sujets un par un pour savoir ce
qu'on regardait.

Rien n'est recalculé : les labels, l'auteur et le blocage viennent de la
**surcouche** que l'écran lit déjà pour filtrer (`metaDesSujets`), et les fils du
même index que le tableau d'un projet. Les quatre se demandent **ensemble**,
par une seule porte (`decorDesSujets`) : séparées, trois auraient un jour le
carnet et la quatrième le projet ouvert, et la ligne dirait deux choses à la
fois (règle 4).

La pastille d'un label, elle, vivait dans une fermeture du contrôleur des labels
d'un projet — qui lit le magasin de cet écran-là, et que le carnet n'a pas. Elle
est dans `views/ui/pastille-de-label.js`, avec la lecture d'une définition ; le
contrôleur y délègue. La recopier aurait fait deux pastilles qui divergent à la
première couleur de repli (règle 10).

### Les filtres d'en-tête s'empilaient en colonne

`.issues-head-menu` fait `width:100%`, et c'est juste là où il est né : dans le
tableau des sujets d'un projet, chaque menu occupe **sa** colonne d'en-tête et la
remplit. Dans le formulaire d'une situation, cinq menus partagent une seule
cellule : chacun réclamait la largeur entière, et `flex-wrap` les empilait. Le
bandeau lève la règle, comme `--groupe` le fait ailleurs pour le même conflit.

### L'épingle du rail replié n'ouvrait rien

Replié, le rail ne montre que des icônes, et les épinglées se rangent sous une
seule — sinon vingt-six situations font vingt-six pastilles de couleur sans un
mot. Le rail dessinait déjà ce bouton ; l'écran des situations ne disait pas si
la liste est ouverte, et rien ne l'ouvrait. On cliquait, il ne se passait rien,
et les épinglées devenaient inatteignables dès qu'on repliait le rail.
