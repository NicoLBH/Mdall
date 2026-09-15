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

### Étape 4 — `mode` et `filter_definition` s'effacent

Quand la requête sait dire ce qu'ils disaient, on les retire. Pas avant : une
situation qui perdrait son filtre sans que sa requête le reprenne changerait de
contenu sans que personne l'ait demandé.

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
