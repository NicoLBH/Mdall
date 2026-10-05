# Analyse de documents

## Une démarche, trois utilitaires

Les mails, les comptes rendus de chantier et les rapports de bureau de contrôle
font **la même démarche** :

```
aller les chercher dans Fichiers — c'est par les mails que presque tout arrive
  → choisir ceux qu'on veut analyser
    → lire
      → décider d'en faire une proposition, et verser en mémoire
```

Trois utilitaires pour une démarche, c'était trois accueils, trois tableaux, trois
façons de rouvrir une analyse. Et surtout : **aucune vue d'ensemble**. La question
« qu'est-ce qui a déjà été analysé sur ce chantier ? » n'avait de réponse nulle
part, alors que c'est la première qu'on se pose en arrivant.

## Le rail, et ce qu'il filtre

À gauche, la coque commune — celle des Actions, de la Mémoire, des Sujets et de
l'Accueil :

- **Tous les documents** — la vue d'ensemble, et celle sur laquelle on atterrit ;
- **Mails**
- **Bureau de Contrôle**
- **CR chantier**

Les trois familles viennent dans l'ordre par lequel les documents arrivent sur un
chantier : les mails d'abord. Ranger par ordre alphabétique mettrait le bureau de
contrôle en tête, ce qui ne correspond à rien de l'usage.

**Le compte va avec le nom.** « Mails 0 » dit, *avant* le clic, qu'il n'y a rien à
y voir — c'est la règle du rail des Actions, et elle vaut ici pour la même raison.

## Ce qui est commun, et ce qui ne l'est pas

Les trois familles se **listent** pareil : un titre, un repère, une date, ce que la
lecture a valu, et combien de fois on l'a relue. C'est ce que `les-documents-analyses.js`
normalise.

Elles ne se **lisent** pas pareil du tout, et c'est voulu :

| famille | ce que le détail montre |
|---|---|
| Mails | les prises de position — qui a constaté quoi, qui s'est engagé, pour quand — puis les idées, puis le fil replié |
| Bureau de Contrôle | les trois étapes, la légende, les avis avec leur marque résolue, puis **ce que chaque avis est devenu** d'un rapport au suivant |
| CR chantier | le chemin existant : la restitution en Markdown, les points relevés, leur confrontation aux sujets du chantier |

Une vue commune aurait dit « 3 éléments » des trois, ce qui ne renseigne sur
aucune. Un compte rendu a des points rapprochés des sujets ; un rapport a des avis
et une légende ; un fil a des prises de position, qui n'existent nulle part
ailleurs.

### La coquille, elle, est la même

Ce qui **entoure** le détail ne dépend pas de la famille, et divergeait pourtant :

- **la flèche de retour** — elle était dans l'en-tête à côté du titre pour un
  compte rendu rouvert, et sur une ligne à elle, au-dessus du nom du document,
  pour les deux autres familles. Deux sorties pour un même geste ;
- **l'encart « Le document »** — `views/ui/lidentite-dun-document.js`. Le détail
  d'un rapport ouvrait sur une ligne de mesures en petites capitales — « 2 pages
  • 2 607 caractères • 0 avis » — sans dire de quel fichier ni de quel jour il
  parlait. Les faits, eux, restent propres à la famille : numéro et date de
  réunion pour un compte rendu, référence et date d'émission pour un rapport ;
- **la barre d'onglets** — `light-tabs`, la même qu'ailleurs. Un rapport en a
  deux, Restitution et Analyse ; il n'a pas de Synthèse, parce qu'il ne relève
  pas d'idées et qu'un onglet vide fait chercher ce qui manque (règle 5).

La transcription en Markdown a ainsi quitté le `<details>` replié où elle
terminait le détail. C'est le document que le modèle a relu pour relever les
avis : c'est à lui qu'on confronte un avis qui surprend, et personne ne
l'ouvrait.

### Une seule zone de dépôt, trois phrases

Le bureau de contrôle avait la sienne, écrite à la main : bordure pleine au lieu de
pointillés, bouton vert, aide ailleurs, et une liste d'extensions à elle. Deux
zones pour le même geste se ressemblaient de moins en moins (règle 4). C'est celle
du compte rendu qui reste, et chaque famille lui passe ses mots, par son entrée
`laZone` du registre :

| famille | ce que la zone dit | depuis le disque | ce qu'elle accepte |
| --- | --- | --- | --- |
| CR chantier | « Déposez un compte rendu, ou choisissez-le. » | oui | `.pdf` + tout ce qui se lit comme du texte |
| Bureau de contrôle | « Choisissez des rapports de bureau de contrôle. » | non | — |
| Mails | « Déposez des mails, ou choisissez-les. » | oui | ce qui porte des mails |

**Et les listes d'extensions ne s'écrivent plus là.** Il y en avait trois pour une
seule question — « ce fichier se lit-il ? » : la liste du registre, celle de
l'écran, et celle du lecteur. Elles viennent maintenant toutes de celui qui lit :
les textes de `lire-un-fichier-texte.js`, les porteurs de mails de
`le-dossier-des-mails.js`. Une épreuve vérifie qu'**aucune famille n'annonce une
extension que personne ne sait ouvrir**, et qu'aucune n'en oublie une que son
lecteur ouvre — rétrécir une liste est aussi faux que l'élargir, et plus difficile
à voir : le sélecteur s'ouvre, le dossier paraît vide.

**Les mesures aussi restent propres à leur famille.** « 12 » ne dit rien ;
« 12 points » sous un compte rendu et « 12 avis » sous un rapport ne parlent pas de
la même chose, et une colonne qui dirait « 12 » pour les deux ferait croire
qu'elles se comparent.

## Trois décisions qui tiennent la liste

**La date est celle du document, pas celle de l'analyse.** On cherche « le compte
rendu du 16 avril », jamais « celui que j'ai lu mardi ». La date de lecture est
gardée à part — c'est elle qui ordonne la vue d'ensemble, parce que trois familles
dont les dates ne veulent pas dire la même chose ne se rangent pas autrement.

**Le groupement n'est pas refait ici.** Chaque famille arrive déjà groupée par
`lesFilsLus`, `lesComptesRendusLus` et `lesRapportsLus`, qui savent ce qu'« un même
document » veut dire chez elles — un fil par objet, un compte rendu par ligne de
Fichiers, un rapport par nom. En refaire une quatrième définition en aurait fait la
plus mal informée des quatre (règle 4).

**Un seul nom pour le nombre de lectures.** Les comptes rendus et les fils
comptaient `relectures`, les rapports `combien` : le même nombre sous deux noms,
dans trois modules écrits à trois rounds d'intervalle. Il s'appelle `combien`, une
fois (règle 10).

## Trois états, et non deux

« On n'a pas encore demandé », « on attend la réponse » et « on n'a pas su lire »
ne se disent pas pareil.

Rendre l'échec par défaut ferait clignoter une panne à chaque ouverture d'écran,
avant même que la demande parte. Rendre un tableau vide ferait croire que rien n'a
jamais été analysé, et l'on recommencerait une lecture déjà payée (règle 5).

Les trois listes sont demandées **en parallèle** : ce sont trois tables distinctes
et trois requêtes indépendantes, les enchaîner triplerait l'attente pour rien. Une
famille injoignable laisse la sienne à `null` et les deux autres s'affichent —
perdre la vue d'ensemble parce qu'une table est muette serait un mauvais échange.

## Un seul chemin de lecture, et il passe par la file

Les trois familles lisaient de trois façons. Les comptes rendus et les mails
passaient par une **file au serveur** — on lance, on rend la main, Actions montre
où cela en est. Les rapports de contrôle se lisaient dans le navigateur : trois
appels au modèle enchaînés dans un onglet qu'il ne fallait pas fermer, un lot de
trente perdu en changeant d'écran, et rien dans Actions puisqu'il n'y avait pas de
ligne de file à montrer.

```
choisir dans Fichiers  →  une ligne dans `versements`, avec le geste de la famille
                       →  la fonction de bord de ce geste la prend
                       →  la lecture est conservée
```

**Le geste est la clé de la famille.** Celui qu'on écrit dans `versements`, celui
que la fonction de bord cherche, celui que le rail pose dans son attribut : un seul
mot, du clic jusqu'à la ligne de file. Il y en avait deux — l'écran disait `cr`, la
file disait `comptes_rendus` — et c'est la divergence qui attendait son tour
(règle 10).

### Le même orchestrateur des deux côtés

`lire-un-rapport.js` enchaîne les trois étapes et reçoit ses trois appels. L'écran
lui donnait les trois services du navigateur ; la fonction de bord lui donne les
trois fonctions de bord. Une seconde orchestration au serveur aurait lu un rapport
autrement sans que rien ne le dise (règle 4) — et celle-ci est éprouvée par
`npm test`, échecs d'étape compris.

## Un fil de mails ne passe pas par la file, et c'est voulu

C'est la seule famille qui déroge, et la raison tient en une phrase : **un fil est
un appel, pas un lot.**

Les comptes rendus et les rapports sont lus **un par un**. Dix-neuf comptes rendus
sont dix-neuf appels au modèle, des minutes chacun : c'est ce qui a fait la file —
on lance, on ferme l'onglet, Actions dit où cela en est. Un fil de sept mails est
**un seul appel** : les sept messages montent ensemble, et le modèle les lit en
une fois parce que c'est leur enchaînement qui porte le sens.

Le dépliage des `.msg`, `.eml` et `.zip`, lui, est gratuit dans le navigateur — il
ne parle à personne et ne coûte rien. Poser une ligne de file pour un appel de
quelques secondes ajouterait un aller-retour, une ligne dans Actions à relire, et
une reprise à écrire, pour ne rien gagner (règle 12).

**Ce qui ferait changer d'avis** : un fil assez gros pour devoir se découper en
plusieurs appels. Il faudrait alors une file, et ce serait la même.

```
choisir des mails dans Fichiers  →  les octets se lisent
                                 →  chaque fichier rend ses messages (dépliés sur place)
                                 →  UN relevé pour tout le fil
                                 →  la lecture est conservée
```

Trois précisions que `lire-un-fil-de-mails.js` tient, et qui sont éprouvées :

- **un document qu'on n'a pas su descendre ne fait pas couler le fil.** Il se
  compte, et son nombre se dit : un fil lu à six messages sur sept doit se savoir,
  sinon on conclut sur un fil qu'on croit entier (règle 5) ;
- **un relevé qui échoue ne garde rien.** Conserver une lecture vide ferait croire
  le fil lu, et personne ne le relancerait (règle 6) ;
- **le chooser demande au registre ce que chaque famille sait lire.** `accepte`
  *est* cette liste ; en tenir une seconde dans le chooser aurait fait diverger les
  deux au premier format nouveau (règle 10).

Et le bouton dit « Lire 7 mails », non « Lire 7 fils » : c'est `quoiAuChoix` du
registre — au moment du choix on désigne des mails, c'est à l'arrivée qu'ils font
un fil.

### Le geste s'inscrit au journal, même sans file

> « Quand je clique sur lire 5 mails, il ne se passe rien, je ne vois rien non
> plus dans Actions. »

Les deux moitiés étaient vraies, et pour deux raisons différentes.

**À l'écran**, la phrase de fin lisait `lu.fil`, que rien de ce module ne rend —
le fil vit sous `lu.vue`. Chaque lecture **réussie** annonçait donc « 0 message
lu », ce qui se lit « il ne s'est rien passé ». L'épreuve d'à côté passait
pourtant le vrai objet : elle ne regardait que la phrase des mails manquants. Un
compte qu'aucune épreuve ne lit peut valoir n'importe quoi, et celui-ci valait
zéro depuis le premier jour (règle 5).

**Dans Actions**, il n'y avait rien du tout. Un fil ne prend pas la file — c'est
un appel, pas un lot —, et l'on en avait conclu qu'il n'avait rien à laisser.
C'était une confusion : **la file dit ce qui se passe, le journal dit ce qui
s'est passé**. Ne pas prendre l'une n'est pas une raison de ne rien laisser à
l'autre. On cliquait, on payait un appel, une lecture se rangeait, et l'onglet qui
raconte ce que le chantier a fait n'en disait pas un mot.

Une ligne de `project_runs` est donc écrite — **y compris sur un échec**, parce
qu'un appel payé qui n'aboutit pas est exactement le chiffre qu'on cherche quand
on se demande pourquoi la facture monte (fondamental 13).

Elle porte un geste **à elle**, `lecture_de_fil`, et non `mails` : ce mot-là est
celui du **dépôt**, qui fait entrer de la matière et se range en « Versements ».
Lire un fil relit ce qui est déjà là — c'est un essai, donc l'Atelier, la même
règle que pour les comptes rendus. Le registre le déclare à côté de la famille,
et `run-partition.js` le lit de là (règle 10).

### Le fil déduplique, et un jeu d'essai doit le savoir

Trois copies du même message ne font pas trois messages : c'est pour cela que le
fil a été écrit. Un jeu d'essai où les mails ne diffèrent que par leur **nom**
rendait donc un fil à un seul message — et une épreuve qui aurait compté les
messages l'aurait trouvé à un sans que ce soit un défaut du code. Les mails du
jeu d'essai portent désormais des dates et des corps distincts.

## Ajouter une famille — un plan, un cartouche, une notice

C'est le point du registre `les-familles-de-document.js`. Il faut, et il suffit :

1. **une entrée** — un geste, un nom, un titre, une icône, le nom nu de ce qu'on
   lit, ce qu'elle accepte, et le nom de sa fonction de bord ;
2. **une fonction de bord** de ce nom, qui appelle `viderLaFile` avec le geste et
   une fonction qui sait lire **un** document de cette famille. La mécanique —
   prendre la ligne, la marquer, reprendre, tenir le budget, se rappeler,
   consigner, refermer — est commune et déjà éprouvée ; `lire-les-rapports` est le
   patron, et il ne reste presque rien à écrire ;
3. **une table** où sa lecture se garde, et un service pur qui dit ce qu'elle
   garde — comme `la-lecture-dun-rapport.js` le fait pour les rapports.

Rien à changer dans le rail, ni dans le tableau, ni dans le lancement : ils lisent
tous le registre. **La colonne `geste` de `versements` est un `text` libre, sans
contrainte : une famille de plus ne demande aucune migration de la file.**

Deux épreuves gardent ce chemin : l'une vérifie que chaque fonction déclarée
**existe pour de bon** — un réveil envoyé à un nom que personne ne sert ne rend
aucune erreur, il ne fait rien, et la file reste bloquée sans que l'écran sache
pourquoi —, l'autre que chaque icône existe dans la planche.

## La mécanique de file, écrite une fois

Elle était recopiée : prendre la plus ancienne ligne qui attend, la marquer prise
avant de travailler, reprendre ce qui était en vol après une coupure, tenir un
budget, se rappeler soi-même, consigner la course, refermer la ligne — sept
décisions, dans `lire-les-comptes-rendus` et de nouveau dans `lire-les-rapports`.

Ce n'était pas le volume qui coûtait. C'est qu'une correction portée sur l'une ne
touchait pas l'autre : le défaut « ce qui était en vol réattend » — une file qui
finissait « 18 lus sur 19 » sans que le dix-neuvième apparaisse nulle part —
n'avait été corrigé que du côté des comptes rendus (règle 4).

Elle tient maintenant à deux endroits, séparés par ce qu'on sait éprouver :

| où | quoi | éprouvé par |
| --- | --- | --- |
| `services/la-file-dun-geste.js` | la mécanique, **pure**, portes injectées | `npm test`, 34 épreuves |
| `_shared/la-file-au-serveur.ts` | les six requêtes à `versements` et `project_runs` | la relecture de source |

C'est ce découpage qui lève le risque qu'on avait nommé au round précédent :
porter une file qui marche sur une mécanique neuve qu'on ne peut essayer qu'en
production. Les portes étant injectées, l'ordre des écritures, la reprise, le
budget épuisé et l'échec d'un document au milieu d'un lot se rejouent en une
milliseconde — chacun de ces défauts a coûté un aller-retour en production avant.

Chaque fonction de bord ne garde que ce qui lui est propre :

```
lire-les-rapports        → lireUn : ouvrir le PDF, l'orchestrer, conserver la lecture
lire-les-comptes-rendus  → lireUn : lire le document ; apresChaque : porter dans la proposition
```

**`apresChaque`, et non `lireUn`.** Les lectures se font de front, les ajouts à la
proposition en file : deux ajouts simultanés relisent le même état et écrivent les
mêmes lignes deux fois. La mécanique le garantit, et une épreuve vérifie que la
lecture des comptes rendus n'a pas glissé son ajout du mauvais côté.

**`emporte`** est ce qu'une famille traîne d'un document au suivant — la
proposition, ouverte au premier et enrichie ensuite. La mécanique ne sait pas ce
que c'est ; les portes savent qu'elle s'écrit dans `proposition_id`. Un rapport de
contrôle n'emporte rien : sa lecture se conserve, et c'est tout (règle 1).

**`verser-les-mails` reste dehors.** Sa file n'a ni pas par document ni
proposition : la plier là-dedans ferait porter à la mécanique commune un cas
qu'elle seule emploierait.

Les mots de la course viennent du registre — titre, phrase de clôture, nom de
l'étape, pluriel de ce qu'on compte. « Lecture de 3 rapports de bureau de
contrôle » et « Lecture de 3 comptes rendus de chantier » sont la même structure
autour de deux entrées de `les-familles-de-document.js`.

## Ce que devient un avis de bureau de contrôle

Le détail d'un rapport montrait les avis **de ce rapport-là**, et s'arrêtait là :
« 23 suspendus » sans savoir si c'étaient les mêmes qu'au rapport précédent, ni
lesquels avaient été levés depuis. C'est pourtant la question qu'on pose à un
dossier de contrôle, et elle ne vivait que dans l'utilitaire **Suivi des avis
BC** — qui existe toujours, à l'Atelier, rayon Développements : il relit le
corpus entier avec son moteur de continuité, et ce round ne lui retire rien.

Ce que l'onglet Analyse pose maintenant sous les avis du rapport est reconstruit
**à partir des lectures déjà conservées** (`le-devenir-dun-avis.js`). Rien n'est
relu, rien n'est redemandé à un modèle : la chronologie et le devenir de chaque
avis se déduisent de ce qui est en base.

```
les lectures de rapports du chantier
  → rangées par date d'émission        (et non par date de lecture)
  → chaque avis suivi par sa référence (et jamais par son intitulé)
  → soulevé · redit · levé · rouvert   (étape par étape)
  → ouvert · fermé · rouvert           (au bout du compte)
```

### Trois vocabulaires, et on ne les mélange pas

C'est la leçon de l'ancien écran, reprise telle quelle : **l'appréciation**
— favorable, suspendu, défavorable — est le jugement du bureau de contrôle et
n'appartient qu'au document qui l'a écrit ; **ce qu'un rapport apporte** ne vaut
que pour ce rapport-là ; **la vie de l'avis** dit s'il reste quelque chose à
faire, et prend les couleurs des sujets Mdall. Un avis étiqueté « Levé » sur fond
violet empruntait au deuxième vocabulaire la couleur du premier.

Les tables qui classent une appréciation vivaient dans l'écran de suivi. Les deux
écrans les tiennent maintenant du même module : deux tables auraient fini par
ranger « NC » de deux façons, et c'est la vue la moins relue qui serait restée
fausse (règle 4).

### Ce qu'il refuse de conclure

Deux conclusions de trop, et chacune donne un dossier « 0 avis ouvert » obtenu
par oubli :

- **un avis dont plus personne ne parle est sans nouvelles, pas levé.** Personne
  ne l'a refermé ; il a cessé de paraître, ce qui est une question. Il est signalé
  comme tel, avec la date du dernier rapport qui l'a dit ;
- **un rapport dont les avis n'ont pas été relevés ne fait taire personne.**
  L'étape n'a pas eu lieu : il n'a pas été interrogé. Les rapports muets se
  comptent à part, comme ceux dont la date d'émission n'a pas été lue — qui ne
  peuvent pas se placer dans la suite (règle 5).

Un avis **sans numéro** ne se suit pas d'un rapport à l'autre : deux lignes qui se
ressemblent dans deux rapports ne sont pas la même question, et les confondre
inventerait une levée. Ils restent dans la liste de leur rapport, et se comptent.

## Les deux écrans du bureau de contrôle, et le défaut qui les a vidés tous les deux

Pendant plusieurs rounds, ni **Analyse de documents › Bureau de Contrôle** ni
**Suivi des avis BC** ne montraient quoi que ce soit : ni avis, ni chronologie,
ni retour arrière, ni jalons, ni complétude, ni indicateurs. Deux causes sans
rapport l'une avec l'autre, et aucune ne levait : toutes deux rendaient un écran
**vide**, et un écran vide se lit « ce chantier n'a rien ».

### 1. Le relevé des avis partait dans la mauvaise forme

`extract-avis` vérifie chaque avis contre le texte du document, puis rendait les
rescapés dans la forme du **moteur de continuité** — `title_raw`,
`value.opinion_raw`, `provenance.page`. Or la lecture d'un rapport garde la forme
du **document** — `reference`, `intitule`, `teneur`. Aucun des noms ne se
rencontrait : `unAvisReleve` rendait `null` pour chacun, et **tous** les avis
étaient jetés en silence.

```
le modèle rend     { reference, intitule, teneur, constat, page, citation }
la porte vérifie   → les mêmes, moins ceux qu'elle n'a pas retrouvés
extract-avis rend  { title_raw, value: { opinion_raw }, provenance: { page } }   ← ici
la lecture cherche { reference, intitule, teneur }                              ← et là
la lecture garde   rien
```

L'écran affichait « Aucun avis relevé dans ce rapport » sur un rapport qui en
portait vingt-trois. Et comme la **référence du rapport et sa date d'émission**
arrivent par le même relevé, le rapport y perdait aussi sa place dans la
chronologie du dossier : un décalage de noms, quatre écrans muets.

**Pourquoi aucune épreuve ne l'a vu.** Les deux côtés étaient éprouvés, chacun
sur *son* jeu d'essai — celui de la lecture lui donnait des avis dans la forme
qu'elle attendait, c'est-à-dire qu'il recopiait l'hypothèse du code au lieu de la
mettre à l'épreuve. Personne ne branchait la sortie de l'un sur l'entrée de
l'autre. C'est ce que fait maintenant `les-avis-du-serveur.test.mjs`, et il
n'invente aucune forme : il appelle les fonctions réelles des deux bouts.

Le serveur rend désormais les deux formes — `avis` dans les mots du document,
`avis_moteur` pour le versement du suivi, toutes deux issues du **même** relevé
vérifié —, et la lecture accepte l'une comme l'autre : une fonction de bord et un
navigateur ne se déploient pas à la même seconde, et aucune de ces secondes-là ne
doit reperdre un relevé payé.

### 2. Le suivi cherchait son corpus à une porte qu'on n'emprunte plus

Son corpus était : les documents du projet que la reconnaissance a marqués
`ct_report`, **et** qu'une proposition acceptée a fait entrer. C'était vrai du
temps où l'on déposait ses rapports par sa propre porte.

Depuis, les rapports arrivent par Analyse de documents : on les choisit dans
Fichiers, le serveur les lit, la lecture se conserve. Rien dans ce chemin ne leur
pose la marque `ct_report`. Le suivi ne trouvait donc aucun corpus, **sortait
avant d'analyser**, et tout ce qu'il sait faire restait invisible.

`le-corpus-du-suivi.js` décide maintenant ce corpus, et les deux portes s'y
**réunissent** plutôt que de se remplacer — un chantier peut avoir d'anciens
rapports entrés par l'ancienne porte et des rapports lus depuis, et n'en prendre
qu'une moitié fabriquerait une chronologie trouée, ce que cet écran existe
précisément pour montrer. L'écran dit d'où vient son lot, et dit quand une
lecture ne retrouve pas son document.

### Ce que chaque écran répond

| | Analyse de documents › Bureau de Contrôle | Suivi des avis BC |
| --- | --- | --- |
| la question | ce que **ce rapport** dit, et ce que chaque avis est devenu | où en est **le dossier** |
| la matière | les lectures déjà conservées | les PDF du corpus, relus par le moteur de continuité |
| le coût | aucun appel au modèle | aucun appel au modèle, mais un rapatriement des PDF |
| ce qu'on y voit | les étapes, la légende, les avis, la frise de chaque avis | la chronologie, le retour arrière à une date, les jalons, la complétude, les indicateurs |

Les deux se renvoient l'un à l'autre par un bouton : on passait de l'un à l'autre
en se souvenant que l'autre existe.

### Ce qu'il faut savoir des lectures déjà faites

Les lectures conservées **avant** cette correction portent `avis: []` : leurs
avis ont été jetés au moment de la lecture, et rien ne peut les retrouver
après coup. Il faut relire ces rapports une fois. Un rapport dont tous les avis
ont été écartés par la porte le dit maintenant à l'écran, au lieu de passer pour
un rapport muet — les deux appellent des gestes opposés : un rapport muet se
classe, un rapport mal lu se relit.

## L'écran appartient au chantier ouvert, et à lui seul

On affichait la liste des documents d'un chantier, on changeait de chantier dans
l'en-tête, et **la liste de l'ancien restait à l'écran**. Il fallait recharger la
page au navigateur. Ce n'est pas un retard d'affichage : c'est l'écran qui
présentait les documents d'un chantier sous le nom d'un autre, ce qui est la pire
forme du défaut — on y aurait relancé une lecture, ouvert un rapport, décidé
quelque chose (règle 5).

La cause : l'état de l'écran vivait au niveau du module, posé une fois au
chargement, et **personne n'en était propriétaire**. Dix-sept champs — la famille
ouverte, le document ouvert, les lectures lues, le filtre, les coches, le lancé,
la file — et aucun endroit qui les remette à neuf.

Deux corrections, et pas une remise à zéro écrite à la main :

1. **l'état naît d'une fabrique.** `unEtatNeuf()` rend l'objet entier ; changer de
   chantier le rappelle. Une remise à zéro champ par champ aurait oublié celui
   qu'on ajoute au round suivant, et l'aurait oublié en silence (règle 4) ;
2. **la décision est pure.** `leChantierAChange(connu, ici)` ne touche rien et
   s'éprouve : un premier affichage n'est **pas** un changement — sinon l'écran
   repartirait de zéro à chaque redessin —, et un chantier qu'on ne sait pas
   nommer non plus, car ne pas savoir n'est pas savoir que c'est un autre.

**Et une réponse qui revient en retard ne s'installe plus.** Les quatre requêtes
partent pour un chantier donné ; avant d'écrire ce qu'elles rapportent, on vérifie
qu'on est toujours sur celui-là. Sans cela, la fabrique ferait son travail et la
réponse de l'ancien chantier se reposerait par-dessus une demi-seconde plus tard.

## Ce qui attend, et ce qui est analysé

Le tableau ne montrait que les lectures **conservées**. Un document qu'on venait
d'envoyer au serveur n'y figurait nulle part : il disparaissait de l'écran entre
le clic et le retour de la lecture, c'est-à-dire pendant les minutes où l'on se
demande justement ce qui se passe. Et une lecture qui avait **échoué** ne
reparaissait jamais : rien ne la distinguait d'un document qu'on n'avait jamais
choisi.

La file des `versements` répond à cela, et c'est elle qu'on lit — une quatrième
requête, en parallèle des trois autres. « En attente » veut donc dire **une
lecture lancée qui n'est pas revenue** : elle attend son tour, elle tourne, ou elle
n'a pas abouti. Ce n'est pas « tous les documents du chantier qu'on n'a jamais
analysés » — ce compte-là se chiffre en centaines et ne dit rien à personne.

```
versements (en_attente · en_cours · echec)   →  ce qui attend
les trois tables de lectures conservées      →  ce qui est analysé
                                             →  un seul tableau, l'attente d'abord
```

**L'attente d'abord**, et c'est le seul ordre défendable : c'est la seule part sur
laquelle on peut encore agir. Les analysés suivent, par date de lecture.

**Un document déjà analysé n'attend plus**, même si une ligne de file le nomme
encore — une file abandonnée en route, ou une relecture lancée sur un document
déjà lu, le ferait sinon paraître dans les deux comptes. Et un pas `lu` de la file
ne compte pas : sa lecture est conservée, c'est elle qu'on ouvre.

### Le badge, et les pastilles

**Un badge par ligne**, à côté du titre : bleu « Analysé », attention « En
attente ». Il se lit *avant* d'avoir parcouru la ligne, qui est le moment où l'on
décide de cliquer. Une colonne de plus l'aurait mis après. La colonne de droite,
elle, dit ce que la lecture a **valu** — « 12 avis », « 7 messages » ; l'état n'est
pas une mesure, c'est ce qui dit si la mesure existe.

**Un document qui attend ne s'ouvre pas** : il n'a pas d'analyse à montrer. Son
titre reste du texte, et le badge dit pourquoi — un titre qui se clique pour ne
rien ouvrir se lit comme un écran en panne (règle 5).

**Deux pastilles de comptage dans l'en-tête du tableau**, à gauche, à côté du
compte : « En attente 5 » · « Analysés 26 ». Elles filtrent au clic.

- **elles comptent la famille ouverte**, et non le chantier entier : « En
  attente 5 » sous Mails doit dire cinq mails, sinon cliquer dessus en rendrait
  trois et le compte passerait pour faux ;
- **une pastille allumée se rééteint au clic.** Il n'y a pas de troisième pastille
  « Tous » : l'état de repos est celui où aucune n'est allumée, et sans ce second
  clic il n'y aurait aucun chemin de retour vers la liste entière ;
- **un état sans document garde sa pastille.** « En attente 0 » est une réponse :
  rien n'est en cours. La faire disparaître laisserait se demander si le filtre
  existe encore ;
- **un filtre qui ne rend rien dit lequel**, et où sont les autres. « Aucun rapport
  de contrôle analysé » serait faux : il y en a, ils sont dans l'autre état.

**Et la phrase d'aide s'en va.** « 19 documents analysés. Cliquer sur une ligne
rouvre son analyse » redisait le compte que l'en-tête porte déjà, et expliquait un
geste qu'on fait sans qu'on le dise. Ce qui comptait — combien, et dans quel
état — est passé dans les pastilles.

### Quatre états, et « en échec » en est un

`OU_EN_EST` en portait deux, puis trois, et en porte quatre :

| état | ce qui l'a produit | le geste qu'il appelle |
| --- | --- | --- |
| `analyse` | une lecture conservée | l'ouvrir |
| `attente` | un pas de file `attend` ou `en-cours` | attendre |
| `echoue` | un pas de file `echec` | relancer |
| `jamais` | **l'absence des trois autres** | lancer |

**`echoue` était fondu dans `attente`**, et les deux n'appellent pas le même
geste : une lecture qui attend n'a besoin de rien, une lecture qui a échoué ne
reviendra jamais toute seule. Fondus, le second se cachait derrière le premier —
on regardait « 3 en attente » en croyant que le serveur y travaillait.

**`jamais` ne se déduit d'aucune table.** Le tableau ne liste que ce qui a une
trace, et un document jamais lancé n'en a aucune : le tableau ne le rencontre donc
jamais, et sa pastille n'existe pas. C'est le choix depuis Fichiers qui le
rencontre, parce que lui **énumère un dossier**. Les comptes des pastilles sont
dérivés de `OU_EN_EST` moins `jamais`, et non écrits un par un : un état ajouté
en haut et oublié en bas ferait une pastille qui ne compte rien, et l'on croirait
qu'il n'y a rien à compter (règle 10).

## Choisir depuis Fichiers sans cocher à l'aveugle

On cochait sans savoir. Pour apprendre si un compte rendu avait déjà été lu, il
fallait fermer le choix, aller au tableau, chercher la ligne, revenir. Trois
conséquences, et chacune coûte :

- on **relance une lecture déjà payée** — un appel, une facture ;
- on **laisse de côté une lecture qui a échoué** en la croyant faite ;
- on **ne voit pas ce qui n'a jamais été lu**, c'est-à-dire ce qu'on est venu
  lancer.

Chaque ligne porte donc, à côté de son nom, où en est son analyse : « déjà
analysé », « lecture en cours », « la lecture a échoué ». L'infobulle dit ce que
ça coûterait de relancer, et sur un échec c'est le **motif réel** qui s'y
affiche — c'est lui qui dit s'il faut relancer ou corriger d'abord.

**Rien sur ce qui n'a jamais été analysé.** C'est le cas ordinaire dans un dossier
qu'on ouvre pour la première fois : un badge sur chaque ligne n'apprendrait rien
et noierait les trois qui comptent. Le silence est donc l'état neutre et le badge
l'exception — l'inverse de la règle habituelle, parce qu'ici c'est l'absence
d'analyse qui est la norme.

**Ce qui a abouti l'emporte.** Un document relancé après un échec porte les deux
traces ; il est analysé, et le dire « en échec » ferait repayer une lecture faite
(règle 5). Entre deux échecs, en revanche, c'est le **dernier** motif qui se lit :
celui de la première tentative ferait chercher une cause déjà corrigée.

**Et rien de chargé n'est pas « rien d'analysé ».** Avant que les listes du
tableau soient revenues, l'écran ne sait rien : prétendre « jamais analysé » de
tout serait une réponse. Il ne dit donc rien, ce que fait l'absence de badge.

**L'information ne coûte pas un aller-retour.** Les lectures conservées et les
lignes de file sont déjà chargées pour le tableau, juste derrière cette liste :
c'est la même liste qui voyage, pas une seconde composition (règle 4). Le
branchement s'appelle `lesEntreesDuChoix`, et il est nommé pour être éprouvé — il
vivait au milieu du gestionnaire, entre un `await import` et un `try`, où rien ne
pouvait le casser exprès.

### Où se décide ce qu'on lit de la file

`lesStatutsALire({ dontLesEchecs })`, dans `reveiller-la-file.js`, qui est pur et
éprouvé. Deux écrans lisent la même table et n'attendent pas la même chose :

| qui lit | quels statuts | pourquoi |
| --- | --- | --- |
| l'onglet Actions | `en_attente` · `en_cours` | une ligne en échec a déjà sa course au journal, avec son motif ; la redire « en cours » serait faux |
| Analyse de documents | + `echec` | une lecture qui n'a pas abouti et qui disparaîtrait serait une lecture qu'on croit faite — on ne la relancerait jamais (règle 5) |

Cette décision était écrite dans le module d'accès à la base, où elle ne
s'éprouvait nulle part : il n'y a là-bas que des allers-retours. Elle est
remontée d'un cran, et elle tombe maintenant quand on la casse.

## La zone de dépôt redevient un geste secondaire

Elle occupait le haut de l'écran en permanence, alors que ce qu'on vient faire
ici, neuf fois sur dix, c'est **regarder ce qui a déjà été analysé**. Le tableau
commençait sous la ligne de flottaison.

Elle part donc derrière un bouton vert **« + Documents »**, dans la ligne du
titre, à gauche de Transformer. Les deux gestes de l'écran se tiennent ainsi côte
à côte : faire entrer des documents, et faire sortir ce qu'on en a tiré. Le vert
dit celui qui ajoute, comme ailleurs dans l'application.

- **la zone est fermée au repos**, et le bouton dit par `aria-expanded` si elle
  est ouverte — un bouton qui ne dit pas l'état de ce qu'il commande laisse
  chercher si le clic a porté ;
- **elle se referme au départ de la lecture.** Le geste est fait ; la laisser
  ouverte reprendrait l'écran qu'on vient de dégager, au moment précis où l'on
  veut revoir le tableau pour y suivre ce qui part. Ce qui part y apparaît
  aussitôt, en attente : la file est relue dans le même geste ;
- **le bouton ne paraît pas par-dessus un document ouvert** ni sur une lecture
  rouverte : on y déposerait par-dessus ce qu'on est en train de lire, et il
  faudrait d'abord en sortir.

## Ce qui n'est pas fait, et c'est dit à l'écran

**Le dépôt depuis le disque reste au compte rendu.** Les autres familles n'offrent
que « Choisir depuis Fichiers », et c'est volontaire : ces documents sont déjà dans
le projet, les redéposer depuis l'ordinateur en ferait un second exemplaire — le
genre de doublon qu'on ne remarque qu'au vingtième.

**Rien n'entre en mémoire depuis cet écran.** Le chemin reste copilote → atelier →
proposition → mémoire (règle 1).
