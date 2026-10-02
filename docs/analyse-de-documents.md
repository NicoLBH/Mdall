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

## Ce qui n'est pas fait, et c'est dit à l'écran

**Le dépôt depuis le disque reste au compte rendu.** Les autres familles n'offrent
que « Choisir depuis Fichiers », et c'est volontaire : ces documents sont déjà dans
le projet, les redéposer depuis l'ordinateur en ferait un second exemplaire — le
genre de doublon qu'on ne remarque qu'au vingtième.

**La lecture d'un fil de mails ne part pas encore d'ici.** Son geste est déclaré,
sa fonction de bord existe depuis octobre, et le registre la connaît ; ce qui
manque est que le dépôt de messagerie monte les octets, là où les deux autres
familles lisent des documents déjà rangés. C'est un round à part.

**Rien n'entre en mémoire depuis cet écran.** Le chemin reste copilote → atelier →
proposition → mémoire (règle 1).
