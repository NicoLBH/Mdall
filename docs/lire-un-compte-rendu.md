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

Un dossier portant le nom du PDF, contenant le PDF et le `.md`.

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

### Étape 4 — Fermer un sujet, et la question de fond

**C'est le point le plus délicat de tout le plan**, et il mérite d'être traité à part.

Comment sait-on qu'un point est réglé ? Trois signes, et ils ne se valent pas :

| Signe | Ce qu'il vaut |
| --- | --- |
| Le point porte « fait », « soldé », « levé » | **une réponse** — le document le dit |
| Le point est barré | **une réponse**, si la mise en forme a survécu à la transcription |
| Le point a disparu du compte rendu | **une question, pas une réponse** |

La disparition est traître. Un point peut sortir d'un compte rendu parce qu'il est réglé,
parce que le rédacteur l'a oublié, parce que le lot n'était pas convoqué cette semaine, ou
parce que le document a changé de trame. **Fermer sur ce seul signe perdrait des points
qu'on suit depuis des mois.**

La règle sera donc : une disparition ne ferme rien, elle **pose une question**. Elle
s'affiche comme telle dans la proposition — « ce sujet n'apparaît plus depuis deux comptes
rendus, est-il réglé ? » — et c'est quelqu'un qui répond. Les deux autres signes proposent
une fermeture, avec la phrase qui la justifie.

### Étape 5 — Les liens entre sujets

Troisième appel, sur un modèle plus capable, et **seulement s'il y a de quoi raisonner**.

- **La hiérarchie** : un compte rendu groupe ses points par lot et par entreprise. « Lot 10 —
  Charpente — LP CHARPENTE » est un sujet père, les points de ce lot sont ses fils.
- **Les liens fonctionnels** : « bloqué par », quand le document l'énonce — « en attente de
  la dépose de la dalle » .

Un appel à part, parce que raisonner sur des relations demande davantage que du secrétariat,
et qu'on ne veut pas payer ce prix-là sur tout le document.

### Étape 6 — La situation qui se crée toute seule

Dès qu'au moins deux sujets ouverts portent le label « CR chantier », une situation se crée,
fondée sur le filtre `label = CR chantier`.

C'est le premier endroit où la chaîne **rend quelque chose à l'humain sans qu'il l'ait
demandé** : un tableau de suivi apparaît, tenu à jour par les dépôts suivants.

### Étape 7 — L'écran des sujets, pour s'y retrouver

Rien de ce qui précède ne sert si le tableau des sujets ne sait pas filtrer.

- des filtres dans le tableau : assigné à, labels, lot, objectif ;
- un rail latéral avec les filtres les plus courants ;
- des recherches qu'on épingle — **le même bouton et la même logique d'affichage que
  l'onglet Mémoire**, qui les a déjà.

### Étape 8 — La proposition dit ce qui change vraiment

Une proposition qui liste trente sujets ne se relit pas. Elle doit dire **ce qui bouge** :
tant de sujets ouverts, tant fermés, tant de labels posés, un lot ajouté, deux objectifs
datés — et le détail derrière.

C'est la dernière étape parce qu'elle a besoin de connaître toutes les natures de changement
que les étapes précédentes produisent.

---

## Ce que cet ordre refuse

**De commencer par l'écran.** Les filtres et le rail latéral sont ce qu'on voit, donc ce
qu'on a envie de faire d'abord. Mais filtrer sur des labels qui n'existent pas ne sert à
rien.

**De tout mettre dans un seul appel.** Un appel qui transcrirait, classerait et raisonnerait
d'un coup coûterait le prix du plus cher des trois sur la totalité du document, et son
résultat serait invérifiable : on ne saurait plus si une erreur vient de la lecture ou du
jugement.

**De fermer un sujet automatiquement.** Voir l'étape 4.

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
