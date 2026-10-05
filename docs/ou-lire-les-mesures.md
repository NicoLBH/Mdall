# Où lire les mesures — proposition

> Une proposition, pas une livraison. Elle répond à : **où lit-on et vérifie-t-on
> les mesures de justesse, sans les voir à trois endroits ?**

---

## 1. Les dix endroits où une mesure se déclenche aujourd'hui

Elles ne sont pas de la même nature, et c'est la clé de tout ce qui suit.

### A — Automatique, à chaque poussée

| | Ce qui tourne | Ce que ça mesure | Coût |
| --- | --- | --- | --- |
| 1 | `npm test` (intégration continue) | **le code**, pas les analyses | gratuit |

Les épreuves des trois outils de mesure y tournent. Les outils eux-mêmes, non :
mesurer des analyses demande des appels, et l'intégration continue n'a pas à les
payer à chaque poussée.

### B — À la main, dans un terminal

| | Ce qui tourne | Ce que ça mesure | Coût |
| --- | --- | --- | --- |
| 2 | `la-batterie-des-perturbations.mjs` | la lecture **devine-t-elle ?** | 2 lectures × 6 perturbations × N |
| 3 | `la-derive-des-analyses.mjs` | **qu'est-ce qui a changé** depuis ? | gratuit — lit la base |
| 4 | `le-jeu-de-reference.mjs` | la lecture est-elle **juste** ? | 3 appels × N documents annotés |
| 5 | `la-ligne-du-temps.mjs` | de combien les **deux lignes** diffèrent | gratuit — lit la base |

Chacun a une **auto-épreuve gratuite** qui ne regarde aucune de vos lectures, et
un `--serveur` qui les regarde.

**Le cinquième n'est pas une mesure de justesse**, et c'est pourquoi il n'aura
pas sa ligne dans l'écran proposé plus bas. La ligne du temps est une *matière*
pour la prédiction : son chiffre — combien de faits la reconstitution déplace —
dit s'il y a quelque chose à arbitrer sur ce chantier, pas si les lectures sont
bonnes. Le ranger avec les quatre autres ferait lire un écart de chronologie
comme un défaut de lecture.

### C — Dans le produit, à chaque lecture, sans qu'on demande

| | Ce qui se mesure | Où ça s'affiche |
| --- | --- | --- |
| 6 | les avis écartés faute de citation retrouvée | détail d'un rapport, encart d'identité |
| 7 | la citation retrouvée, point par point | détail d'un compte rendu |
| 8 | la structure non reconnue | détail d'un rapport, encart d'accroc |
| 9 | les marques employées hors légende | détail d'un rapport, section Légende |
| 10 | la fidélité de la transcription | détail d'un compte rendu |

---

## 2. Deux questions, et c'est ce qui décide

Les neuf endroits ne répondent pas à la même question, et vouloir les réunir
serait l'erreur.

> **« Ce document-ci a-t-il été bien lu ? »**
> C'est une question de chantier. Elle se pose en ouvrant une lecture, et la
> réponse ne vaut que pour ce document.

> **« Notre façon de lire est-elle bonne, et s'améliore-t-elle ? »**
> C'est une question d'administration. Elle se pose sur un corpus, dans le temps,
> et la réponse ne concerne aucun chantier en particulier.

**Les points 6 à 10 répondent à la première, et ils sont déjà au bon endroit.**
Ce sont les seuls qui aient leur place dans l'Atelier, parce qu'ils parlent du
document qu'on a sous les yeux.

**Les points 2 à 4 répondent à la seconde**, et ils ne sont nulle part — ils
existent dans trois terminaux.

**Le point 5 ne répond ni à l'une ni à l'autre** : il décrit le chantier, pas la
lecture. Sa place est auprès de la prédiction, le jour où elle consommera la
ligne du temps — et pas avant, parce qu'une frise dont personne ne fait rien est
une décoration.

---

## 3. Ce que je propose de ne pas faire

### Ni dans une proposition

Une proposition est **une chose à signer**. Y mêler la qualité du procédé
mélangerait deux questions qui n'ont pas le même lecteur ni le même geste :
« ce point-ci est-il juste ? » se tranche en relisant le point ; « notre lecteur
est-il bon ? » ne se tranche pas en signant.

Et une proposition appartient à un chantier, quand la mesure est transversale :
un taux de rappel calculé sur un seul chantier dirait surtout combien ce
chantier a de documents.

### Ni un panneau « tests » dans Atelier > Analyse de documents

Ce qui concerne un document **y est déjà** — les points 6 à 10. Ajouter un second
panneau ferait lire deux fois la même information sous deux formes, et c'est
exactement la divergence qu'on cherche à éviter : le jour où les deux ne diront
plus la même chose, personne ne saura laquelle croire.

**Ce qui manque dans l'Atelier n'est pas une mesure de plus, c'est un lien.** Une
ligne, sous l'encart d'identité : « cette lecture a été faite par *modèle · v2* —
voir la justesse de ce procédé », qui mène à l'écran unique. On y va depuis le
document, on n'y lit pas le document.

---

## 4. Ce que je propose : un seul écran, dans la console

**Console admin → une rubrique « La justesse »**, à côté d'Exploitation.

Pourquoi là :

* c'est une question d'administration, pas de chantier ;
* la console a déjà la coque, le rail, la barre d'onglets et la porte
  `est_administrateur()` ;
* elle a déjà la règle qui va avec : **la console ne lit jamais un contenu de
  chantier**. Des taux et des comptes, jamais une citation, jamais un avis,
  jamais le nom d'un document réel.

### La forme

Quatre lignes, une par mesure, et **chacune dit quand elle a été prise** :

```
LA JUSTESSE DES LECTURES

  Le jeu de référence        il y a 3 jours     2 documents annotés
    structure reconnue       100 % (2/2)
    légende — rappel         100 % (7/7)
    légende — précision       93 % (7/8)
    relevés — rappel          94 % (31/33)
    relevés — précision       97 % (31/32)
    marques justes            90 % (28/31)
    pièges évités             86 % (6/7)

  Les perturbations          il y a 3 jours     9 épreuves eues sur 12
    tiennent                   8        tombent        1
    n'ont pas eu lieu          3        (inapplicable 3)

  La dérive                  ce matin           412 lectures, 180 passages
    stables                  171        dérives        7
    instabilités               2        procédé inconnu  0
    lues une seule fois      232        ← la part du corpus qui échappe

  Les invariants             ce matin           412 lectures
    citations retrouvées      97,3 % (1 204 / 1 237)
    marques déclarées         99,1 % (1 226 / 1 237)
```

### Les quatre règles de cet écran

1. **Jamais un score unique.** « Qualité : 87 % » ne dit pas quoi réparer, et
   mélange une structure non reconnue avec une marque fausse — qui n'appellent ni
   le même diagnostic ni la même correction.
2. **Jamais un taux sans son assiette.** « 100 % » sur un relevé n'est pas
   « 100 % » sur quatre cents.
3. **Ce qui n'a pas été mesuré, aussi gros que ce qui l'a été.** Les trois outils
   le produisent déjà ; l'écran ne doit pas le reléguer en bas de page. Un
   chantier dont 232 documents sur 412 n'ont été lus qu'une fois n'a pas une
   dérive nulle.
4. **La date de la mesure, à côté du chiffre.** La mesure n'est pas continue :
   elle a lieu quand on la lance. Un écran qui montre un chiffre de la semaine
   dernière comme s'il était d'aujourd'hui est pire que pas d'écran.

### Ce qui change dans les outils : ils déposent, ils ne s'affichent plus seuls

C'est le seul changement de fond, et c'est lui qui empêche la divergence :

```
aujourd'hui              demain
──────────               ──────────
outil → terminal         outil → terminal (le détail, pour celui qui lance)
                               ↘ une table → l'écran (les agrégats, pour tous)
```

Une migration **strictement additive** : une table `les_mesures_de_justesse`
`{quand, quoi, bilan jsonb, procede, combien, owner_id}`. Les outils y écrivent
leur bilan en fin de passage ; l'écran lit la dernière ligne de chaque `quoi`, et
peut tracer la courbe quand il y en aura plusieurs.

`procede` est la colonne qui porte tout le sens : c'est le `lu_par` de la dérive
— le modèle **et** la version du procédé. Sans elle, deux bilans qui diffèrent ne
diraient pas si l'on a changé quelque chose ou si le procédé ne se répète pas,
et c'est précisément la distinction que la dérive existe pour tenir.

**Le détail nominatif reste au terminal.** « RICT-03 a manqué A-23 » est un
contenu de chantier : il n'entre pas dans la table, et donc pas dans la console.
L'écran dit « 2 relevés manqués » ; qui veut savoir lesquels relance l'outil, et
c'est à lui que le chantier appartient.

---

## 5. Ce qu'il faut trancher avant d'écrire

* **Le jeu de référence est-il par chantier ou commun ?** Je le vois commun : ses
  documents sont inventés, et un jeu par chantier serait un jeu par client, donc
  jamais annoté. Mais alors la table porte des lignes sans `project_id`, et la
  porte de lecture n'est pas la même.
* **La courbe, à partir de combien de points ?** Deux mesures ne font pas une
  tendance. Tant qu'il n'y en a pas cinq ou six, l'écran doit montrer **la
  dernière** et dire combien il en a — pas tracer une droite entre deux points.
* **Qui lance ?** Aujourd'hui, une personne, à la main. Un déclencheur
  hebdomadaire rendrait la courbe régulière et la facture prévisible — mais il
  faut vouloir payer la batterie de perturbations toutes les semaines, et ce
  n'est pas évident.

---

## 6. Ce qui a été fait, et ce que cela a montré

L'écran est en service : **Console › Exploitation › La justesse**. Il lit
`mesures_de_justesse`, où `deposer_une_mesure` dépose les bilans des quatre
outils — et seulement depuis `--serveur` : l'auto-épreuve ne dépose rien, parce
qu'elle mesure deux lecteurs de carton et que son bilan vert se lirait comme
celui du produit.

Les trois questions tranchées au § 5 l'ont été ainsi :

* **le jeu de référence est commun**, et la table ne porte donc **aucun
  `project_id`** — la contrainte `bilan_sans_contenu` le refuse même comme clé ;
* **la courbe n'existe pas encore.** L'écran montre le dernier bilan **par
  procédé**, et l'historique en tableau. Deux points sous deux procédés
  différents ne font pas une tendance, et l'écran le dit ;
* **personne ne lance automatiquement.** C'est dit dans « Ce que cet écran ne
  dit pas », comme la purge des vingt-six mois que rien n'appelle (règle 12).

### Ce que l'écriture de cet écran a appris

Trois défauts trouvés en le construisant, et aucun n'était visible à la lecture :

1. **`invariantsTombes` vivait sans assiette** dans le bilan de la batterie de
   perturbations. « 0 invariant tombé » est indiscernable de « aucun invariant
   posé » — le cas d'une lecture muette, dont tout invariant tient par
   construction. Exactement le défaut que cet outil existe pour attraper, dans
   l'outil lui-même. Le bilan rend maintenant les deux.
2. **`bilan_sans_contenu` ne regarde que les noms de clés.**
   `{"tombees": "RICT-03 a manqué l'avis A-23"}` la traverse sans difficulté.
   D'où la deuxième serrure : `deposer_une_mesure` ne garde d'une clé permise que
   ce qui est **un nombre**. La première ferme les noms, la seconde les types.
3. **La liste des clés permises portait `secondes` et `appels`**, qu'aucun outil
   ne produit : du SQL écrit par anticipation, que rien n'appelle (règle 1). Une
   épreuve confronte désormais les deux côtés — ce que le JavaScript émet et ce
   que la base garde — parce qu'une clé émise et jetée fait un dépôt qui rend
   « ok » et une case vide à l'écran. Rien ne tombe nulle part ailleurs.

### La question qui restait, et sa réponse

L'écran répond à **une** des trois questions de justesse, et au tour précédent
j'avais soutenu que c'était la seule qui mérite un écran. C'était faux comme
principe : il y en a trois, elles n'ont ni le même lecteur ni le même endroit, et
les deux autres sont dans le produit. Voir `docs/montrer-le-raisonnement.md`, § 4.
