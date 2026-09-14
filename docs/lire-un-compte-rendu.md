# Lire un compte rendu de chantier

**À quoi sert cette page :** la chaîne complète, du PDF déposé aux sujets tenus à jour. Ce
qui est fait, ce qui vient, dans quel ordre et pourquoi celui-là.

---

## Le procédé, en trois appels

```
PDF  ──►  1. TRANSCRIPTION            gpt-4.1        ~9 c.
          fidèle, structurée, rangée dans Fichiers
             │
             ▼
          .md  ──►  2. SECRÉTARIAT    gpt-4.1-mini   ~2 c.
                    sujets, lots, labels, objectifs, fermetures
                       │
                       ▼
                    3. RAISONNEMENT   modèle cher    ~5 c.
                    hiérarchie et liens entre sujets
                       │
                       ▼
                    UNE PROPOSITION  ──►  la mémoire du projet
```

**Trois appels, et non un seul, pour trois raisons.**

Le premier transcrit ; il ne juge rien, et c'est pourquoi il peut être vérifié mot pour mot
contre le PDF. Le deuxième fait du secrétariat sur un document propre ; il n'a pas besoin
d'un modèle cher, et son travail se relit ligne à ligne. Le troisième raisonne sur des
relations, ce qui demande davantage — et n'est appelé que si le deuxième a produit de quoi
raisonner.

Séparer permet aussi de **payer chaque chose à son prix**, et de changer un maillon sans
toucher aux autres.

## Ce qui ne change pas

**Rien n'entre directement dans la mémoire.** Chaque appel produit des *propositions* :
sujets à ouvrir, à compléter, à fermer, lots à ajouter, labels à créer, objectifs à poser,
liens à établir. Quelqu'un tranche, ligne par ligne (règle 1).

**Ce que l'IA produit s'affiche avant d'être exploité**, et son coût se voit à la requête
près (fondamental 13).

---

## Le socle existe déjà

Presque rien à créer côté base. Il s'agit d'alimenter ce qui est là :

| Ce qu'il faut | Où c'est |
| --- | --- |
| Labels | `project_labels`, `subject_labels` |
| Hiérarchie père/fils | `subjects.parent_subject_id`, `reorder_subject_children` |
| Liens fonctionnels | `subject_links`, `link_type = 'blocked_by'` |
| Objectifs et échéances | `objectives`, `milestones.due_date` |
| Lots du projet | `project_lots` |
| Situation par filtre | `situations.filter_definition` |
| Dossiers de fichiers | `project_document_folders` |

---

## Les étapes, dans l'ordre

### Étape 1 — La transcription monte en gamme *(faite)*

`gpt-4.1` au lieu de `gpt-4.1-mini` pour le premier appel, et trois règles de plus :

- **un tableau reste un tableau** — en particulier celui des contacts du projet, qui est le
  seul endroit où les coordonnées d'un intervenant sont réunies ;
- **la mise en page peut être clarifiée, les mots non** : le modèle peut ajouter des titres
  Markdown, des listes, des niveaux d'imbrication pour rendre visible une structure que le
  document porte implicitement — il ne peut pas ajouter un mot, ni changer l'ordre ;
- **faire émerger la structure implicite** : une remarque datée et ses mises à jour des
  semaines suivantes forment un fil ; le document les écrit à la suite, la restitution les
  imbrique.

Ce dernier point est le plus important pour la suite. Un compte rendu de chantier n'est pas
une liste de phrases, c'est une **arborescence implicite** : lot → entreprise → remarque →
mises à jour successives. Plus elle est explicite dans le `.md`, moins les appels suivants
ont à deviner.

**Ce que ça coûte :** environ neuf centimes au lieu de deux, pour onze pages. Le tarif est
relevé, la pastille l'affiche.

**Ce qui le vérifie :** les cinq mesures déjà en place — mots retrouvés, mots ajoutés, titres
inventés, phrases découpées, blocs déplacés. La règle « la mise en page peut changer » ouvre
une porte ; les mesures disent si le modèle en profite pour ajouter du texte.

### Étape 2 — Le `.md` se range dans Fichiers *(faite)*

**`Documents / CR de chantier /`**, le PDF et son `.md` côte à côte, le second portant le
nom du premier à l'extension près.

> **Corrigé.** C'était un dossier *par compte rendu*, nommé comme son PDF. Sur un chantier
> qui tient deux ans, cela fait quarante dossiers à la racine de Documents — un par réunion,
> deux fichiers dedans. L'arbre devient illisible au vingtième, et l'on ne retrouve plus un
> compte rendu qu'en connaissant déjà le nom de son fichier. Ils se rangent donc là où on les
> cherche : un dossier, celui de leur nature. C'est alors le **nom du fichier** qui réunit un
> PDF et sa restitution, et plus le dossier qui les contient — d'où l'importance de la règle
> de nommage ci-dessous.

**Ce que ça débloque, et c'est plus que du rangement :**

- la restitution devient **durable** : redéposer le même document ne la refait plus, donc ne
  la repaie plus ;
- elle devient **relisable** par un humain, dans l'onglet Fichiers, avec le PDF à côté ;
- les appels suivants lisent **un fichier**, pas une variable d'écran — ce qui les rend
  rejouables sans le PDF.

Aucune migration : `project_document_folders` existe.

#### Ce qui identifie une restitution, c'est le texte — pas le nom du fichier

Deux comptes rendus s'appellent `CR.pdf`. Le même compte rendu s'appelle `CR_07.pdf` chez
l'un et `07 - CR.pdf` chez l'autre. C'est donc l'**empreinte du texte du PDF** qui est rangée
avec la restitution, et qui décide. D'où trois états, et non deux :

| | |
| --- | --- |
| **absente** | rien n'est rangé — on restitue |
| **à jour** | une restitution de *ce texte-là* est rangée — on la relit, **aucun appel** |
| **périmée** | une restitution est rangée sous ce nom, mais elle vient d'un autre texte — on restitue, et l'écran dit pourquoi |

Le troisième cas est le piège de l'étape. Confondu avec le deuxième, on afficherait la
restitution d'un compte rendu en croyant lire celle d'un autre, sans rien pour s'en
apercevoir (règle 5) ; confondu avec le premier, on écraserait silencieusement du travail
rangé.

#### Le rangement attend la fusion *(corrigé)*

La restitution se rangeait au moment où le modèle la rendait — avant que
quiconque ait rien décidé, et sur un document qu'on venait peut-être de déposer
pour voir. **Déposer un fichier dans le projet est une écriture**, et une
écriture passe par une proposition (règle 1).

Elle attend donc la fusion, avec le reste : les sujets, les lots, les labels, les
objectifs. Ce qu'il faut pour la ranger — le projet, l'empreinte, le document, le
Markdown paginé — voyage avec la lecture, et la proposition le dira en toutes
lettres.

Ce qui ne change pas : une restitution **déjà rangée se relit**, et ne se repaie
pas. Relire est une lecture, pas une écriture.

#### La pagination survit au rangement

Le fichier porte un `<!-- page 3 -->` entre deux pages. Sans lui, le document relu n'aurait
plus de lecture « Origine », plus de mesure par page, et plus rien à confronter au PDF ouvert
à côté. En commentaire, et non en titre : le fichier est fait pour être ouvert par un humain.

Le rendu Markdown affichait les commentaires — il les échappait, donc il les montrait. Il les
laisse maintenant de côté quand ils occupent une ligne entière, et les garde partout ailleurs :
les supprimer au milieu d'une phrase changerait le texte de celui qui l'a écrite.

#### Ce que l'écran en dit

Quatre phrases, et pas une de plus : **relue** — donc rien payé, et la pastille affiche
`0 € — relue`, ce qui n'est pas la même chose que « coût non annoncé » ; **rangée** — donc le
prochain dépôt ne la repaiera pas ; **rangée sous un autre texte** — le document a changé
depuis ; **pas rangée**, avec son motif — on la repaiera, c'est ennuyeux, pas grave.

Un rangement raté n'arrête rien : la restitution est faite, elle est à l'écran.

### Étape 2 bis — L'extraction voit enfin la page *(faite)*

Avant de bâtir le secrétariat sur la transcription, il fallait que la transcription ait un sens.
Elle n'en avait pas toujours, et la cause n'était pas la consigne.

#### Le défaut : la page arrivait déjà détruite

Un compte rendu de chantier est un tableau, déclaré ou déguisé : les remarques à gauche, et à
droite des colonnes étroites — « Date » (entrée au compte rendu), « Pour le » (échéance),
« Fait le » (fermeture). Une cellule de gauche tient sur trois lignes ; celle de droite sur une.

Le texte aplati d'un PDF rend les fragments dans l'ordre du fichier. La date tombe donc **au
milieu** de la phrase :

```
Reprise d'étanchéité en toiture, angle 12/03/2026 30/04/2026 nord-ouest, avant réception
```

La phrase n'a plus de sens, et les deux dates ont perdu la leur — on ne sait plus à quelle
remarque elles se rapportent, ni laquelle est l'échéance. **Aucune consigne ne rattrape cela** :
on demanderait au modèle de deviner ce que l'extraction a déjà détruit.

#### Ce qui a changé : la page est reposée sur sa grille

`extractPositionedPages` rendait déjà `x`, `y`, `width`, `height` et la police de chaque
fragment — et personne ne s'en servait pour la transcription. Les fragments sont maintenant
reposés à la colonne que leurs coordonnées réelles leur donnent, comme `pdftotext -layout` le
fait depuis vingt ans, et pour la même raison : **la géométrie est l'information**.

```
Reprise d'étanchéité en toiture, angle        12/03/2026    30/04/2026
nord-ouest, avant réception
```

Les colonnes redeviennent des colonnes, et les **listes crantées** redeviennent des listes :
une liste de chantier est rarement numérotée, elle se tient par un décalage d'alignement. Sur
la grille, le décalage se voit ; sur le texte aplati, il n'existe pas.

Une page dont la géométrie ne se lit pas repart à plat, comme avant — et elle est **comptée**,
l'écran disant que les colonnes n'y sont pas garanties (règle 5).

#### Les couleurs, et pourquoi elles demandent un refus

« à faire » en bleu, « présence obligatoire au prochain rendez-vous » en rouge : la couleur ne
décore pas, elle hiérarchise. `getTextContent()` ne la rend pas ; elle ne vit que dans la liste
d'opérations, où elle se pose et vaut jusqu'à la suivante.

Il faut donc lire deux fois le même contenu et faire correspondre les deux lectures, qui ne
découpent pas aux mêmes endroits. La règle est la prudence : on compare les **deux flux de
caractères**, espaces ôtés ; s'ils diffèrent d'un seul caractère, **aucune couleur n'est rendue
pour la page**. Une couleur mal recollée est bien pire que pas de couleur — un « fait » colorié
en rouge inverse le sens d'une ligne, et rien à l'écran ne permettrait de s'en apercevoir.

La couleur se transcrit en encadré nommé par la couleur, que le rendu Markdown de Mdall affiche
dans cette couleur :

```
> [!ROUGE]
> Présence obligatoire au prochain rendez-vous
```

**Le nom est la couleur, pas la gravité.** Traduire le rouge en « important » serait une lecture
faite au moment de transcrire, et plus personne en aval ne pourrait la défaire.

#### La consigne, complétée

| | |
| --- | --- |
| **La structure d'abord** | identifier le tableau avant de transcrire ; reconstituer chaque cellule entière avant de passer à la colonne suivante |
| **Le plan habituel** | référence du chantier, tableau des intervenants, généralités reprises de CR en CR, puis les remarques par lot |
| **Les trois dates** | « Date », « Pour le », « Fait le » n'ont pas le même sens et ne se confondent pas |
| **Les lots** | le titre du lot devient un titre Markdown, ses remarques se rangent dessous |
| **Les listes crantées** | chaque cran de la grille devient un niveau de liste |
| **Les flèches** | `->`, `→`, `=>` sont des liens de dépendance, pas de la ponctuation : recopiées telles quelles, sur la même ligne |
| **Les couleurs** | encadré nommé par la couleur, jamais par la gravité |
| **Toute la mise en page** | titres 1 à 6, gras, italique, listes imbriquées, tableaux, encadrés |

#### Le modèle monte d'un cran

`gpt-5` au lieu de `gpt-4.1`, réglable par `OPENAI_TRANSCRIPTION_MODEL` — le nom d'un modèle
change plus vite que le code. Ce n'est pas une recopie : reposer un tableau déguisé, lire une
cellule de gauche qui tient sur quatre lignes pendant qu'une date de droite n'en occupe qu'une,
reconnaître qu'un décalage d'indentation est un regroupement, c'est du raisonnement sur la mise
en page. Et c'est le premier maillon : une erreur ici se propage au secrétariat, aux liens et
aux fermetures sans jamais se corriger.

Le plafond double en conséquence — le modèle rend plus d'un bloc, et une page reposée est plus
longue qu'une page à plat, puisqu'elle porte les espaces qui font ses colonnes.

> **Le tarif de `gpt-5` est à confirmer.** Il a été relevé de mémoire, pas sur la page de tarifs
> OpenAI. Un prix affiché faux est pire qu'un prix absent : si le doute subsiste, retirer la
> ligne de `TARIFS` fait dire « tarif inconnu », ce qui est vrai.

### Étape 2 ter — La structure d'abord, la transcription ensuite *(faite)*

Un compte rendu réel de douze pages a montré deux défauts que la grille seule ne
corrigeait pas. Ils étaient tous les deux de notre fait.

#### Défaut 1 — la légende de couleurs doublait le document

Les passages colorés étaient listés en bas de page, sous un titre « MISES EN
ÉVIDENCE ». Le modèle les a pris pour du contenu et les a **recopiés là, à la
fin** : des encadrés entiers de fragments sans suite, hors de tout contexte, et
le document doublé. C'était le pire défaut de la restitution, et il venait de
cette légende.

Sur un compte rendu réel, elle contenait aussi quarante fragments en gras par
page — des numéros, des tirets, des en-têtes — dont pas un ne disait rien de plus
que ce que la grille montrait déjà.

La couleur se marque désormais **au bout de sa propre ligne** :

```
29/01/2026   Raccord de chape à faire au droit des nourrices    Dès que   ⟨bleu⟩
```

Elle ne peut plus être déplacée sans que cela se voie, et la colonne n'a pas
bougé — la marque est posée après tout ce que la ligne portait. Le gras n'est
plus relevé du tout : les mentions qui comptent (« URGENT », « RETARD ») sont en
capitales et se lisent telles quelles.

La consigne ajoute deux règles que le document réel a rendues nécessaires : une
cellule colorée **reste une cellule** — un tableau ne contient pas d'encadré —,
et **une couleur qui n'est qu'un lien n'est pas une hiérarchisation** : les
adresses électroniques sont bleues dans presque tous les documents.

#### Défaut 2 — chaque page décidait pour elle-même

Le tableau des présences est rendu avec « Présent / Excusé / Absent /
Représenté » page 1, puis « R / E / Présent / Absent » page 2. **Deux tableaux là
où le document n'en a qu'un.** Non parce que le modèle lit mal, mais parce qu'on
lui faisait trancher douze fois une question qui n'a qu'une réponse.

D'où une lecture en deux temps, et un troisième appel :

```
PDF reposé → [1. STRUCTURE]  le squelette, sur un échantillon de pages
           → [2. TRANSCRIPTION]  les douze pages, sur ce squelette
           → [3. SECRÉTARIAT]  les sujets, sur le .md
```

`supabase/functions/structure-du-document` **regarde et ne transcrit rien**. Elle
rend la nature du document, son découpage, l'en-tête et le pied qui se répètent,
les tableaux qui reviennent **avec leurs colonnes** — et deux à cinq consignes
qu'elle écrit elle-même pour la transcription : les pièges qu'elle a vus dans ce
document-là.

Ce squelette entre dans la consigne de transcription, avec une instruction sans
ambiguïté : *emploie exactement ces colonnes, dans cet ordre, sur toutes les
pages où le tableau se poursuit — y compris quand la page ne redéclare pas ses
en-têtes*.

| | |
| --- | --- |
| **Ce qu'elle voit** | six pages au plus, prises **réparties** — la première, la dernière, et du milieu. Un document dont on ne verrait que le début rendrait la forme de son préambule. |
| **Ce qu'elle coûte** | l'appel le moins cher des trois : quelques centaines de jetons en sortie, là où la transcription en rend des dizaines de milliers |
| **Ce qu'elle décide** | le plus : les douze pages obéissent à sa réponse |

C'est pour cela qu'elle **s'affiche**. Un squelette faux rend les douze pages
fausses *de la même façon*, ce qui se voit bien moins qu'une page fausse sur
douze (fondamental 13). L'écran nomme aussi les pages qu'elle a regardées : un
tableau qui n'apparaît qu'à la page 7 d'un document de vingt a pu lui échapper.

Et elle ne bloque rien : une reconnaissance qui échoue laisse la transcription se
faire comme avant, page par page — l'écran disant alors que les tableaux peuvent
diverger d'une page à l'autre.

#### Pourquoi elle ne parle pas de chantier

Un rapport de bureau de contrôle, un CCTP, une notice de sécurité ont tous le
même défaut : ce sont des tableaux déguisés, répétés sur des dizaines de pages,
dont la forme ne se devine qu'en voyant plusieurs pages à la fois. Rien dans
cette lecture ne parle de compte rendu : elle rend ce qu'elle voit.

### Étape 3 — Le secrétariat, sur le `.md` seul

Deuxième appel, `gpt-4.1-mini`, nourri du `.md` et de **ce que le projet sait déjà** : ses
sujets ouverts portant le label « CR chantier », ses lots, ses labels, ses intervenants.

Il propose :

| | |
| --- | --- |
| **Sujets** | à ouvrir, à compléter d'une activité de relance, à fermer |
| **Lots** | ceux du compte rendu qui manquent au projet |
| **Labels** | « CR chantier » au minimum ; « Urgent », « Rappel », « Information générale » quand le document le dit — et il les crée s'ils n'existent pas |
| **Objectifs** | quand une échéance est indiquée : un objectif nommé, daté, rattaché au sujet |
| **Assignations** | l'entreprise ou la personne à qui le point revient |

Cette étape est **trop grosse pour un seul palier**. Elle se fait dans cet ordre, chacun
livrable et vérifiable seul : les sujets et le label « CR chantier » ; puis les lots ; puis
les labels de qualification ; puis les objectifs.

#### Palier 1 — Le secrétariat sait ce que le projet suit déjà *(fait)*

**Le rapprochement change de main.** Il se faisait dans le navigateur, par comparaison des
titres mis à plat — ce qui ne reconnaît qu'une reprise mot pour mot. Or un compte rendu
*reporte*, et un point qui avance se réécrit : « pose prévue demain » devient « pose
réalisée », et repartait donc comme un point neuf. La moitié « a changé » était presque
inatteignable, et c'était écrit dans `docs/a-traiter-plus-tard.md`.

Le modèle reçoit maintenant la liste de ce que le projet suit — identifiant, numéro, état,
titre, et rien de plus — et rend pour chaque point le sujet qu'il continue, avec la raison.

| | |
| --- | --- |
| **Ce que le modèle reçoit** | une ligne par sujet : `- <id> #<numéro> [<état>] : <titre>` |
| **Ce qu'il rend** | `sujet_existant` (l'identifiant, recopié) et `raison_du_rapprochement` |
| **Ce qui est vérifié au serveur** | l'identifiant figure dans la liste envoyée, ou il est écarté |
| **Ce que l'écran dit** | qui a rapproché — le modèle ou le titre — et pourquoi |

##### Le garde-fou, et pourquoi il est plus dur que celui des citations

Une citation inventée fait perdre un point : on le voit, il manque. **Un identifiant inventé
fait pire** — il range un point réel dans la discussion d'un sujet qui n'a rien à voir, où
personne n'ira le chercher. Le point n'est pas perdu, il est *égaré*, ce qui ne se voit jamais.

On n'essaie donc pas de corriger : ce qui n'a pas été envoyé ne revient pas. Le point reste,
son rapprochement tombe, et il repart comme un point neuf — l'erreur la moins coûteuse des
deux. La consigne le dit aussi au modèle : « dans le doute, laisse null ».

##### Les deux voix ne s'affichent pas pareil

Le titre mis à plat est une **constatation** : il a trouvé les mêmes mots. Le modèle porte un
**jugement**, et un jugement se relit. Chaque rapprochement dit donc lequel des deux l'a
reconnu, et la raison que le modèle donne est là pour qu'on puisse répondre « non, ce n'est
pas le même ».

Et quand la liste n'a pas pu être lue, l'écran le dit : **« le modèle n'a pas su ce que le
projet suit » n'est pas « rien ne correspondait »** (règle 5).

##### Le label « CR chantier »

Son nom vit à un seul endroit (`label-du-cr.js`), et nulle part ailleurs : recopié dans
l'écran, dans le filtre et dans la situation, il existerait en trois versions et le filtre ne
trouverait plus rien (règle 10).

L'écran dit s'il existe déjà dans le projet, ou si la proposition le créerait — et ne dit ni
l'un ni l'autre quand les labels n'ont pas pu être lus. **Rien n'est posé** : poser un label est
une écriture, et une écriture passe par une proposition (règle 1).

##### Ce que ce palier ne fait pas encore

Les objectifs : palier 4. Et la fermeture reste entière à l'étape 4 — c'est le point le plus
délicat du plan.

#### Palier 2 — Les lots qui manquent au projet *(fait)*

**Un lot manquant ne se voit pas.** Ce qui se voit, c'est une poignée de points sans
rattachement qu'on croit mal lus. Un compte rendu découpe tout par lot — c'est son ossature —
et si le projet ne connaît pas un lot, ses points arrivent orphelins : on ne peut ni les
grouper, ni les assigner, ni dire ce que ce lot doit.

##### Le vrai problème : reconnaître que deux lots sont le même

Le compte rendu écrit « 02 — GROS ŒUVRE ». Le projet a « Gros œuvre ». Le suivant dira
« LOT 02 », « 02 GO » ou « Lot n° 2 - Gros oeuvre ». Les prendre pour quatre en créerait trois
de trop, ce qui est **pire que de n'en créer aucun** — parce que personne ne nettoiera.

| Dans cet ordre | |
| --- | --- |
| **Le numéro** | « 02 » identifie le lot dans ce marché, et survit à toutes les façons de l'écrire. Deux lots numérotés différemment sont deux lots, même si leurs noms se ressemblent — « 02 gros œuvre » et « 03 gros œuvre démolition » coexistent. |
| **Le nom mis à plat** | accents, ponctuation et numéro ôtés, quand il n'y a pas de numéro des deux côtés |

Un intitulé dont on n'a extrait ni numéro ni nom **portant des lettres** n'est pas proposé :
« 12.02.1 » est une référence de point, et en faire un lot en créerait autant que le compte
rendu a de points.

Et **ne pas avoir pu lire les lots du projet n'est pas « le projet n'en a aucun »** : on ne
propose alors rien du tout, plutôt que de proposer d'ajouter des lots qui sont peut-être déjà
là (règle 5).

#### Palier 3 — Les labels de qualification *(fait)*

« CR chantier » dit d'où vient un sujet ; ceux-ci disent ce qu'il vaut. Un compte rendu ne les
porte pas comme des étiquettes : il les dit en toutes lettres, et c'est cela que le modèle
relève.

| Label | Ce qu'il faut pour le poser |
| --- | --- |
| **Urgent** | le document le marque urgent, ou fixe une échéance immédiate — « sous 48 h », « avant la prochaine réunion », une mise en évidence en rouge sur le point |
| **Rappel** | le point est redit d'un compte rendu à l'autre, ou porte « pour rappel », « relance », « déjà signalé » |
| **Information générale** | le document l'écrit pour information : il n'attend d'action de personne |

##### La liste est fermée, et c'est le point

Un modèle libre d'inventer des labels en produit quinze en trois comptes rendus : « Urgent »,
« Très urgent », « Prioritaire », « À traiter vite ». Le projet se remplit d'étiquettes qui
disent la même chose, aucun filtre ne trouve plus rien, et **personne ne nettoiera**.

Un label hors de la liste est donc écarté au serveur, comme une citation qu'on ne retrouve
pas — et compté, pour que l'écran puisse le dire. La casse et les accents ne comptent pas
(« urgent » est `Urgent`), mais le label retenu porte l'écriture officielle : sans quoi le
projet finirait avec « Urgent » et « urgent », que la base compte pour deux.

La consigne ajoute une interdiction qui compte autant : **ne pose jamais `Urgent` parce que le
sujet te semble grave.** On relève ce qui est écrit, on ne juge pas le chantier.

##### Les deux écritures de la liste, et ce qui les empêche de diverger

Une fonction Edge ne peut pas importer hors de `supabase/functions/`, et aucun fichier servi au
navigateur ne remonte vers le serveur — `scripts/verifie-cloison.test.mjs` y veille, tests
compris. La liste est donc écrite deux fois, et **un test côté serveur compare les deux** : il
tombe dès qu'elles divergent. C'est la seule façon, ici, d'avoir un nom qui vit à un seul
endroit (règle 10).

##### Rien n'est écrit

Ni lot ajouté, ni label créé, ni label posé. Tout cela est une écriture, et une écriture passe
par une proposition (règle 1). L'écran montre ce que la proposition porterait, et c'est
quelqu'un qui la signe.

#### Palier 4 — Les objectifs *(fait)*

##### Une date fausse est pire qu'une date absente

Le compte rendu écrit ce qu'il veut : « Pour le 30/04/2026 », « 30 avril », « sous 48 h »,
« avant la prochaine réunion », « S15 ». Un objectif Mdall, lui, porte une date — il faut donc
convertir, et **c'est là que tout se joue**.

Un objectif daté du 30 mars quand le document dit fin avril fait courir une alerte un mois trop
tôt ; daté de l'an prochain, il ne sonne jamais. Dans les deux cas, personne ne remontera
jusqu'au compte rendu pour vérifier — on fera confiance au chiffre.

##### Trois façons d'obtenir une date, et une quatrième qui n'en est pas une

| | |
| --- | --- |
| **écrite** | le document donne le jour, le mois et l'année |
| **complétée** | le document donne le jour et le mois ; l'année vient du compte rendu |
| **comptée** | le document donne un délai — « sous 15 jours » — compté depuis la date de la réunion |
| *(refus)* | tout le reste |

La règle de « complétée » mérite d'être écrite : **une échéance est postérieure à la réunion qui
la fixe.** C'est ce qu'échéance veut dire. On prend donc l'année du compte rendu, et l'année
suivante si cela tomberait avant lui — « 15 janvier » dans un compte rendu de décembre est le
15 janvier suivant.

L'écran dit laquelle des trois a servi, et **la moins sûre d'un groupe l'emporte** : montrer la
plus flatteuse ferait passer un calcul pour une lecture.

##### Ce qu'on refuse, et pourquoi on le nomme

« Avant la prochaine réunion » n'est pas une date : on ne sait pas quand elle est. « S15 » non
plus : la numérotation des semaines varie d'un bureau à l'autre, et se tromper d'une semaine est
exactement le genre d'erreur qu'on ne remarque pas. Le 31 février non plus — il existe en
arithmétique, pas au calendrier.

Ces échéances-là ne disparaissent pas : elles se comptent et s'affichent telles quelles. C'est
la liste de ce qu'on ne sait pas encore convertir, et c'est elle qui dira s'il vaut la peine
d'en convertir davantage (règle 5).

**Sans la date de la réunion, on ne compte pas depuis aujourd'hui** : la lecture d'un compte
rendu de mars faite en septembre daterait tout de six mois trop tard. On refuse, et l'écran dit
pourquoi la liste est courte.

##### Un objectif par date, et non par point

Quarante points font quarante échéances, mais rarement quarante dates : un chantier travaille
par jalons — « ce qui doit être fait pour le 30 avril ». Un objectif par point donnerait
quarante objectifs dont aucun ne se lit.

Et **la date décide, pas le nom** : un objectif du projet nommé « Livraison lot 02 » mais daté
du même jour est ce jalon-là. En créer un second le doublerait.

### L'écran, et ce qu'il dit quand ça casse

#### Le parcours ne commence plus à la fin

L'écran ne s'affichait qu'une fois tout terminé. Pendant une minute et demie, on voyait un rond
tourner dans la zone de dépôt, sans savoir si le fichier avait été reçu, à quelle étape on en
était, ni ce qui avançait — et l'on redéposait, ce qui relançait tout et repayait tout.

Maintenant : le fichier se dit reçu avec son nom, les deux onglets apparaissent aussitôt, et
chacun se remplit quand son tour arrive — Restitution d'abord, c'est l'ordre du procédé, puis
Analyse. Un onglet qui attend le dit : **en attente n'est pas vide.**

#### Une panne ne vide plus l'écran

Une analyse qui tombait après une restitution réussie emportait la restitution avec elle : on
avait payé un appel dont il ne restait rien. L'alerte se pose maintenant **au-dessus** des
onglets, qui gardent ce qu'ils ont.

#### « La lecture a été refusée » ne dit rien

Ni à qui la lit, ni à qui doit la réparer. Le document était-il trop long, le modèle absent, la
clé expirée, le schéma invalide ? Quatre pannes, une seule phrase, et chacune se corrige
autrement — on en était réduit aux conjectures.

Le serveur nomme donc sa panne en **trois champs** — type, code, message, coupés court — et
l'écran la met dans le presse-papiers. Jamais le corps de l'erreur : il peut contenir un écho de
la consigne, qui ne descend pas dans le navigateur.

C'est ce diagnostic qui a nommé la panne réelle : **la réponse était coupée, pas refusée.** Le
plafond de sortie de `extract-sujets` valait 8 000 jetons, et chaque point porte désormais ses
labels, le sujet qu'il continue et la raison du rapprochement. Un compte rendu de onze pages
dépassait, la réponse revenait tronquée au milieu du JSON, rien ne s'en lisait — et l'écran
annonçait un refus. C'était faux : la lecture avait eu lieu, et elle avait été payée. Le plafond
est passé à 24 000 jetons, et une réponse coupée se reconnaît désormais comme telle.

### Étape 2 quater — Le document perd ses bords, et retrouve ses titres *(faite)*

Deux corrections tirées du CR 38, une fois la structure reconnue.

#### Un Markdown n'a pas de pages

« Page 9 sur 12 », le rappel d'affaire en tête de chaque feuille, le bloc de
coordonnées en pied : ce ne sont pas du contenu, ce sont **les bords du papier**.
La consigne disait « restitue-le une seule fois » ; elle dit maintenant **ne le
restitue nulle part**.

La mesure suivait mal : ces mots figurent dans le texte du PDF, et comptés parmi
ceux à retrouver ils faisaient chuter la part retrouvée **à chaque fois que le
modèle obéissait**. Les mots du mobilier — tirés du squelette reconnu — sont donc
retirés de la mesure. Sans squelette, rien n'est retiré : ne pas savoir ce qui
est du mobilier n'autorise pas à en supposer (règle 5).

#### Un tableau n'est pas le document

Un compte rendu s'écrit dans un unique tableau de quatre colonnes, page après
page, et ses lots y sont rangés comme des lignes sans date. Restitué tel quel,
c'est un tableau de deux cents lignes où plus rien ne se trouve : **le découpage
qui portait toute l'information a disparu dans la forme.**

La reconnaissance de structure relève donc aussi les **chapitres** — le motif du
titre (« Lot XX – intitulé – ENTREPRISE »), son niveau, un exemple réel, et à
quoi on le reconnaît. La transcription reçoit alors une règle sans ambiguïté :
*quand un de ces titres apparaît au milieu d'un tableau, le tableau
s'interrompt — tu le fermes, tu écris le titre, puis tu rouvres un tableau avec
exactement les mêmes colonnes.*

#### Les adresses se lisent comme des adresses

Un compte rendu en porte trente. Le rendu Markdown en fait maintenant des liens
`mailto:` — la liste de diffusion se lit d'un coup d'œil, et l'on écrit d'un clic
à l'entreprise qui doit reprendre l'étanchéité. Une adresse déjà écrite en lien
n'en reçoit pas un second, et une adresse citée dans du code reste du code.

#### Un trait avant chaque lot — et de quoi savoir qui n'obéit pas

Un titre seul ne suffit pas à montrer le découpage : dans un Markdown rendu, un `###` au
milieu d'un flot de tableaux se remarque à peine, et douze pages sans respiration se lisent
comme un seul bloc. La consigne fait donc **précéder chaque titre de niveau 1, 2 ou 3 d'une
ligne `---`**. Pas de trait devant les titres plus profonds : ce qui se range *sous* un lot ne
le découpe pas.

**Elle n'a rien produit.** Douze pages restituées sans un seul trait ni un seul titre. Deux
corrections en sont sorties.

##### La consigne est détachée, et porte un exemple

Écrite à la suite de la règle du tableau interrompu, dans le même paragraphe, elle se lisait
comme un commentaire. Elle est maintenant sa propre consigne, et montre exactement ce qui est
attendu :

```
---

### Lot 03 – Gros œuvre – ENTREPRISE
```

##### Et l'on mesure, au lieu de conjecturer

« Le modèle n'obéit pas » est une conjecture, pas un diagnostic. **Deux causes très
différentes donnent le même écran vide**, et se corrigent à deux endroits opposés :

| Ce qu'on voit | Ce qui a lâché | Ce qu'il faut reprendre |
| --- | --- | --- |
| aucun chapitre annoncé, aucun titre rendu | la **reconnaissance** : la consigne sur les titres n'a jamais été écrite | l'échantillon de pages, ou ce qu'on demande de relever |
| des chapitres annoncés, aucun titre rendu | la **transcription** : la structure a fait son travail | la consigne de transcription |
| des titres, pas de traits | la moitié de la consigne a passé | détacher davantage la règle du trait |

L'écran compte donc les chapitres annoncés, les titres rendus et les traits qui précèdent un
titre, et dit laquelle des deux moitiés a lâché. Sans cela on relance le même appel en
espérant mieux.

Deux précautions dans la mesure : la ligne de séparation d'un tableau n'est pas un trait — sur
un compte rendu qui en porte quarante, la confondre dirait quarante traits pour zéro
découpage — et un trait perdu entre deux paragraphes ne compte pas : seul celui qui précède un
titre découpe quelque chose. Sans squelette lu, aucun verdict n'est rendu : on ne peut pas
accuser un modèle d'avoir ignoré une consigne dont on ignore si elle lui a été donnée
(règle 5).

#### Les coordonnées : pas d'appel de plus, une consigne de colonne

Sur un vrai document, l'adresse postale de chaque entreprise atterrissait dans
la colonne « Tél. / Mail », parce qu'elle est écrite sous le nom et que la ligne
du tableau est haute. La tentation est d'ajouter un appel dédié à la
reconnaissance des coordonnées.

**Ce n'en est pas un bon usage.** Un numéro de téléphone, un code postal et un
numéro de voie se reconnaissent par leur forme, et un appel qui les relit paie
le document entier pour n'apprendre à personne ce qu'une expression régulière
sait déjà. Surtout, ce n'était pas un problème de *reconnaissance* : le modèle
avait parfaitement lu l'adresse, il l'avait mise dans la mauvaise colonne.

La consigne de structure dit donc, dès qu'un tableau est reconnu, **ce que
chaque colonne porte** : une colonne de coordonnées ne porte que des téléphones
et des adresses électroniques ; une adresse postale appartient à la colonne du
nom, sous ce nom. Et quand une case porte plusieurs valeurs, elle les sépare par
un `\n` *dans* la case, sans jamais ouvrir une ligne de tableau de plus — c'est
ce que le rendu Markdown sait maintenant lire.

Le jour où il faudra vraiment *extraire* les coordonnées — pour créer un
intervenant, pas pour l'afficher —, ce sera un service pur et testable, pas un
appel.

#### La restitution se compose dans la largeur de sa feuille

Un compte rendu est écrit **pour une feuille** : ses tableaux et ses retours à la ligne ont
été composés pour une largeur d'A4. Étalé sur un écran de deux mille pixels, le même document
devient une bande de deux cents caractères où chaque ligne se lit deux fois, faute de
retrouver l'origine de la suivante.

La largeur vient de la **géométrie du PDF**, pas d'une constante : une constante ferait un A4
portrait de tous les documents, y compris des plannings en paysage — et c'est là qu'elle
compte le plus. Un point PostScript vaut 1/72 de pouce, un pixel CSS 1/96 : la conversion est
un rapport, qui vaut donc aussi pour l'A3 et le Letter.

Le document prend la largeur de sa page **la plus large**, et non la plus fréquente : douze
pages portrait dont une est un planning paysage doivent pouvoir montrer ce planning. Sans
mesure, l'aperçu s'étale — et l'écran dit pourquoi plutôt que de supposer un A4 (règle 5).

#### Les tableaux font tous la même largeur

Chaque page décidait de la sienne, et la restitution donnait douze tableaux
désalignés. Les cellules cassent maintenant les mots trop longs
(`overflow-wrap: anywhere`) plutôt que de pousser la colonne : aucun tableau ne
dépasse son conteneur, et ils atterrissent tous à la même largeur.

#### Deux lignes dans une case

Une cellule de tableau ne peut pas contenir de vraie ligne — le pipe refermerait la ligne. Un
compte rendu, lui, met couramment deux choses dans la même case : une adresse et un
téléphone, un nom et une société.

Deux écritures arrivent, et les deux se lisent **dans une cellule, et nulle part ailleurs** :
`<br>`, la convention de Markdown et ce que le modèle écrit spontanément, et `\n` littéral.
La consigne demande maintenant `<br>` : c'était mon invention de demander `\n`, et elle
donnait « COMMUNE DU REPOSOIR&lt;br&gt;37, route de Prariand » affiché tel quel dans la case.

Ailleurs, `<br>` reste du HTML échappé et `\n` un antislash suivi d'un n — dans un chemin
Windows, dans une consigne. Les transformer partout abîmerait du texte que personne n'a
demandé de couper.

#### Le spinner *est* la liste

Une roue seule ne dit rien pendant une minute et demie, et l'on redépose — ce qui relance
tout et repaie tout. Une roue **à côté** d'une liste en dit deux fois trop : deux objets pour
un seul état, qui se contredisent dès que l'un des deux retarde. C'est ce qui est arrivé — la
liste disait « reconnaissance de la structure » pendant que l'onglet disait « restitution du
document ».

Il n'y en a donc qu'un, dans l'un comme dans l'autre onglet : la roue tourne, et les étapes
s'écrivent dessous à mesure qu'elles arrivent. **Celles qui restent ne s'affichent pas** —
une liste complète cochée par le haut promet cinq étapes, et cette promesse est fausse : une
restitution qui échoue n'en fait jamais que trois.

Le décalage tenait à une phrase d'avancement tenue à côté du curseur d'étape. Elle n'existe
plus : `etat.etape` décide seule, et le libellé vient de la table des étapes (règle 4).

### Étape 4 — Fermer un sujet, et la question de fond *(faite)*

**C'est le point le plus délicat de tout le plan**, et il mérite d'être traité à part.

Comment sait-on qu'un point est réglé ? Trois signes, et ils ne se valent pas :

| Signe | Ce qu'il vaut |
| --- | --- |
| Le point porte « fait », « soldé », « levé » | **fermeture dite** — le document l'écrit |
| Le point est barré | rien : la rature ne parvient pas jusqu'ici |
| Le point a disparu du compte rendu | **fermeture déduite** — et réversible |

#### Ce que la disparition vaut, et ce qui la rend acceptable

Un point sort d'un compte rendu parce qu'il est réglé, parce que le rédacteur l'a oublié,
parce que le lot n'était pas convoqué cette semaine, ou parce que le document a changé de
trame. La première lecture de ce plan en concluait qu'on ne pouvait rien fermer là-dessus, et
posait une question à la place.

**C'est la réversibilité qui a tranché.** Un compte rendu de chantier dit « fait », puis le
rappelle quelques semaines, puis l'enlève : la disparition *est* le signal normal de
fermeture sur ce genre de document. Et si l'on se trompe, le prochain compte rendu qui en
reparle rouvre le sujet — le même, avec toute son histoire, puisque la confrontation
reconnaît un sujet fermé au lieu d'en ouvrir un second au même titre (voir plus bas).

La règle est donc : **une disparition ferme, en le disant.** La proposition écrit « sur cette
déduction, et non sur une phrase du document », et annonce la réouverture dans la même
phrase. Les deux vont ensemble : la déduction n'est acceptable *que* parce qu'elle se défait
toute seule.

#### Un « nouveau » sujet peut être un ancien qui se rouvre

Le corollaire, et il n'est pas facultatif : sans lui, fermer condamnerait à dupliquer. Un
point qui retrouve un sujet **fermé** ne porte pas le sort « nouveau », mais `reouvre` — le
quatrième sort de `lecture-du-cr.js`, à côté de `nouveau`, `relance` et `change`. Le
rapprochement par le titre et le rapprochement par le modèle y mènent l'un comme l'autre.

#### Ce que le document écrit *(fait)*

##### Ce qui décide, c'est nous — pas le modèle

Le modèle **rapporte** le contenu de la colonne de fermeture, mot pour mot : « Fait »,
« 19/01/2026 », « 50% », « Non achevés », « Suspendu ». La lecture de ce mot se fait dans
`fermeture-du-cr.js`, où elle se vérifie. Demander le verdict au modèle mettrait une décision
de fermeture hors de portée de tout test.

| Ce que la colonne porte | Ce qu'on en fait |
| --- | --- |
| une date, « Fait », « Soldé », « Levé », « 100% » | **fermeture dite** — la proposition fermerait le sujet, avec la phrase qui le justifie |
| « En cours », « Non achevés », « Suspendu », « 50% » | **retenue** — le document dit explicitement que ce n'est pas fini |
| rien | le point reste ouvert |

**Ce qui retient l'emporte sur ce qui ferme** : « Fait à 50% » n'est pas fait, et
« réalisé, non achevé » non plus. Le doute ne ferme pas.

##### La disparition, et ce qu'on en conclut

Un sujet ouvert, portant le label « CR chantier », qu'aucun point de ce compte rendu ne
rapproche : il a disparu. L'écran le relève dans un bloc **visuellement distinct** — trait
pointillé, couleur d'attente — parce qu'une fermeture déduite ne se lit pas comme une
fermeture écrite. Confondre les deux ferait passer une supposition pour une lecture, et l'on
ne saurait plus, en relisant la proposition, laquelle des deux on a acceptée. D'où quatre
états dans le code, et non trois : `dite`, `retenue`, `ouverte`, `deduite`.

On ne compare que ce qui est comparable : un sujet ouvert à la main, ou venu d'un rapport de
bureau de contrôle, n'a aucune raison de figurer dans un compte rendu de chantier. **Sans le
label, on ne compare pas du tout** — et l'écran dit pourquoi la liste est vide.

##### Le barré, qu'on ne sait pas détecter

Une rature est un trait **dessiné par-dessus** le texte, pas une propriété de la police :
`pdf.js` rend l'italique et le gras, jamais la rature. Un point barré arrive donc comme un
point ordinaire.

Il n'y a pas d'état « barré » dans le code : prétendre le détecter serait pire que de ne pas
le détecter. L'écran le dit en toutes lettres, sous les fermetures. Le jour où la géométrie
saura relever les traits qui traversent une ligne — c'est possible, la liste d'opérations les
porte comme elle portait les couleurs — il en viendra un.

### Étape 5 — Les liens entre sujets *(faite)*

#### Ce qu'on perdait sans eux

Un compte rendu de chantier est plein de dépendances, et elles sont **explicites** — c'est
même ce qu'une réunion de chantier sert à établir :

- « cloison CF1H à réaliser dans niches dans bureau, **après implantation des nourrices par
  l'entreprise de plomberie** » : le lot 03 attend le lot 13 ;
- « cause retard du plombier : démarrage pose des carrelages reporté » : le lot 10 attend le
  lot 13 ;
- « raccord de chape au droit des nourrices — **synthèse prévue avec** » et, vingt pages plus
  loin, « bien prévoir une synthèse au droit des nourrices » : la même affaire, vue des deux
  côtés.

Versés sans leurs liens, ces points deviennent quarante sujets indépendants. On ne voit plus
qu'en débloquant le lot 13 on débloque trois lots, ni que deux entreprises parlent de la même
chose sans le savoir. **C'est exactement l'information qu'une réunion produit, et la seule
qu'un tableau perd.**

#### Pas de quatrième appel

Le plan prévoyait un appel séparé, sur un modèle plus capable. Il n'y en a pas eu : les liens
sont demandés **dans l'appel de secrétariat**, comme un champ de plus du point. La raison est
que le modèle a déjà le document sous les yeux à ce moment-là, et que ce sont ses propres
titres de points qu'un lien doit désigner — un appel séparé aurait dû les lui redonner, et
payer une seconde fois le même document.

#### La liste des types est fermée, et c'est la base qui la ferme

`subject_links` contraint `link_type`, et `subjects` porte la hiérarchie dans
`parent_subject_id`. On ne réinvente ni l'une ni l'autre : un type hors de cette liste ne
serait pas écrit par la base, et le lien disparaîtrait à la fusion sans que rien ne
l'explique.

| Type | Ce qu'il faut avoir lu |
| --- | --- |
| `blocked_by` | « après », « suite à », « sous réserve que », « cause retard de » |
| `related_to` | une flèche « -> », « CF CR 31 », « idem », « synthèse prévue avec » |
| `parent` | le document range ce point sous un autre, plus général |
| `duplicate_of` | deux points disent la même chose, à deux endroits du document |
| `contradicts` | le document dit ici l'inverse de ce qu'il dit là |
| `replaces` | « annule et remplace », « la solution retenue au CR 31 est abandonnée » |

La liste est écrite des deux côtés de la cloison — une fonction Edge ne peut pas importer
hors de `supabase/functions/`. Un test **côté serveur** compare les deux écritures dans les
deux sens : un type proposé au modèle que la base refuserait, comme un type accepté que la
consigne ne nomme pas, fait tomber la suite (règle 10).

#### Deux directions de cible, et elles ne se confondent pas

Un lien vise soit **un autre point de ce compte rendu** — qui n'existe pas encore comme
sujet —, soit **un sujet déjà ouvert dans le projet**. Les deux se résolvent différemment à
la fusion : le premier attend que les deux sujets soient créés, le second peut être écrit
tout de suite. Le modèle remplit l'un *ou* l'autre, jamais les deux, et l'écran les
distingue.

#### Ce qui empêche un lien de mentir

**Un lien est exactement le genre d'affirmation que personne ne vérifie** : deux lignes
reliées à l'écran ont l'air d'un fait. `verifierLesLiens` écarte donc, et compte :

- un lien vers un sujet qu'on n'a pas envoyé au modèle ;
- un lien vers un point qui n'est pas dans ce compte rendu ;
- un point qui se lie à lui-même — la base le refuse aussi
  (`subject_links_no_self_link_check`) ;
- un type hors de la liste.

Le point survit toujours à son lien : on n'écarte que la dépendance. Et l'écran affiche, à
côté de chaque lien, **la phrase du document qui l'établit** — sans elle, on ne peut pas
répondre « non, ça n'a rien à voir », on peut seulement croire.

Zéro lien est une réponse, et c'est le cas le plus fréquent : le bloc ne s'affiche pas du
tout plutôt que de se plaindre.

### Étape 6 — La situation qui se tient à jour toute seule *(faite)*

Au troisième dépôt, un projet porte quarante sujets venus des réunions, mêlés à ceux qui
viennent d'ailleurs. Les retrouver demande de refaire le même filtre à chaque fois — et
personne ne le refait. Une situation **automatique** fondée sur `label = CR chantier` les
rassemble une fois pour toutes.

C'est le premier endroit où la chaîne **rend quelque chose sans qu'on l'ait demandé**.

#### « Toute seule » ne veut pas dire « sans personne »

Le plan disait « la situation se crée toute seule ». **Elle ne se crée pas : elle se
propose.** Rien n'entre directement dans la mémoire du projet, et une situation en fait
partie — elle a un titre, elle apparaît dans la barre, on la partage. Créée dans le dos de
quelqu'un, elle serait la première chose du produit que personne n'a signée.

Ce qui est automatique, c'est **son contenu** : une fois acceptée, un sujet y entre dès qu'il
reçoit le label et en sort dès qu'il est fermé. Personne n'a à la remplir.

#### Trois règles, et elles tiennent toutes à la même idée

| Règle | Pourquoi |
| --- | --- |
| **Deux sujets au moins** | une situation qui n'en rassemble qu'un ne rassemble rien : c'est un sujet avec une page de plus |
| **Les sujets ouverts seulement** | c'est ce que le filtre de la base retiendra ; annoncer autre chose ferait dire à l'écran autre chose que ce qui se passera (règle 4) |
| **Une seule, jamais deux** | une seconde situation sur le même label serait une seconde vérité sur le même ensemble, et l'on ne saurait plus laquelle regarder (règle 10) |

Une situation **manuelle** du même nom ne compte pas comme couvrante : son contenu est une
liste figée, pas un filtre. Croire qu'elle couvre priverait le projet de la seule qui se
tient à jour.

Et sans la liste des situations du projet, on ne propose rien : ne pas savoir n'autorise pas
à créer (règle 5).

Aucune migration : `situations.mode` accepte déjà `automatic`, et `filter_definition` porte
déjà `labelIds`.

### Étape 7 — L'écran des sujets, pour s'y retrouver *(faite)*

Rien de ce qui précède ne sert si le tableau des sujets ne sait pas filtrer.

#### Une barre plutôt que six menus

`label:cr-chantier assigné:moi statut:ouvert étanchéité` — les filtres et les mots vivent au
même endroit, et cet endroit est **le champ de saisie**. On lit ce qu'on regarde, on le
corrige au clavier, on le copie, on le colle, on l'épingle. Six menus obligent à les ouvrir
tous les six pour savoir ce qu'on regarde, et ne se copient pas.

C'est la barre de la Mémoire, réemployée telle quelle : `query-bar.js` avait été écrit sans
connaître aucun écran, précisément pour servir ici. Le miroir coloré, les suggestions au
curseur, le bouton d'épingle — rien n'est réécrit. **Deux barres de recherche se
ressembleraient assez pour qu'on ne remarque leurs différences qu'en se trompant.**

Sept champs, déclarés sur le vocabulaire du projet : `statut`, `priorité`, `bloqué`, `label`,
`objectif`, `lot`, `assigné`. Un champ sans valeur n'est pas déclaré — un projet sans
objectif ne propose pas `objectif:`, parce que le filtre ne rendrait jamais rien et qu'on
chercherait ce qu'on a mal tapé.

Le lot d'un sujet est celui de qui le porte : la base range les **personnes** dans les lots,
pas les sujets. L'écran le dit plutôt que de laisser croire à une colonne qui n'existe pas.

#### Trois gestes, un seul état

Le rail écrit une requête toute faite, la barre la modifie, les menus de l'en-tête y ajoutent
ou en retirent un jeton. Il n'y a donc **qu'un seul état filtrant**, et c'est celui qu'on lit
à l'écran.

Ce n'était pas le cas : le statut et la priorité vivaient dans leurs propres cases, à côté de
la recherche. Le menu pouvait dire « Fermés » pendant que la barre disait `statut:ouvert`, et
l'on ne savait plus lequel commandait. **Ce filtre-là a déjà cassé deux fois pour cette
raison** ; la troisième réparation ne déplace pas la case, elle la supprime (règle 4).

#### Le rail : des requêtes toutes faites, avec leurs comptes

« Tous », « Ouverts », « Les miens », « Bloqués », « Venus des comptes rendus », « Sans
label », « Fermés ». Ce ne sont pas des modes : ce sont des requêtes, et la barre reste
modifiable — on part des « Miens » et l'on ajoute `lot:03` sans rien apprendre de nouveau.

La lecture active **se déduit, elle ne se retient pas** : on la reconnaît dans la requête.
Ajouter un filtre à la main rebascule donc sur « Tous » sans que personne ait à y penser.
Le texte libre compte : « Les miens » plus un mot cherché n'est plus « Les miens », et
allumer quand même ferait croire qu'on voit tous ses sujets.

Chaque lecture affiche **le nombre de sujets qu'elle rendra**, calculé en appliquant sa
requête. Un compte qui diffère de ce qu'on voit après avoir cliqué est pire qu'aucun compte.
Quand il ne peut pas se calculer — « Les miens » sans savoir qui regarde —, il ne s'affiche
pas : zéro serait un mensonge (règle 5).

#### Les épingles, dans la table de la Mémoire

Le plan demandait « le même bouton et la même logique d'affichage que l'onglet Mémoire ».
C'est allé plus loin : **la même table**. Une seconde table aurait dupliqué la politique de
sécurité, l'index, la contrainte d'unicité et le raisonnement sur la vie privée — et c'est
sur la sécurité que les deux écritures auraient fini par diverger (règle 10).

Une colonne `surface` dit de quel écran vient l'épingle, pour que le rail des sujets
n'affiche pas les requêtes de la Mémoire — dont la grammaire n'est pas la sienne, et qui ne
rendraient rien. Elle range ; elle n'autorise pas. C'est toujours `owner_id` qui autorise, et
la politique ne change pas d'un caractère.

Migration **strictement additive** : la colonne a une valeur par défaut, et toutes les
épingles déjà posées sont des épingles de la Mémoire — ce qui est vrai, puisque c'était le
seul écran qui en posait.

#### Le rail est celui de la maison, et il porte les autres écrans

Le premier rail était une coque à lui. `project-rail.js` en existait déjà une — celle de la
Mémoire, reprise par l'Atelier — et elle porte le calage du haut au défilement, le repli calé
en bas et la poignée de largeur. Trois copies de ce calage divergeraient au premier
changement (règle 10). Le rail des sujets est donc sur cette coque : **pleine hauteur,
redimensionnable, repliable**, comme celui de la Mémoire.

Il porte trois groupes, séparés par un trait :

| Groupe | Ce que c'est |
| --- | --- |
| **les lectures** | Tous les sujets, Assigné à moi, Créé par moi, Mentions, Activité récente — elles filtrent la liste |
| **les vues** | les recherches qu'on a épinglées : les mêmes requêtes, écrites par qui regarde |
| **les écrans** | Situations, Objectifs, Labels — ils ne filtrent rien, ils changent de page |

Les trois derniers étaient dans la barre du haut, où ils voisinaient avec des boutons qui
écrivent. Ils voisinent maintenant avec ce qu'ils sont : d'autres façons de regarder le même
domaine.

#### Trois champs de plus, et un qui manquait

`auteur:`, `mention:` et `activité:` complètent la grammaire.

**L'auteur n'est pas l'assigné.** Les deux se confondent souvent et divergent toujours au
moment où ça compte : on cherche ce qu'on a soi-même relevé, pas ce qu'on doit faire.

**La mention ne se déduit d'aucune colonne du sujet** : elle vient de ses messages. C'est la
seule lecture du rail dans ce cas, et c'est celle qui appelle une réponse.

**L'activité récente se lit sur ce qui a bougé en dernier**, pas sur la création : un sujet
ouvert il y a six mois et commenté hier a bougé, l'inverse n'est pas vrai. Quatorze jours, et
c'est un choix, pas une mesure — un chantier tient une réunion par semaine, deux semaines
couvrent les deux derniers comptes rendus. Sans date lisible, un sujet ne compte pas comme
récent : supposer qu'il l'est ferait remonter tout ce qu'on ne sait pas dater (règle 5).

#### Les filtres au bout de l'en-tête, avec le tri

Auteur, Labels, Situations, Objectifs, Assignés — dans l'ordre de la question qu'on se pose :
qui l'a ouvert, comment il est rangé, qui le traite. Ils sont **à gauche du bouton de tri**,
dans la même cellule : c'est la même famille de gestes — *ce que je regarde, et dans quel
ordre* — et les séparer ferait chercher l'un quand on a trouvé l'autre.

Le lot n'y est plus : il se déduit de l'assigné, et deux menus pour une même information font
chercher lequel est le bon.

#### Ce qui n'a pas marché, et pourquoi les tests ne l'ont pas vu

Le rail, la barre et les menus d'en-tête ont été livrés complets — chaque entrée portant sa
requête, chaque menu ses attributs — et **rien ne fonctionnait**. Le bouton de repli ne
repliait pas, les entrées du rail ne filtraient pas, les menus ne s'ouvraient pas, et le
tableau se retrouvait dans une bande de trois cents pixels.

Trois causes, et une quatrième qui les a laissées passer.

##### Les gestes ne pouvaient pas arriver

`quandOnClique` n'écoute que `.data-table-shell__head` et `.project-table-toolbar` — c'est sa
raison d'être, pour qu'un attribut homonyme d'un autre écran ne déclenche rien. **Le rail
n'en fait pas partie.** Ses clics n'étaient donc lus par personne.

Le bouton de repli vient du composant partagé, et son attribut aussi : c'est à l'écran qui
pose le rail de le brancher, et il ne l'était pas. Les menus d'en-tête, eux, n'avaient aucun
écouteur du tout : un menu sans son geste d'ouverture ne s'ouvre pas.

##### La grille comptait le rail deux fois

`.project-rail` est en **position fixe**. Ce n'est donc pas une colonne de grille : le contenu
s'écarte par une marge, comme dans la Mémoire. Écrire une grille par-dessus réservait la
largeur du rail une seconde fois, et le tableau tenait dans ce qui restait.

La structure est maintenant celle de la Mémoire à l'identique — `project-simple-page` +
`propositions-shell` + `project-rail-layout` — ce qui a supprimé les règles que j'avais
écrites plutôt que d'en ajouter.

##### Le test qui manquait

Tous les tests passaient. Ils vérifiaient que le balisage porte les bons attributs, et
c'était vrai. **Un balisage juste que nul ne lit a exactement l'air de marcher.**

Le défaut était que la décision « ce clic demande quoi ? » vivait dans un gestionnaire
d'événements, où elle ne s'exécute qu'avec un navigateur. Elle est sortie dans
`gestes-des-sujets.js`, pure — c'est le patron de `gesteDeLaTete`, écrit pour le même
problème —, et deux tests la confrontent au balisage : **chaque attribut que l'écran dessine
doit rendre un geste**.

Deux détails ont fait la différence entre un test qui attrape ça et un qui ne l'attrape pas :

- ne pas **sauter** ce qui n'est pas dans la liste des attributs écoutés — c'est justement ce
  qu'un renommage d'un seul côté produit ; ce qui n'est pas un geste est nommé, et tout le
  reste doit en être un ;
- chercher les attributs **sans le `=` final** : `data-project-rail-collapse` s'écrit nu,
  et l'exiger faisait manquer au test exactement le bouton qui ne marchait pas.

Les deux ont été trouvés en cassant : la première version du test ne tombait pas quand on
débranchait le repli.

#### Les vues : des recherches qu'on nomme et qu'on habille

Une épingle garde une requête. Une **vue** lui donne un nom, une icône, une couleur et une
phrase qui dit à quoi elle sert. La différence n'est pas cosmétique : une liste de douze
requêtes brutes ne se parcourt pas — on relit chacune pour retrouver celle qu'on cherche, et
l'on finit par n'en garder qu'une.

Le rail portait une phrase à leur place : « aucune vue épinglée, épinglez une recherche… ».
Elle occupait la place en permanence pour dire qu'il n'y avait rien, et n'offrait rien à
cliquer. **« Vues » est maintenant un endroit**, comme Situations, Objectifs et Labels : une
entrée qui mène à son écran, vide ou non, et c'est de là qu'on en crée une.

L'écran montre ce que chaque vue retient — sa requête est lisible sans l'ouvrir —, et le
formulaire met le **tableau des sujets sous lui** : on voit ce que la recherche rend pendant
qu'on l'écrit. Enregistrer une vue sans avoir vu ce qu'elle montre, c'est enregistrer une
promesse.

Trois colonnes de plus dans la table des épingles — `description`, `icon`, `color` — toutes
facultatives, et **aucune contrainte de base sur les noms d'icône ou de couleur** : ce sont
des noms d'un jeu qui vit dans le code, et une contrainte ici obligerait à migrer la base
chaque fois qu'on ajoute une icône. Le service les ramène à ce qu'il connaît — une valeur
inconnue devient l'icône par défaut, pas une case vide.

#### Une largeur de page, écrite une fois

Chaque écran choisissait la sienne : 1012 px ici, 1400 px là, rien ailleurs. Le tableau des
sujets s'est retrouvé borné à la largeur d'une page de texte, où il n'y avait plus la place
pour ses colonnes.

`.page-large` est cette largeur, et les écrans l'emploient au lieu d'en inventer une. Elle
s'adapte : pleine largeur tant que l'écran est étroit, bornée au-delà pour qu'une ligne ne
traverse pas deux mille pixels. Les 1400 px sont ceux que Paramètres employait déjà — on
reprend la valeur existante plutôt que d'en poser une neuvième.

#### Une seule recherche

Celle de la barre d'outils ne cherchait que dans les titres, sans grammaire et sans
s'épingler. La barre du tableau fait tout ce qu'elle faisait, et le reste. En garder deux
ferait taper dans l'une en regardant l'autre, et se demander pourquoi rien ne bouge.

#### Deux défauts trouvés en cassant

Le premier, dans le rail : un filtre dont le champ n'est pas déclaré **disparaît
silencieusement** de la requête écrite. « Les miens » sur un projet sans collaborateur
devenait donc `statut:ouvert` — le même que « Ouverts », deux lignes pour la même chose, dont
l'une ment sur ce qu'elle montre. Une lecture n'est proposée que si chacun de ses filtres a
un champ déclaré.

Le second, dans la liste : le statut était filtré **deux fois**, une fois par le service sur
le statut de la ligne, une fois par l'écran sur le statut *effectif*. Un sujet fermé par une
décision non encore versée disparaissait des deux listes à la fois. Le statut est maintenant
retiré de la requête avant d'être passé au service, qui ne connaît pas les décisions.

### Étape 8 — La proposition dit ce qui change vraiment *(faite)*

Une proposition qui liste trente sujets ne se relit pas : on fait défiler, on regarde les
trois premières, et on signe. **C'est exactement ce que le produit ne doit pas obtenir** — la
proposition existe pour qu'une décision soit prise, pas pour qu'elle soit ratifiée.

Le résumé est donc en tête de la discussion, avant même la description : *cette proposition
porterait : 2 sujets ouverts, 1 sujet fermé, 1 entreprise ajoutée, 12 labels posés*. Le détail
reste derrière, et on l'ouvre quand le résumé surprend.

#### L'ordre n'est pas celui des nombres

Douze labels posés passent après **une seule** entreprise ajoutée. Ouvrir un sujet engage
quelqu'un à le traiter ; ajouter une entreprise fait entrer des personnes réelles dans un
projet ; poser un label ne fait que ranger. Un résumé rangé par nombre mettrait les labels en
tête, et l'on signerait sans avoir vu la seule ligne qui compte.

Chaque ligne porte donc aussi **ce qu'elle engage**, en clair à côté du compte : un chiffre
sans conséquence se lit comme une statistique, et l'on ne se demande pas s'il est juste.

#### Ce qui compte, et ce qui ne compte pas

| | |
| --- | --- |
| **refusé** | ne compte pas — la ligne reste visible, c'est une décision, mais compter ce qu'on a refusé parmi ce qui va changer serait le contraire de ce qu'on cherche |
| **pas encore décidé** | compte, et se dit **à part** — c'est ce que la fusion écrira si l'on signe maintenant, et le taire ferait annoncer « rien ne change » sur une proposition qu'on n'a pas parcourue |
| **une nature inconnue** | compte comme une affirmation — la taire ferait annoncer moins de changements qu'il n'y en a (règle 5) |

La phrase reste **au conditionnel**, toujours : rien n'est écrit tant que personne n'a signé,
et un présent ferait croire que c'est fait.

---

### Étape 9 — « Transformer » écrit la proposition *(faite)*

Le bouton fait maintenant ce qu'il annonce :

    ranger le document → rédiger la proposition → aller la signer

**Le document d'abord.** Un point de chantier se vérifie en ouvrant la page d'où il sort ;
une proposition qui porterait des points sans leur compte rendu ne se relirait pas. Déposer
un fichier n'est pas verser en mémoire — c'est la matière première.

**Ensuite on propose, et rien de plus.** Ouvrir un sujet engage quelqu'un à le traiter :
c'est une décision, elle se signe (règle 1). La fusion ouvre ensuite ce qui a été coché,
ligne à ligne — ce qu'elle savait déjà faire pour `sujet` et `intervenant`.

#### Un document, un endroit

La transcription était déposée comme un **second fichier** — `CR_07.md` à côté de
`CR_07.pdf`. Commode à écrire, faux à lire : l'arbre des Fichiers montrait deux entrées pour
un seul document, et il fallait savoir laquelle ouvrir.

Le pas suivant l'aurait rangée dans `Mémoire/`, ce qui aurait été pire. `Mémoire/` n'est pas
un dossier où l'on dépose : c'est ce que le projet **sait**, calculé à partir de ses
affirmations. On aurait fini par confondre « garder un document » et « savoir quelque
chose » — les deux étant de la mémoire au sens courant du mot, et pas du tout au sens de
l'application.

Il n'y a donc qu'un endroit : **le document lui-même**. Le PDF est dans
`Documents / CR de chantier /`, sa transcription est sur sa ligne
(`documents.transcription_markdown`), et la politique de sécurité des documents s'applique
inchangée — qui peut lire le PDF peut lire sa transcription.

C'est **l'empreinte du texte** qui retrouve le document, pas son nom : le même compte rendu
s'appelle `CR_07.pdf` chez l'un et `07 - CR.pdf` chez l'autre, et deux comptes rendus
différents s'appellent tous deux `CR.pdf`.

#### Ce que la proposition porte, et ce que la fusion en fait

Elle ne portait d'abord que deux natures : le document, et les points neufs. C'était honnête
— la fusion ne savait rien faire des autres — mais cela vidait le procédé de son sens. Un
compte rendu de quarante points en donnait trois : **un compte rendu reporte**, et les
trente-sept autres n'allaient nulle part. Ni relance dans leur fil, ni label reposé, ni
échéance remise à jour. Le travail de secrétariat ne se faisait pas.

Les sept natures y sont maintenant, et chacune s'applique :

| nature | ce que la ligne engage |
| --- | --- |
| **le document** | il entre au corpus — c'est par lui que tout le reste se vérifie |
| **les lots** | ceux que le compte rendu nomme et que le projet n'a pas : ils s'ouvrent, ou s'activent |
| **les intervenants** | les sociétés nommées, posées par l'analyse du dépôt — seule à connaître les collaborateurs déjà au projet |
| **les labels** | `CR chantier` sur tout ce que le compte rendu touche, et les qualifications sur les points qui les portent |
| **les objectifs** | un jalon par date d'échéance, quand le projet ne l'a pas |
| **les points neufs** | un sujet chacun, avec son lot, son numéro, sa page et sa citation |
| **les points relancés** | une ligne d'activité dans le fil du sujet qui existe — datée, citée, avec sa page |

#### L'ordre n'est pas cosmétique

    les lots → les sociétés → les labels et les jalons → les sujets → les relances

Un sujet ne porte un label qu'existant, ne s'accroche qu'à un jalon existant, et une société
ne s'ajoute qu'à **un lot ouvert** — la base l'exige. Cet ordre obéit donc à des dépendances
de données, et il est écrit à un seul endroit, `appliquer-le-cr.js`. Le déduire de l'ordre
d'une liste d'affirmations — qui est un choix de présentation — ferait tenir une contrainte
de base par une convention d'écran (règle 4).

#### La relance est la nature qui manquait

Elle est distincte de l'ouverture, et pas par souci d'exactitude : **la première ouvre un
sujet, la seconde écrit dans un fil qui existe.** Les confondre ferait un second sujet au
même titre, et toute l'histoire d'avant resterait dans le premier — invisible à qui lit le
nouveau. C'est le défaut que la confrontation existe pour empêcher, et il se serait rejoué
là.

Ce qu'elle écrit est un **message**, pas un champ. Un sujet relancé n'a pas changé d'état :
il était ouvert, il le reste. Ce qui a changé est qu'une réunion de plus l'a redit — et cela
est une activité, datée et citée, qui se lit dans le fil à côté de ce que les gens en ont
dit. Dans un champ, elle serait remplacée à chaque compte rendu, et l'on perdrait justement
ce qu'on cherche : **depuis combien de réunions ce point est-il redit sans bouger.**

Deux conséquences en chaîne, trouvées en écrivant :

- **« Rien à ouvrir » n'est plus un refus.** Il barrait la route au cas le plus courant — la
  douzième réunion, qui n'ouvre aucun sujet et en reporte quarante. Le suivi s'arrêtait dès
  qu'il cessait d'être neuf.
- **L'écran de la proposition affichait ce que l'analyse recalculait, et rien d'autre.** Les
  affirmations déposées par l'Atelier n'y apparaissaient pas — et la fusion les appliquait
  pourtant. Signer ce qu'on ne voit pas est exactement ce que cet écran existe pour
  empêcher : il montre désormais les deux.

#### Un échec ne défait pas une signature

Les documents sont entrés, la mémoire est écrite : c'est fait. Un label qui ne se pose pas se
**dit** et n'emporte pas les suivants — sur quarante relances, en perdre trente-neuf parce
que la deuxième a échoué serait le pire des deux mondes. Et le silence est la bonne réponse
quand tout s'est fait : une notification à chaque fusion finit par ne plus être lue, et celle
qui compte se perd avec elle.

### Étape 10 — Le document se relit dans Fichiers *(à faire)*

La transcription est rangée, relue, et ne se repaie pas. **Elle ne s'affiche nulle part.**

Ce qu'il faut : ouvrir un PDF dans Fichiers donne le cadre de l'Atelier — *Aperçu*, *Code*,
*Origine* — plus un onglet **PDF** qui rend la main au lecteur existant, avec son zoom et sa
rotation. Tout est là pour l'écrire : le Markdown porte ses marqueurs `<!-- page 3 -->`, donc
la lecture « Origine » tient ; `pagesDuFichierMarkdown` les relit déjà ; le lecteur de PDF
existe.

Ce qui ne sera **pas** là : les mesures de l'Atelier — mots retrouvés, titres inventés,
pages refaites. Elles se calculent en comparant au PDF au moment de la lecture, et ne sont
pas rangées. Les afficher demanderait de les ranger aussi, ce qui figerait une mesure qui
doit se refaire à chaque version du procédé (règle 4).

---

---

## Où en est le plan

Neuf étapes écrites : le procédé va maintenant du dépôt d'un PDF à une proposition qu'on
signe, et **tout ce que le compte rendu dit entre à la signature** — les lots, les sociétés,
les labels, les jalons, les sujets neufs, et la ligne d'activité de chaque sujet reporté. La
dixième — relire le document dans Fichiers — reste à faire, et c'est du confort, non plus du
procédé.

Le reste n'est plus du plan mais de l'usage : déposer des comptes rendus réels, regarder ce
que les mesures disent, et corriger ce qu'elles montrent.

Trois choses ont changé de nature en chemin, et méritent d'être retenues :

- **une disparition ferme, au lieu de poser une question** — parce que la fermeture se défait
  toute seule au compte rendu suivant, et que c'est cette réversibilité qui la rend
  acceptable ;
- **une situation se propose, au lieu de se créer** — parce que rien n'entre directement dans
  la mémoire du projet, pas même ce qui ne fait que ranger ;
- **un point reporté est une nature à lui seul** — parce qu'un compte rendu reporte, et qu'un
  procédé qui ne traiterait que le neuf laisserait trente-sept points sur quarante sans trace
  de la réunion qui vient de les redire.

Les deux ont été trouvées en écrivant l'étape, pas en la planifiant.

---

## Ce que cet ordre refuse

**De commencer par l'écran.** Les filtres et le rail latéral sont ce qu'on voit, donc ce
qu'on a envie de faire d'abord. Mais filtrer sur des labels qui n'existent pas ne sert à
rien.

**De tout mettre dans un seul appel.** Un appel qui transcrirait, classerait et raisonnerait
d'un coup coûterait le prix du plus cher des trois sur la totalité du document, et son
résultat serait invérifiable : on ne saurait plus si une erreur vient de la lecture ou du
jugement.

**De fermer un sujet sans le dire.** L'étape 4 ferme sur une disparition, mais la proposition
écrit que c'est une déduction, et que le prochain compte rendu la défera. Fermer en silence
serait l'inverse.

---

## Ce qui reste ouvert

**La fiabilité de la structure implicite.** L'étape 1 demande au modèle de rendre explicite
ce que le document sous-entend. C'est un jugement, pas une transcription — et les mesures
actuelles ne le vérifient pas. Il faudra sans doute une mesure de plus : le nombre de niveaux
d'imbrication, comparé d'une version à l'autre.

**Le second fournisseur.** Trois appels, un seul fournisseur : voir
[`a-traiter-plus-tard.md`](a-traiter-plus-tard.md).

**Les modèles à venir.** Chaque étape se rejouera avec les mêmes documents et les mêmes
chiffres. Voir [`reconstituer-un-document.md`](reconstituer-un-document.md) §5.
