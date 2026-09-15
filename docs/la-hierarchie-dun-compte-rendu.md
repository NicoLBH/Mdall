# La hiérarchie d'un compte rendu

**À quoi sert cette page :** le plan de fabrication pour que les sujets tirés d'un compte
rendu de chantier cessent d'être à plat. Ce qu'on retient, dans quel ordre on le fabrique, et
comment on saura que ça marche.

Elle prolonge [`lire-un-compte-rendu.md`](lire-un-compte-rendu.md), qui décrit la chaîne du
PDF à la proposition. Cette chaîne est faite ; ce qui suit porte sur ce qu'elle produit.

---

## 0. Le journal de la fusion : fausse alerte

Il s'affiche. Le code était en place des deux côtés — l'écriture dans
`project-propositions.js`, la lecture dans `lireLesGestes` —, et la migration était passée.
Rien à réparer.

Ce paragraphe reste parce que l'ordre du plan en dépendait : c'est le journal qui permet de
voir ce qu'une fusion a fait, et donc de vérifier les étapes qui suivent. Il est là.

---

## 1. Le constat

Le compte rendu n° 19 des Gets porte cinquante points. Il les range, et son rangement est
la moitié de son information :

```
A) OBSERVATIONS SUR COMPTE RENDU PRECEDENT
B) DISPOSITIONS GENERALES & ADMINISTRATIVES
   1. Marché de travaux
   2. Installation de chantier
   3. Situation de travaux
   4. Coordonnateur SPS          ── un intervenant
   5. Contrôle technique         ── un intervenant
   6. Echange de documents
   7. Documents exécutions
C) PREPARATION / AVANCEMENT / OBSERVATIONS
   Lot n° 1 : Démolition / Gros Œuvre : Entreprise GILETTO
     ❑ Structure coffrage dalle R+1 réalisé à 30 %
     ❑ Engager dès semaine prochaine reprise embrasure du RDC
     ❑ …
   Lot n° 2 : CHARPENTE : Entreprise PRAWOOD
   …
   Lot n° 12 : VENTILATION TRAITEMENT D'AIR : Entreprise MEYER
     ❑ /                          ── rien à cette réunion
   Lot n° 14 : ECHAFAUDAGE : Entreprise LUGDUNUM
E) DIVERS
   Maître d'Ouvrage · CIL · PROJECTEC · GRISAN   ── des intervenants
```

Mdall en tire aujourd'hui cinquante sujets **côte à côte**. « Structure coffrage dalle R+1
réalisé à 30 % » et « Mettre en place les inspections communes » sont au même niveau, dans une
liste qui compte déjà quarante-cinq lignes ouvertes. Le rangement du document est perdu à la
lecture, et personne ne le retrouve ensuite.

Deux conséquences, et la seconde est la plus coûteuse :

- **on ne peut plus naviguer.** Quatre-vingt-treize sujets à plat ne se parcourent pas ;
- **l'assignation devient une devinette.** `aQuiRevientLePoint` lit le `qui` du point, puis
  son lot, et tranche au plus proche. Elle se trompe, et l'on ne sait pas dire pourquoi.

---

## 2. Ce qu'on retient

**Une rubrique du document devient un sujet père.** Les points qu'elle contient deviennent ses
fils.

```
Sujet père   « Lot n° 1 : Démolition / Gros Œuvre : Entreprise GILETTO »   label LOT
  ├─ fils    « Structure coffrage dalle R+1 réalisé à 30 % »
  ├─ fils    « Engager dès semaine prochaine reprise embrasure du RDC »
  └─ fils    « Le sciage de l'embrasure biaise : retour tableau de 12 cm »
```

Trois raisons, et aucune n'est cosmétique.

**L'entreprise épingle un sujet, et un seul.** GILETTO épingle son père. Elle voit au-dessus
de la liste combien de points lui restent ouverts, sans lire les quatre-vingt-douze autres.

**Le maître d'œuvre ouvre une vue.** `label:LOT` rend une vingtaine de lignes — une par
intervenant —, chacune avec son compte de fils ouverts et fermés. On entre dans un lot, on en
sort, on ne se perd pas.

**L'assignation cesse d'être devinée.** Un fils revient à l'entreprise de son père, sauf si le
document dit autre chose. C'est structurel, donc vérifiable : ce n'est plus une comparaison de
chaînes, c'est une position dans le document.

### Un père est un contenant, pas une tâche

Il n'a pas d'échéance, pas d'état propre, et **son état se déduit de ses fils** : ouvert dès
qu'un fils est ouvert, fermé quand aucun ne l'est. C'est la règle 2 — ce qui est dérivé se
recalcule.

C'est aussi ce qui règle le Lot n° 12, qui ne porte que « / » à cette réunion : le père se
crée fermé, et le premier point du compte rendu suivant le rouvrira tout seul. On n'a rien à
décider, et rien à défaire.

> **Une exception nommée.** Partout ailleurs, fermer est une décision qui se signe. Ici, c'est
> un calcul — parce qu'un contenant vide ne dit rien d'autre que « il n'y a rien dedans », et
> qu'une décision humaine sur ce point serait une décision sur rien.

---

## 3. Le socle qui existe déjà

Presque rien à créer. Il s'agit d'alimenter ce qui est là.

| Ce qu'il faut | Où c'est | État |
| --- | --- | --- |
| Le lot lu pour chaque point | `SCHEMA_DES_SUJETS.sujets[].lot` | ✅ déjà rendu par le modèle |
| Hiérarchie père/fils | `subjects.parent_subject_id` | ✅ colonne et index |
| Le vocabulaire du lien | `liens-du-cr.js` — `LIEN.PARENT`, `estHierarchique` | ✅ nommé |
| Les lots du chantier | `lots-du-cr.js`, `project_lots` | ✅ numéro, nom, comparaison |
| Les labels | `label-du-cr.js`, `project_labels`, `subject_labels` | ✅ mécanisme |
| Le compteur de fils | `views/ui/subissues-counts.js` | ✅ composant partagé |
| L'épingle | `subject_pins`, `epingles-des-sujets.js` | ✅ |
| Les vues enregistrées | `vues-des-sujets.js`, recherches épinglées | ✅ |
| Une rubrique comme objet de lecture | `rubriques-du-cr.js`, `SCHEMA_DES_SUJETS.rubriques` | ✅ étape 2 |
| Un sujet père **proposé** | `ITEM_TYPE.RUBRIQUE`, `rubriqueItems` | ✅ étape 3 |
| Un sujet père **ouvert, et ses fils rattachés** | `peres-du-cr.js` | ✅ étape 4 |
| L'état d'un père déduit de ses fils | `etatDuPere`, `accorderLePereAuxFils` | ✅ étape 5 |
| L'assignation qui descend du père | `aQuiRevientLePoint`, `societesDesPeres` | ✅ étape 6 |
| Les sujets déjà à plat, rattrapés | `rattrapage-des-sujets.js`, `ITEM_TYPE.RANGEMENT` | ✅ étape 7 |
| Le compteur de sous-sujets sur la ligne | `renderSubjectChildrenCounterHtml` | ✅ déjà là |
| La vue « Lots », proposée | `vue-des-lots.js` | ✅ étape 8 |
| Le suivi des mesures d'une lecture à l'autre | `suivi-des-lectures.js`, `cr_lectures` | ✅ étape 9 |
| **L'épingle depuis la ligne d'un lot** | — | ❌ à faire |

Autrement dit : **le modèle voit déjà le rangement, et la base sait déjà le porter.** Ce qui
manque est entre les deux.

---

## 4. Les étapes, dans l'ordre

Une étape par livraison. Chacune se vérifie seule, et aucune ne suppose la suivante.

### Étape 1 — Le journal de la fusion s'affiche · *sans objet*

Il s'affichait déjà : voir le § 0. On fusionne, on va dans Actions, on lit les étapes et leurs
durées.

---

### Étape 2 — La lecture rend des rubriques · *faite*

Le schéma de `extract-sujets` gagne un tableau `rubriques`, et chaque point dit **sous
laquelle** il a été lu.

```jsonc
{
  "rubriques": [
    { "ordre": 1, "intitule": "Marché de travaux",                          "genre": "administrative" },
    { "ordre": 4, "intitule": "Coordonnateur SPS",                          "genre": "intervenant"    },
    { "ordre": 8, "intitule": "Lot n° 1 : Démolition / Gros Œuvre : Entreprise GILETTO",
                  "genre": "lot", "numero": "1", "societe": "GILETTO" }
  ],
  "sujets": [
    { "rubrique": 8, "titre": "Structure coffrage dalle R+1 réalisé à 30 %", … }
  ]
}
```

**Trois genres, et pas deux.** Un lot porte un numéro et une entreprise. Une rubrique
d'intervenant en désigne un sans numéro de lot — le SPS, le contrôle technique, l'architecte
de la section « DIVERS ». Une rubrique administrative ne désigne personne : « Échange de
documents » n'est à personne en particulier. Les confondre ferait assigner des points à une
procédure.

**Le point pointe la rubrique par son `ordre`, pas par son intitulé.** Un intitulé recopié
deux fois finit par différer d'un espace, et le rattachement se perd sans rien dire (règle 10).

**Ce qui se vérifie sans modèle :** `rubriques-du-cr.js`, pur et testé — l'identité d'une
rubrique (le numéro pour un lot, l'intitulé aplati sinon), la reconnaissance du genre, le
rattachement d'un point à sa rubrique, et le compte des **orphelins**.

**Le piège qu'on n'avait pas vu.** Les sept rubriques administratives d'un compte rendu sont
numérotées de 1 à 7. Les lire comme des numéros de lot créerait sept lots que le marché ne
connaît pas, et l'on y rangerait les points d'installation de chantier. C'est **le mot
« lot »** qui fait un lot, pas le chiffre — et sans ce mot, il faut que le modèle ait rendu un
numéro de lot explicite, ce que la consigne lui interdit de faire sur un numéro de paragraphe.

**Ce que l'étape a livré en plus, et pourquoi.** L'écran de l'Atelier range désormais
« Ce qui a été relevé » par rubrique du document, avec le genre et la société en regard, et se
rabat sur le champ `lot` quand aucune rubrique n'a été lue. Sans cela, une étape entièrement
serveur n'aurait été vérifiable par personne. Les trois chiffres de l'étape 9 — rubriques
reconnues, points rangés, sans rubrique — sont venus avec, dans le composant qui porte déjà les
autres.

**Un nom rendu à ce qu'il désigne.** `lectureAssemblee` portait déjà un champ `rubriques` qui
groupait les points par leur champ `lot` — c'est-à-dire exactement le rangement à plat qu'on
remplace. Il s'appelle maintenant `groupesParLot`, ce qu'il est (règle 10).

> **Un point sans rubrique reste un sujet racine**, et il se compte. La section A —
> « observations sur compte rendu précédent » — n'en produit d'ailleurs aucun. Ce qui compte
> est de ne pas lui en inventer une : ne pas savoir n'autorise pas à ranger au hasard
> (règle 5).

---

### Étape 3 — Une rubrique devient une ligne de la proposition · *faite*

Nouvelle nature `ITEM_TYPE.RUBRIQUE`. Elle porte l'intitulé tel que le document l'écrit, son
genre, son numéro et sa société le cas échéant, sa citation et sa page.

**Sa clé est l'identité de la rubrique**, jamais son intitulé : `lot:1`,
`rubrique:installation de chantier`. C'est elle qui fera qu'un lot retrouvé au compte rendu
suivant est le même, quand bien même le nom de son entreprise aurait changé d'orthographe.

**Toutes les rubriques se proposent, y compris celles qui ne portent aucun point.** Un lot dont
le document ne dit rien à cette réunion existe, et c'est ce qui lui permet d'être ouvert puis
fermé, puis de rouvrir à la réunion où il reçoit un point. N'en proposer que les peuplées ferait
apparaître les lots au compte-gouttes, chacun à la réunion où il a parlé.

Elle se coche comme les autres : **rien n'entre directement dans la mémoire** (règle 1). Une
rubrique refusée ne crée pas de père, et ses points restent racines.

L'écran de la proposition les montre **en tête**, avant les sujets : c'est l'ordre dans lequel
on décide, puisque les fils en dépendent.

**Le label.** Un père de genre `lot` ou `intervenant` porte `LOT` — c'est le mot du métier, et
c'est lui qui fera la vue. Un père administratif porte `Dispositions générales`. Les deux
labels se proposent comme les autres, par `labelsAProposer`.

> **Pourquoi `LOT` sur le contrôle technique.** Parce que la question posée par la vue n'est
> pas « quels sont les lots du marché » mais « qui a quelque chose à faire ». Le SPS et le
> bureau de contrôle en ont. Si l'usage montre que les deux doivent se distinguer, un second
> label les séparera sans rien casser — un label s'ajoute, il ne se migre pas.

**Ce que la ligne dit, et ce qu'elle ne dit pas.** Elle est marquée « Retenue », et non
« À ouvrir » : le père s'ouvre à l'étape 4. Annoncer une ouverture qui n'a pas encore lieu
serait le défaut que la nature `FERMETURE` a été créée pour réparer — un écran qui promet ce
que la proposition ne fait pas.

**Une garde générale est venue avec.** Une nature proposée sans bloc à l'écran ne casse rien :
ses lignes sont écrites, conservées, comptées dans ce qui reste à trancher, et **invisibles** —
personne ne peut ni les accepter ni les refuser. Un test lit désormais l'écran et vérifie que
toute nature qu'un compte rendu produit y a son bloc. C'est le cas précis où lire la source
vaut mieux que de ne rien vérifier.

---

### Étape 4 — Le père s'ouvre à la fusion, et les fils s'y rattachent · *faite*

Deux écritures, dans cet ordre.

1. **Le père.** Un sujet dont le titre est l'intitulé de la rubrique, avec ses labels. Son
   identité entre deux comptes rendus est le **numéro du lot**, jamais le nom de l'entreprise :
   « GILETTO » et « GILETO » sont la même société mal recopiée, et un père par orthographe
   ferait deux lots n° 1.
2. **Les fils.** `parent_subject_id` sur chaque sujet ouvert ou relancé sous cette rubrique.

Le journal de la fusion gagne une étape — `peres`, « Lots rangés » —, **après les sujets** : un
père se remplit de ce qui vient d'être ouvert, et l'ordre inverse lui donnerait un contenu d'une
réunion de retard. Elle dit combien de lots ont été ouverts, combien étaient déjà au projet, et
combien de sujets s'y sont rangés.

**Les fils sont ceux qu'on ouvre et ceux qu'on relance.** Un compte rendu reporte : la douzième
réunion redit trente-sept points déjà ouverts. Ne rattacher que les sujets neufs laisserait les
trente-sept à plat, et le rangement ne se verrait qu'au premier compte rendu d'un chantier.

**Ne pas savoir ce que le projet suit arrête tout.** Si la liste des sujets n'a pas pu être lue,
aucun père ne s'ouvre : ouvrir sans pouvoir vérifier ce qui existe déjà créerait des doublons,
et un doublon de père reste — là où un père manquant se rattrape au compte rendu suivant
(règle 5).

**Le père se retrouve par son titre**, sans colonne de plus : `identiteDeLaRubrique` relit
`lot:1` de « Lot n° 1 : … : Entreprise BERTRAND » comme de « Lot n°01 : GROS OEUVRE : Entreprise
BERTAND ». C'est pour cela que l'identité avait été posée dès l'étape 2, et qu'elle n'a jamais
compté le nom de l'entreprise.

**La description du père dit ce qu'il est** : une rubrique du compte rendu, dont ce qu'il y a à
traiter est dans les sous-sujets, et qui n'est demandée à personne. Sans elle, un père ouvert par
une fusion ressemble à un point qu'on aurait oublié de remplir.

**Ce qu'un échec coûte :** un fils qui ne se rattache pas reste racine. Le sujet existe, son
contenu est juste, il est mal rangé. On le dit et l'on continue — refuser la fusion pour un
rangement serait faire payer l'essentiel par l'accessoire.

---

### Étape 5 — L'état d'un père se déduit de ses fils · *faite*

Une fonction pure : `etatDuPere(fils)` → ouvert dès qu'un fils est ouvert.

Elle se calcule à trois moments : à la fusion, à la fermeture d'un fils, à l'ouverture d'un
fils. C'est ce qui ferme le Lot n° 12 le jour où il ne porte que « / », et le rouvre à la
réunion suivante.

**C'est la seule exception au principe « fermer est une décision »**, et elle se justifie de ce
qu'un père est : un contenant. « Lot n° 1 : Gros Œuvre » n'est demandé à personne, et il n'y a
donc personne pour décider qu'il est réglé. Ce qui le décide est ce qu'il contient.

**Une seule implémentation, appelée aux trois moments.** `accorderLePereAuxFils` lit les fils,
calcule l'état voulu, et n'écrit que s'il diffère de l'état actuel. Trois copies de ce calcul
finiraient par ne plus dire la même chose, et c'est celle qu'on ne regarde pas qui aurait
raison (règle 4).

**Deux refus, tous deux par règle 5.** Des fils qu'on n'a pas pu lire ne concluent rien —
fermer un lot parce qu'une requête a échoué ferait disparaître quinze points d'un chantier.
Un état actuel qu'on n'a pas pu lire non plus : on réécrirait une fermeture par-dessus une
fermeture, avec une autre date et un autre auteur.

**Rien ne s'écrit quand l'état ne change pas.** Rejouer une fusion ne doit pas refermer un lot
qu'on venait de rouvrir à la main, ni poser une ligne d'activité pour un état qui était déjà le
bon.

---

### Étape 6 — L'assignation descend du père · *faite*

`aQuiRevientLePoint` gagne un recours entre les deux autres : la société du père.

L'ordre devient : ce que le point dit (`qui`) → **la société de la rubrique** → le lot du point.

**Le lot n'a pas disparu de la chaîne, contrairement à ce que prévoyait ce plan.** Le retirer
aurait laissé sans assigné tous les points de tout compte rendu dont les rubriques n'ont pas
été relevées — c'est-à-dire tous ceux lus avant l'étape 2. C'est la même information que la
société du père, lue moins sûrement : elle passe donc en dernier plutôt que de s'en aller.

Le défaut que ce plan lui reprochait est ailleurs, et il est traité : **chaque recours est
essayé seul**. Les mélanger dans une même chaîne de recherche ajoutait des candidats que le
document n'avait pas désignés, et c'est cela qui assignait à un maître d'ouvrage un point
explicitement demandé à une entreprise.

**Deux candidats ne font pas un choix, et n'ouvrent pas le recours suivant.** Le document a bien
désigné quelque chose ; c'est le projet qui ne sait pas qui c'est. Se rabattre alors sur le lot
assignerait à l'entreprise du lot un point adressé à quelqu'un d'autre — précisément l'erreur
qu'on cherche à ne plus commettre.

**Comment on le vérifie :** le compte rendu n° 19, où les points du Lot 1 doivent tous revenir
à GILETTO, et « Confirmer à LABEVIERE la position des attentes » — écrit sous le Lot 11 —
rester chez MUFFAT, puisque c'est lui qui doit confirmer.

---

### Étape 7 — Rattraper les sujets déjà à plat · *faite*

Le projet porte déjà quatre-vingt-treize sujets ouverts sans père. Les laisser ainsi ferait
deux moitiés de liste, l'une rangée et l'autre pas.

Un geste, dans l'Atelier, qui **propose** — il n'écrit pas : pour chaque sujet portant le
label `CR chantier` et un lot reconnaissable dans son titre ou sa description, un rattachement
au père correspondant. On coche, on signe, ils entrent.

**Ce qui ne se rattrape pas se dit** : les sujets dont le lot ne se lit pas restent racines, et
leur nombre s'affiche. C'est une lacune connue, pas un trou.

**Où le lot se lit.** Dans la provenance qu'un sujet ouvert depuis un compte rendu porte déjà :
« Relevé dans 1824_CR_12.pdf · lot 02 — GROS ŒUVRE · point n° 12.02.1 · page 3 ». C'est Mdall
qui l'a écrite, dans une forme qu'il connaît. À défaut, le titre — et c'est tout : on ne cherche
pas le nom d'une entreprise dans le corps d'un sujet, parce qu'un point qui *mentionne* une
entreprise n'est pas un point qui lui *revient*.

**Une nature de plus, `ITEM_TYPE.RANGEMENT`.** Elle ne change rien à ce qu'un sujet dit — ni son
titre, ni son contenu, ni son état : elle change l'endroit où on le trouve. Distincte de
`RUBRIQUE`, qui ouvre le lot : celle-là y met quelqu'un. La proposition porte les deux, et une
rubrique refusée laisse ses sujets à la racine.

**Un sujet qui a déjà un père n'est pas à rattraper** : le reproposer demanderait de confirmer
un rangement déjà fait, et ferait douter de tous les autres.

---

### Étape 8 — L'écran : le compteur, l'épingle, la vue · *deux tiers*

Rien à inventer, trois branchements.

- **Le compteur de fils** sur la ligne d'un père · *déjà là*. `renderSubjectChildrenCounterHtml`
  le pose depuis longtemps sur toute ligne qui porte des sous-sujets ; un lot en est une. Rien à
  faire, et c'était le bon constat : on ne le refait pas.
- **La vue « Lots »** · *faite*. `vue-des-lots.js` nomme la requête une fois — `label:LOT`,
  composée du nom du label, jamais recopiée — et l'écran des vues la **propose** d'un clic :
  la recherche s'ouvre, et c'est la personne qui décide de l'enregistrer. Trois refus : la vue
  existe déjà, on n'a pas pu lire celles du projet (règle 5), ou **aucun lot n'est encore
  ouvert** — une vue qui ne rendrait rien ferait croire que le chantier n'a pas de lots alors
  qu'il n'a pas encore été rangé.
- **L'épingle depuis la ligne d'un père** · *reste à faire*. `subject_pins` est là et le geste
  existe, mais à deux endroits seulement : le bouton du panneau de droite et la croix d'une
  carte épinglée. Les deux lisent l'état des épingles, que le tableau ne reçoit pas — l'y faire
  descendre est du câblage à travers `deps`, et un bouton à moitié branché est un bouton qui
  paraît sourd. À faire proprement, pas en passant.

---

### Étape 9 — Les mesures · *faite*

*Les trois chiffres sont posés depuis l'étape 2 : une étape entièrement serveur n'aurait été
vérifiable par personne. Ce qui restait ici — leur suivi d'une version à l'autre — est fait.*

L'écran de lecture de l'Atelier porte trois chiffres, à côté de ceux de la restitution :

| Chiffre | Ce qu'il dit | Ce qu'on surveille |
| --- | --- | --- |
| Rubriques reconnues | 21 | Un écart avec le document se voit à l'œil |
| Points rattachés | 47 / 50 | Le taux de rattachement |
| **Orphelins** | 3 | **Le chiffre à surveiller** |

Un orphelin n'est pas une faute : la section A n'en produit pas, et « DIVERS » peut en
produire. Ce qu'on surveille est sa **variation** d'un compte rendu à l'autre : elle dit que
la lecture a dérivé.

**Chaque chiffre porte donc son écart avec la lecture précédente** — « +2 », « −1 » —, et la
phrase au-dessus nomme à quoi l'on compare. Un écart sans terme de comparaison ne se juge pas :
« +2 orphelins » depuis quoi ?

**Ce qui monte n'est pas toujours bon**, et le sens de chaque chiffre est écrit une fois, dans
`suivi-des-lectures.js`. Deux rubriques de plus est un progrès ; deux orphelins de plus est une
dérive. Les peindre pareil vaudrait autant que ne rien peindre.

**Un écart nul ne s'affiche pas.** « +0 » sur chaque chiffre stable ferait du bruit là où l'on
cherche justement ce qui a bougé.

**« Première lecture » n'est pas « rien n'a bougé ».** Les confondre ferait croire qu'une
lecture est stable alors qu'on n'a rien à quoi la comparer (règle 5). De même, ne pas avoir pu
lire les lectures d'avant n'affiche aucun écart plutôt que des zéros.

**Une table, et elle est privée.** `cr_lectures` conserve une ligne par lecture, jamais mise à
jour (règle 6) — relire le même document est une seconde lecture, et c'est précisément ce qu'on
veut comparer quand on ajuste une consigne. La règle de lecture ne rend que les lectures de qui
demande : dans l'Atelier on essaie, on relance dix fois pour comprendre un écart, et publier ce
brouillon ferait cesser d'essayer. La séparation est tenue **par la base**, pas par l'écran.

**Un échec ne coûte rien à la lecture.** Elle a eu lieu, elle est à l'écran, elle se transforme
en proposition : le suivi n'est que ce qu'on en garde pour la fois suivante.

---

## 5. Ce que cet ordre refuse

**De demander la hiérarchie à un modèle qui raisonne.** Le plan d'origine prévoyait un
troisième appel, cher, pour établir les liens entre sujets. Il reste utile pour les liens
fonctionnels — « bloqué par », « fait double emploi avec ». Mais **la hiérarchie n'est pas un
raisonnement : c'est une lecture.** Le document la porte, en toutes lettres, dans ses titres.
La faire déduire coûterait cher pour retrouver ce qu'il suffisait de recopier.

**De commencer par la vue.** C'est ce qu'on voit, donc ce qu'on a envie de faire d'abord. Une
vue `label:LOT` sur des pères qui n'existent pas ne montre rien.

**De rattraper l'existant avant de savoir produire du neuf.** L'étape 7 vient après la 4, parce
qu'un rattrapage qui rangerait mal quatre-vingt-treize sujets serait plus long à défaire qu'à
faire.

**De créer un père en silence.** Un père est un sujet : il apparaît dans les listes, il
compte, il s'assigne. Il se signe comme les autres.

---

## 6. Plus tard

Deux directions notées ici pour ne pas les perdre. Ni l'une ni l'autre n'est dans le plan
ci-dessus.

### Les situations sortent du périmètre d'un projet

Comme les `Projects` de GitHub, qui traversent les dépôts. L'entreprise GILETTO suivrait alors
tout ce qui lui est assigné **sur l'ensemble de ses chantiers** ; le bureau de contrôle
verrait ses tâches sans ouvrir les comptes rendus un par un.

Ce que cela suppose : `situations.project_id` cesse d'être obligatoire, une situation porte un
périmètre — un projet, plusieurs, tous ceux où je suis —, et la règle de lecture suit. C'est
un changement de la portée d'un objet, donc à traiter seul.

**Et c'est la hiérarchie qui le rend utile** : une situation trans-projets qui rendrait
quatre-vingt-treize lignes par chantier ne servirait à personne.

### Lire les documents côte à côte

Deux choses, dans cet ordre :

1. **Le `.md` de la restitution entre dans Fichiers** à la fusion, rangé sous le compte rendu
   dont il vient. C'est la dixième étape de [`lire-un-compte-rendu.md`](lire-un-compte-rendu.md),
   restée en suspens.
2. **Plusieurs PDF à l'écran, en onglets** — le plan de l'architecte à gauche, le rapport du
   bureau de contrôle à droite. C'est ce qu'on fait sur un chantier avec deux feuilles sur une
   table, et c'est ce qu'aucun écran ne permet aujourd'hui.

---

## 7. Ce qui reste ouvert

**Le mot du label.** `LOT` sur le contrôle technique et le SPS est un abus de langage assumé :
ce ne sont pas des lots du marché, mais des intervenants qui ont quelque chose à faire. La vue
les veut. Si l'usage montre qu'il faut les distinguer, un second label le fera — mais il faut
l'usage avant.

**Un point qui concerne deux lots.** « Contacter GILETTO pour dépose poutre étaiement » est
écrit sous le Lot 2, et engage les deux. Un sujet n'a qu'un père. Le second lien existe déjà —
`LIEN.LIE_A` — mais rien ne le pose aujourd'hui. À traiter quand le cas se présentera
vraiment : deux comptes rendus suffiront à le dire.

**La profondeur.** Deux niveaux, et pas trois. Un compte rendu range en deux niveaux ; en
autoriser un troisième ouvrirait une arborescence que personne n'a demandée, et qu'on ne
saurait plus afficher.
